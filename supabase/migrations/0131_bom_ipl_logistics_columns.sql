-- IPL logistics columns on engineering BOM (feeding, dimensions, rack, packing)
alter table bom_items add column if not exists part_length text;
alter table bom_items add column if not exists part_width text;
alter table bom_items add column if not exists part_height text;
alter table bom_items add column if not exists part_volume text;
alter table bom_items add column if not exists feeding_method text;
alter table bom_items add column if not exists packing text;
alter table bom_items add column if not exists part_direction text;
alter table bom_items add column if not exists rack_code text;
alter table bom_items add column if not exists rack_size text;

comment on column bom_items.part_length is 'Part length (IPL logistics)';
comment on column bom_items.part_width is 'Part width (IPL logistics)';
comment on column bom_items.part_height is 'Part height (IPL logistics)';
comment on column bom_items.part_volume is 'Part volume / size (IPL logistics)';
comment on column bom_items.feeding_method is 'Line feeding method';
comment on column bom_items.packing is 'Packing / packaging type';
comment on column bom_items.part_direction is 'Part side: R/L or يمين/شمال';
comment on column bom_items.rack_code is 'Rack identifier used for feeding';
comment on column bom_items.rack_size is 'Rack capacity / size';

-- Backfill from raw_data and legacy side column
update bom_items bi
set
  part_length = coalesce(
    nullif(trim(part_length), ''),
    nullif(trim(raw_data->>'length'), ''),
    nullif(trim(raw_data->>'طول'), ''),
    nullif(trim(raw_data->>'part_length'), ''),
    nullif(trim(raw_data->>'طول_الجزء'), ''),
    nullif(trim(raw_data->>'l'), '')
  ),
  part_width = coalesce(
    nullif(trim(part_width), ''),
    nullif(trim(raw_data->>'width'), ''),
    nullif(trim(raw_data->>'عرض'), ''),
    nullif(trim(raw_data->>'part_width'), ''),
    nullif(trim(raw_data->>'عرض_الجزء'), ''),
    nullif(trim(raw_data->>'w'), '')
  ),
  part_height = coalesce(
    nullif(trim(part_height), ''),
    nullif(trim(raw_data->>'height'), ''),
    nullif(trim(raw_data->>'ارتفاع'), ''),
    nullif(trim(raw_data->>'part_height'), ''),
    nullif(trim(raw_data->>'ارتفاع_الجزء'), ''),
    nullif(trim(raw_data->>'h'), '')
  ),
  part_volume = coalesce(
    nullif(trim(part_volume), ''),
    nullif(trim(raw_data->>'volume'), ''),
    nullif(trim(raw_data->>'حجم'), ''),
    nullif(trim(raw_data->>'حجم_الجزء'), ''),
    nullif(trim(raw_data->>'size'), ''),
    nullif(trim(raw_data->>'dimensions'), ''),
    nullif(trim(raw_data->>'أبعاد'), '')
  ),
  feeding_method = coalesce(
    nullif(trim(feeding_method), ''),
    nullif(trim(raw_data->>'feeding_method'), ''),
    nullif(trim(raw_data->>'feeding method'), ''),
    nullif(trim(raw_data->>'طريقة_التغذية'), ''),
    nullif(trim(raw_data->>'طريقة التغذية'), '')
  ),
  packing = coalesce(
    nullif(trim(packing), ''),
    nullif(trim(raw_data->>'packing'), ''),
    nullif(trim(raw_data->>'packaging'), ''),
    nullif(trim(raw_data->>'باكينج'), ''),
    nullif(trim(raw_data->>'التعبئة'), '')
  ),
  part_direction = coalesce(
    nullif(trim(part_direction), ''),
    nullif(trim(side), ''),
    nullif(trim(position), ''),
    nullif(trim(raw_data->>'direction'), ''),
    nullif(trim(raw_data->>'side'), ''),
    nullif(trim(raw_data->>'اتجاه'), ''),
    nullif(trim(raw_data->>'اتجاه_الجزء'), ''),
    nullif(trim(raw_data->>'rl'), '')
  ),
  rack_code = coalesce(
    nullif(trim(rack_code), ''),
    nullif(trim(raw_data->>'rack'), ''),
    nullif(trim(raw_data->>'rack_code'), ''),
    nullif(trim(raw_data->>'الراك'), ''),
    nullif(trim(raw_data->>'راك'), '')
  ),
  rack_size = coalesce(
    nullif(trim(rack_size), ''),
    nullif(trim(raw_data->>'rack_size'), ''),
    nullif(trim(raw_data->>'rack capacity'), ''),
    nullif(trim(raw_data->>'rack_capacity'), ''),
    nullif(trim(raw_data->>'حجم_الراك'), ''),
    nullif(trim(raw_data->>'حجم الراك'), ''),
    nullif(trim(raw_data->>'سعة_الراك'), '')
  )
where raw_data is not null or side is not null or position is not null;

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
