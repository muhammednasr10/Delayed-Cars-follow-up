-- Damaged parts log (production line).

create table if not exists public.damaged_parts (
  id                uuid primary key default gen_random_uuid(),
  vehicle_model_id  uuid not null references public.vehicle_models (id) on delete restrict,
  part_id           uuid not null references public.parts (id) on delete restrict,
  part_number       text not null,
  part_name         text,
  quantity          numeric(14, 3) not null default 1 check (quantity > 0),
  damage_reason     text not null
    check (damage_reason in ('production_mistake', 'handling', 'supplier_defect', 'storage', 'other')),
  final_decision    text not null default 'pending'
    check (final_decision in ('pending', 'scrap', 'rework', 'return_supplier', 'use_as_is')),
  notes             text,
  reported_at       date not null default current_date,
  created_by        uuid references auth.users (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_damaged_parts_model on public.damaged_parts (vehicle_model_id);
create index if not exists idx_damaged_parts_part on public.damaged_parts (part_id);
create index if not exists idx_damaged_parts_reported on public.damaged_parts (reported_at desc);

drop trigger if exists trg_damaged_parts_updated_at on public.damaged_parts;
create trigger trg_damaged_parts_updated_at
  before update on public.damaged_parts
  for each row execute function set_updated_at();

drop trigger if exists trg_damaged_parts_created_by on public.damaged_parts;
create trigger trg_damaged_parts_created_by
  before insert on public.damaged_parts
  for each row execute function set_created_by();

alter table public.damaged_parts enable row level security;

drop policy if exists damaged_parts_select on public.damaged_parts;
create policy damaged_parts_select on public.damaged_parts
  for select to authenticated using (true);

drop policy if exists damaged_parts_write on public.damaged_parts;
create policy damaged_parts_write on public.damaged_parts
  for all to authenticated
  using (has_role('admin', 'production', 'warehouse'))
  with check (has_role('admin', 'production', 'warehouse'));

grant select, insert, update, delete on public.damaged_parts to authenticated;
