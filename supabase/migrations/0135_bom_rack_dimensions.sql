-- Rack L/W/H in cm on BOM IPL logistics (rack_size = computed m³)
alter table bom_items add column if not exists rack_length text;
alter table bom_items add column if not exists rack_width text;
alter table bom_items add column if not exists rack_height text;

comment on column bom_items.rack_length is 'Rack length cm (IPL feeding card)';
comment on column bom_items.rack_width is 'Rack width cm (IPL feeding card)';
comment on column bom_items.rack_height is 'Rack height cm (IPL feeding card)';

drop view if exists v_bom_items_detail;

create view v_bom_items_detail as
select
  bi.id,
  bi.part_id,
  bi.vehicle_model_id,
  bi.station_id,
  bi.part_number,
  bi.part_name,
  bi.quantity,
  bi.side,
  bi.position,
  bi.model_family,
  bi.applicable_models_text,
  bi.station_code_text,
  bi.station_category,
  bi.bom_classification,
  bi.qty_by_model_raw,
  bi.source_file,
  bi.source_sheet,
  bi.source_row_number,
  bi.import_line_key,
  bi.needs_review,
  bi.notes,
  bi.raw_data,
  bi.is_active,
  bi.created_at,
  bi.part_length,
  bi.part_width,
  bi.part_height,
  bi.part_volume,
  bi.feeding_method,
  bi.packing,
  bi.part_direction,
  bi.rack_code,
  bi.rack_size,
  bi.rack_length,
  bi.rack_width,
  bi.rack_height,
  p.normalized_part_number,
  p.part_name_ar,
  p.part_name_en,
  p.part_type,
  p.part_number_new,
  p.alternative_part_no,
  pc.category_code,
  pc.category_name_ar,
  pc.category_name_en,
  vm.name as vehicle_model_name,
  st.station_number,
  st.station_name,
  bi.operation_id,
  bi.is_critical,
  bi.stopper_type,
  bi.supply_source,
  so.operation_code,
  so.operation_name_ar as operation_name,
  coalesce(so.is_line_stopper, false) as operation_is_line_stopper,
  coalesce(so.is_car_stopper, false) as operation_is_car_stopper,
  so.zoning_constraints as operation_zoning_constraints,
  coalesce(st.sort_order, 0) as station_sort_order
from bom_items bi
join parts p on p.id = bi.part_id
left join part_categories pc on pc.id = p.category_id
left join vehicle_models vm on vm.id = bi.vehicle_model_id
left join stations st on st.id = bi.station_id
left join station_operations so on so.id = bi.operation_id;

grant select on v_bom_items_detail to authenticated;
