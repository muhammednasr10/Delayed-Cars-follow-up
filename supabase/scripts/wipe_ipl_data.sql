-- =============================================================================
-- wipe_ipl_data.sql
-- DESTRUCTIVE: clears all Engineering IPL / BOM data for a fresh start.
--
-- Removes: bom_items, parts, categories, import history, stopper rules,
--          operation↔part links, warehouse feeding plans/lines tied to parts,
--          and damaged-parts records (they reference IPL parts).
--
-- Keeps: vehicle_models, stations, vehicles, missing_parts, employees, etc.
-- Run once in Supabase SQL Editor (postgres / service role).
-- =============================================================================

begin;

-- Warehouse feeding (references parts)
delete from warehouse_feeding_plan_lines;
delete from warehouse_feeding_plans;
delete from warehouse_feeding_lines;
delete from warehouse_feeding;

-- Engineering IPL / BOM
delete from bom_stopper_exclusions;
delete from bom_import_errors;
delete from operation_parts;
delete from damaged_parts;
delete from bom_items;
delete from part_number_comparisons;
delete from parts;
delete from bom_import_batches;

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

commit;

-- Verify (optional):
-- select 'bom_items' as tbl, count(*) from bom_items
-- union all select 'parts', count(*) from parts;
