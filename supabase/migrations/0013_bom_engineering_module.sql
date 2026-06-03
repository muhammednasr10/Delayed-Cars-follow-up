-- =============================================================================
-- 0013_bom_engineering_module.sql
-- Engineering BOM (parts × stations × models) — separate from inventory bom_lines.
-- Additive. Target: Supabase / PostgreSQL 15+.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- part_categories
-- ---------------------------------------------------------------------------
create table if not exists part_categories (
  id              uuid primary key default gen_random_uuid(),
  category_code   text not null unique,
  category_name_ar text not null,
  category_name_en text,
  parent_id       uuid references part_categories (id) on delete set null,
  description     text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_part_categories_updated_at on part_categories;
create trigger trg_part_categories_updated_at
  before update on part_categories
  for each row execute function set_updated_at();

create index if not exists idx_part_categories_code on part_categories (category_code);

insert into part_categories (category_code, category_name_ar, category_name_en, description)
values
  ('UNCATEGORIZED', 'غير مصنف', 'Uncategorized', 'Parts without a BOM classification'),
  ('COMMON_IN_FAMILY', 'مشترك داخل عائلة الموديل', 'Common Within Model Family', 'Shared inside the same model family'),
  ('SHARED_CROSS_FAMILY', 'مشترك بين عائلات الموديل', 'Shared Across Model Families', 'Same part across families'),
  ('VARIANT_SPECIFIC', 'خاص بمتغير', 'Variant-Specific Part', 'Specific vehicle variant only'),
  ('HARDWARE_FASTENER', 'عدد / مسمار', 'Hardware / Fastener', 'Hardware or fastener'),
  ('NEEDS_REVIEW', 'يحتاج مراجعة', 'Needs Review', 'Incomplete or unclear mapping')
on conflict (category_code) do nothing;

-- ---------------------------------------------------------------------------
-- parts (engineering part master)
-- ---------------------------------------------------------------------------
create table if not exists parts (
  id                    uuid primary key default gen_random_uuid(),
  part_number           text not null,
  normalized_part_number text not null,
  part_name_ar          text,
  part_name_en          text,
  category_id           uuid references part_categories (id) on delete set null,
  part_type             text,
  unit                  text default 'pcs',
  part_number_new       text,
  alternative_part_no   text,
  notes                 text,
  item_id               uuid references items (id) on delete set null,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint parts_normalized_key unique (normalized_part_number)
);

drop trigger if exists trg_parts_updated_at on parts;
create trigger trg_parts_updated_at
  before update on parts
  for each row execute function set_updated_at();

create index if not exists idx_parts_normalized on parts (normalized_part_number);
create index if not exists idx_parts_number on parts (part_number);
create index if not exists idx_parts_category on parts (category_id);

-- ---------------------------------------------------------------------------
-- bom_items (engineering BOM lines)
-- ---------------------------------------------------------------------------
create table if not exists bom_items (
  id                    uuid primary key default gen_random_uuid(),
  vehicle_model_id      uuid references vehicle_models (id) on delete set null,
  station_id            uuid references stations (id) on delete set null,
  operation_id          uuid references station_operations (id) on delete set null,
  part_id               uuid not null references parts (id) on delete cascade,
  part_number           text not null,
  part_name             text,
  quantity              numeric(14,3) not null default 1 check (quantity > 0),
  side                  text,
  position              text,
  model_family          text,
  applicable_models_text text,
  station_code_text     text,
  station_category      text,
  bom_classification    text,
  qty_by_model_raw      text,
  source_file           text,
  source_sheet          text,
  source_row_number     int,
  import_line_key       text,
  needs_review          boolean not null default false,
  notes                 text,
  raw_data              jsonb,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint bom_items_import_line_key unique (import_line_key)
);

drop trigger if exists trg_bom_items_updated_at on bom_items;
create trigger trg_bom_items_updated_at
  before update on bom_items
  for each row execute function set_updated_at();

create index if not exists idx_bom_items_part on bom_items (part_id);
create index if not exists idx_bom_items_station on bom_items (station_id);
create index if not exists idx_bom_items_model on bom_items (vehicle_model_id);
create index if not exists idx_bom_items_source on bom_items (source_file);
create index if not exists idx_bom_items_classification on bom_items (bom_classification);
create index if not exists idx_bom_items_review on bom_items (needs_review) where needs_review = true;

-- ---------------------------------------------------------------------------
-- part_number_comparisons
-- ---------------------------------------------------------------------------
create table if not exists part_number_comparisons (
  id                    uuid primary key default gen_random_uuid(),
  part_number           text not null,
  normalized_part_number text not null unique,
  occurrence_count      int not null default 1,
  station_count         int not null default 0,
  model_count           int not null default 0,
  first_station         text,
  stations              text,
  model_families        text,
  models                text,
  comparison_status     text,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists trg_part_number_comparisons_updated_at on part_number_comparisons;
create trigger trg_part_number_comparisons_updated_at
  before update on part_number_comparisons
  for each row execute function set_updated_at();

create index if not exists idx_pnc_normalized on part_number_comparisons (normalized_part_number);
create index if not exists idx_pnc_status on part_number_comparisons (comparison_status);

-- ---------------------------------------------------------------------------
-- bom_import_batches + errors
-- ---------------------------------------------------------------------------
create table if not exists bom_import_batches (
  id                    uuid primary key default gen_random_uuid(),
  file_name             text not null,
  sheet_name            text,
  imported_by           uuid references profiles (id),
  imported_at           timestamptz not null default now(),
  total_rows            int not null default 0,
  created_parts         int not null default 0,
  updated_parts         int not null default 0,
  created_bom_items     int not null default 0,
  updated_bom_items     int not null default 0,
  duplicate_part_numbers int not null default 0,
  errors_count          int not null default 0,
  status                text not null default 'completed',
  notes                 text
);

create table if not exists bom_import_errors (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references bom_import_batches (id) on delete cascade,
  row_number    int,
  error_message text not null,
  raw_data      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_bom_import_errors_batch on bom_import_errors (batch_id);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
create or replace view v_bom_items_detail as
select
  bi.id,
  bi.part_id,
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
  bi.source_file,
  bi.source_sheet,
  bi.source_row_number,
  bi.needs_review,
  bi.notes,
  bi.is_active,
  bi.created_at,
  p.normalized_part_number,
  p.part_name_ar,
  p.part_name_en,
  p.part_type,
  pc.category_code,
  pc.category_name_ar,
  pc.category_name_en,
  vm.name as vehicle_model_name,
  st.station_number,
  st.station_name
from bom_items bi
join parts p on p.id = bi.part_id
left join part_categories pc on pc.id = p.category_id
left join vehicle_models vm on vm.id = bi.vehicle_model_id
left join stations st on st.id = bi.station_id
where bi.is_active = true;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table part_categories enable row level security;
alter table parts enable row level security;
alter table bom_items enable row level security;
alter table part_number_comparisons enable row level security;
alter table bom_import_batches enable row level security;
alter table bom_import_errors enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'part_categories', 'parts', 'bom_items', 'part_number_comparisons',
    'bom_import_batches', 'bom_import_errors'
  ]
  loop
    execute format('drop policy if exists %1$s_select on %1$s;', tbl);
    execute format('create policy %1$s_select on %1$s for select to authenticated using (true);', tbl);
    execute format('drop policy if exists %1$s_write on %1$s;', tbl);
    execute format(
      'create policy %1$s_write on %1$s for all to authenticated using (has_role(''admin'')) with check (has_role(''admin''));',
      tbl, tbl
    );
  end loop;
end$$;
