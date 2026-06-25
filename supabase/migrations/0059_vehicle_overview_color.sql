-- Enrich vehicle overview with color and ids for entry productivity editing.
-- Must DROP first: CREATE OR REPLACE cannot insert columns before existing ones.

drop view if exists public.v_vehicle_overview;

create view public.v_vehicle_overview as
select
  v.id,
  v.vin,
  v.model_id,
  v.vehicle_color_id,
  v.production_order_id,
  v.production_status,
  v.completion_status,
  v.qc_status,
  v.delivery_status,
  v.delivery_blocked,
  v.open_missing_count,
  v.completion_percent,
  vm.name              as model_name,
  vc.name              as color_name,
  vc.hex_code          as color_hex,
  po.order_number      as production_order_number,
  v.created_at,
  v.updated_at
from public.vehicles v
  left join public.vehicle_models vm on vm.id = v.model_id
  left join public.vehicle_colors vc on vc.id = v.vehicle_color_id
  left join public.production_orders po on po.id = v.production_order_id
where v.is_deleted = false;

grant select on public.v_vehicle_overview to authenticated;
