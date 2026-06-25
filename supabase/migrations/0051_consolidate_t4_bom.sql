-- =============================================================================
-- 0051_consolidate_t4_bom.sql
-- Consolidate per-variant T4 BOM rows into one row per part (+ station).
-- - Delete synthetic "T4" rows (parent family only).
-- - Merge T4T / T4L / T4C rows that share the same part into a single row.
-- - Recompute classification from shared part number (Common / T / T&L / L&C …).
-- Idempotent-ish: safe to re-run; operates only on T4 family rows.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Remove synthetic combined "T4" rows.
-- ---------------------------------------------------------------------------
delete from bom_items bi
using vehicle_models vm
where bi.vehicle_model_id = vm.id
  and upper(trim(vm.name)) = 'T4';

-- ---------------------------------------------------------------------------
-- 2) Pick one keeper row per (part_id, station) among T4T/T4L/T4C rows.
-- ---------------------------------------------------------------------------
create temporary table _t4_keepers on commit drop as
select distinct on (bi.part_id, coalesce(bi.station_code_text, ''))
  bi.id as keeper_id
from bom_items bi
join vehicle_models vm on vm.id = bi.vehicle_model_id
where bi.is_active
  and upper(trim(vm.name)) in ('T4T', 'T4L', 'T4C')
order by bi.part_id, coalesce(bi.station_code_text, ''), bi.created_at, bi.id;

-- ---------------------------------------------------------------------------
-- 3) Delete the non-keeper variant rows.
-- ---------------------------------------------------------------------------
delete from bom_items bi
using vehicle_models vm
where bi.vehicle_model_id = vm.id
  and upper(trim(vm.name)) in ('T4T', 'T4L', 'T4C')
  and bi.id not in (select keeper_id from _t4_keepers);

-- ---------------------------------------------------------------------------
-- 4) Recompute keeper rows: variants, classification, applicable models,
--    quantity and line key from qty_by_model_raw (e.g. "T4T=2; T4L=0; T4C=0").
-- ---------------------------------------------------------------------------
update bom_items bi
set
  vehicle_model_id = null,
  model_family = 'T4',
  quantity = greatest(calc.t_qty, calc.l_qty, calc.c_qty, 0.001),
  qty_by_model_raw = 'T4T=' || calc.t_qty || '; T4L=' || calc.l_qty || '; T4C=' || calc.c_qty,
  applicable_models_text = nullif(
    trim(both ', ' from
      (case when calc.t_qty > 0 then 'T4T, ' else '' end) ||
      (case when calc.l_qty > 0 then 'T4L, ' else '' end) ||
      (case when calc.c_qty > 0 then 'T4C, ' else '' end)
    ), ''),
  bom_classification = case
    when calc.t_qty > 0 and calc.l_qty > 0 and calc.c_qty > 0 then 'Common'
    else nullif(
      trim(both '&' from
        (case when calc.t_qty > 0 then 'T&' else '' end) ||
        (case when calc.l_qty > 0 then 'L&' else '' end) ||
        (case when calc.c_qty > 0 then 'C&' else '' end)
      ), '')
  end,
  import_line_key = calc.normalized || '|' || coalesce(nullif(bi.station_code_text, ''), '_') || '|_'
from (
  select
    k.keeper_id,
    p.normalized_part_number as normalized,
    coalesce(nullif(substring(b.qty_by_model_raw from 'T4T=([0-9.]+)'), '')::numeric, 0) as t_qty,
    coalesce(nullif(substring(b.qty_by_model_raw from 'T4L=([0-9.]+)'), '')::numeric, 0) as l_qty,
    coalesce(nullif(substring(b.qty_by_model_raw from 'T4C=([0-9.]+)'), '')::numeric, 0) as c_qty
  from _t4_keepers k
  join bom_items b on b.id = k.keeper_id
  join parts p on p.id = b.part_id
) calc
where bi.id = calc.keeper_id;
