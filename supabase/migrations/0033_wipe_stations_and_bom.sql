-- =============================================================================
-- 0033_wipe_stations_and_bom.sql
-- DESTRUCTIVE: clears engineering BOM + all stations for a fresh import.
-- Keeps: vehicle_models, work_areas, vehicle_colors, vehicles, missing_parts,
--        employees (station links cleared), training skills (station cleared).
-- Run once in Supabase SQL Editor as postgres / service role.
-- =============================================================================

begin;

-- Unlink stations from operational data (vehicles FK has no ON DELETE)
update vehicles set current_station_id = null where current_station_id is not null;
update employees set station_id = null where station_id is not null;
update training_skills set station_id = null where station_id is not null;

-- Engineering BOM
delete from bom_import_errors;
delete from bom_import_batches;
delete from bom_items;
delete from part_number_comparisons;
delete from parts;

delete from part_categories where parent_id is not null;
delete from part_categories;

insert into part_categories (category_code, category_name_ar, category_name_en, description)
values
  ('UNCATEGORIZED', 'غير مصنف', 'Uncategorized', 'Parts without a BOM classification'),
  ('COMMON_IN_FAMILY', 'مشترك داخل عائلة الموديل', 'Common Within Model Family', 'Shared inside the same model family'),
  ('SHARED_CROSS_FAMILY', 'مشترك بين عائلات الموديل', 'Shared Across Model Families', 'Same part across families'),
  ('VARIANT_SPECIFIC', 'خاص بمتغير', 'Variant-Specific Part', 'Specific vehicle variant only'),
  ('HARDWARE_FASTENER', 'عدد / مسمار', 'Hardware / Fastener', 'Hardware or fastener'),
  ('NEEDS_REVIEW', 'يحتاج مراجعة', 'Needs Review', 'Incomplete or unclear mapping')
on conflict (category_code) do nothing;

-- Stations (cascades: station_operations, station_required_skills, vehicle_model_operations, …)
update stations set parent_station_id = null where parent_station_id is not null;
delete from stations;

commit;
