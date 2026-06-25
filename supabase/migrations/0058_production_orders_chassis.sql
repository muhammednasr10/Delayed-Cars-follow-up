-- Production orders: chassis range fields for planning

alter table public.production_orders
  add column if not exists chassis_start text,
  add column if not exists chassis_end text;

create or replace view public.v_production_orders_detail as
select
  po.id,
  po.order_number,
  po.model_id,
  po.planned_qty,
  po.status,
  po.chassis_start,
  po.chassis_end,
  po.planned_start,
  po.planned_end,
  po.notes,
  po.created_at,
  po.updated_at,
  vm.name as model_name,
  coalesce(pf.name, vm.name) as family_name
from public.production_orders po
left join public.vehicle_models vm on vm.id = po.model_id
left join public.vehicle_models pf on pf.id = vm.parent_model_id;

grant select on public.v_production_orders_detail to authenticated;
