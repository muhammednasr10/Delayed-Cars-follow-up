-- =============================================================================
-- 0048_fix_bom_view_columns.sql
-- Fix 42P16 if 0047 failed at v_bom_items_detail (column order change).
-- Safe to run after partial 0047 — only recreates views.
-- =============================================================================

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
  so.operation_code,
  so.operation_name_ar as operation_name
from bom_items bi
join parts p on p.id = bi.part_id
left join part_categories pc on pc.id = p.category_id
left join vehicle_models vm on vm.id = bi.vehicle_model_id
left join stations st on st.id = bi.station_id
left join station_operations so on so.id = bi.operation_id
where bi.is_active = true;

drop view if exists v_engineering_dashboard;

create view v_engineering_dashboard as
select
  (select count(*)::int from bom_items where is_active) as bom_rows_total,
  (select count(distinct part_id)::int from bom_items where is_active) as bom_unique_parts,
  (select count(*)::int from station_operations where is_active) as operations_total,
  (select count(*)::int from operation_parts where is_active) as operation_parts_total,
  (select count(*)::int from station_operations so where so.is_active
     and not exists (select 1 from operation_parts op where op.operation_id = so.id and op.is_active)
  ) as operations_without_parts,
  (select count(*)::int from time_studies where status = 'approved') as time_studies_approved,
  (select count(*)::int from time_studies where status = 'draft') as time_studies_draft,
  (select count(*)::int from station_operations so where so.is_active
     and so.standard_time_seconds is null
  ) as operations_without_standard_time;

insert into system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
select 'station_operations', 'approve', 'اعتماد دراسة الوقت', 'Approve time study'
where not exists (
  select 1 from system_permissions
  where module_key = 'station_operations' and permission_key = 'approve'
);
