-- =============================================================================
-- 0003_reporting_views.sql
-- Read-only views backing the dashboard and reports. Views inherit RLS from
-- their base tables, so any authenticated user can read aggregates.
-- =============================================================================

-- Vehicles enriched for the main list (model name, PO number, counts, %).
create or replace view v_vehicle_overview as
select
  v.id,
  v.vin,
  v.production_status,
  v.completion_status,
  v.qc_status,
  v.delivery_status,
  v.delivery_blocked,
  v.open_missing_count,
  v.completion_percent,
  vm.name              as model_name,
  po.order_number      as production_order_number,
  v.created_at,
  v.updated_at
from vehicles v
  left join vehicle_models vm on vm.id = v.model_id
  left join production_orders po on po.id = v.production_order_id
where v.is_deleted = false;

-- Headline KPI counters.
create or replace view v_dashboard_counts as
select
  (select count(*) from vehicles where is_deleted = false) as total_vehicles,
  (select count(*) from vehicles where is_deleted = false and open_missing_count > 0) as vehicles_with_missing,
  (select count(*) from vehicles where is_deleted = false and delivery_blocked) as vehicles_blocked,
  (select count(*) from vehicles where is_deleted = false and qc_status = 'failed') as vehicles_qc_failed,
  (select count(*) from missing_parts where status not in ('closed','cancelled')) as open_missing_parts,
  (select count(*) from missing_parts where status not in ('closed','cancelled') and priority = 'critical') as critical_open_parts;

-- Missing parts by responsible department.
create or replace view v_missing_by_department as
select department,
       count(*) as total,
       count(*) filter (where status not in ('closed','cancelled')) as open_count
from missing_parts
group by department;

-- Missing parts by supplier (via linked item).
create or replace view v_missing_by_supplier as
select coalesce(i.supplier, 'Unknown') as supplier,
       count(*) as total,
       count(*) filter (where mp.status not in ('closed','cancelled')) as open_count
from missing_parts mp
  left join items i on i.id = mp.item_id
group by coalesce(i.supplier, 'Unknown');

-- Missing parts by priority.
create or replace view v_missing_by_priority as
select priority,
       count(*) as total,
       count(*) filter (where status not in ('closed','cancelled')) as open_count
from missing_parts
group by priority;

-- Aging report for open missing parts (hours/days open).
create or replace view v_missing_aging as
select mp.id,
       mp.vehicle_id,
       v.vin,
       mp.part_description,
       mp.priority,
       mp.department,
       mp.status,
       mp.created_at,
       round(extract(epoch from (now() - mp.created_at)) / 3600, 1) as hours_open,
       case
         when extract(epoch from (now() - mp.created_at)) / 3600 < 24 then '0-1d'
         when extract(epoch from (now() - mp.created_at)) / 3600 < 72 then '1-3d'
         when extract(epoch from (now() - mp.created_at)) / 3600 < 168 then '3-7d'
         else '7d+'
       end as age_bucket
from missing_parts mp
  join vehicles v on v.id = mp.vehicle_id
where mp.status not in ('closed','cancelled');

-- Average resolution time per closed missing part (hours).
create or replace view v_missing_avg_delay as
select
  round(avg(extract(epoch from (closed_at - created_at)) / 3600), 1) as avg_hours_to_close,
  count(*) as closed_count
from missing_parts
where status = 'closed' and closed_at is not null;

-- Vehicles waiting on at least one critical part.
create or replace view v_vehicles_waiting_critical as
select distinct v.id, v.vin, vm.name as model_name, v.delivery_status
from vehicles v
  join missing_parts mp on mp.vehicle_id = v.id
  left join vehicle_models vm on vm.id = v.model_id
where v.is_deleted = false
  and mp.priority = 'critical'
  and mp.status not in ('closed','cancelled');

-- Parts most frequently missing.
create or replace view v_top_missing_items as
select coalesce(i.name, mp.part_description) as item_name,
       i.sku,
       count(*) as occurrences,
       count(*) filter (where mp.status not in ('closed','cancelled')) as open_occurrences
from missing_parts mp
  left join items i on i.id = mp.item_id
group by coalesce(i.name, mp.part_description), i.sku
order by occurrences desc;

-- Production orders affected by shortages.
create or replace view v_orders_affected_by_shortage as
select po.id, po.order_number, po.status,
       count(distinct v.id) as vehicles_affected,
       count(mp.id) filter (where mp.status not in ('closed','cancelled')) as open_parts
from production_orders po
  join vehicles v on v.production_order_id = po.id and v.is_deleted = false
  join missing_parts mp on mp.vehicle_id = v.id
group by po.id, po.order_number, po.status
having count(mp.id) filter (where mp.status not in ('closed','cancelled')) > 0;

-- Warehouse shortage report: items below total BOM-driven demand.
create or replace view v_warehouse_shortage as
select i.id as item_id, i.sku, i.name,
       w.code as warehouse_code,
       s.qty_on_hand,
       s.qty_reserved,
       (s.qty_on_hand - s.qty_reserved) as available
from inventory_stock s
  join items i on i.id = s.item_id
  join warehouses w on w.id = s.warehouse_id
where (s.qty_on_hand - s.qty_reserved) <= 0;

-- QC-rejected installed parts report.
create or replace view v_qc_rejected_parts as
select q.id as inspection_id,
       q.vehicle_id,
       v.vin,
       q.missing_part_id,
       mp.part_description,
       q.inspected_at,
       q.notes
from qc_inspections q
  join vehicles v on v.id = q.vehicle_id
  left join missing_parts mp on mp.id = q.missing_part_id
where q.result = 'fail';
