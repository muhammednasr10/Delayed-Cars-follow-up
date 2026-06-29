-- SOP: station & operation instructions per worker line (scoped by model family from line balancing).

create table if not exists public.sop_worker_instructions (
  id                   uuid primary key default gen_random_uuid(),
  worker_station_id    uuid not null references public.stations (id) on delete cascade,
  model_family_id      uuid not null references public.vehicle_models (id) on delete cascade,
  station_instructions text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint uq_sop_worker_family unique (worker_station_id, model_family_id)
);

create table if not exists public.sop_operation_instructions (
  id            uuid primary key default gen_random_uuid(),
  operation_id  uuid not null references public.station_operations (id) on delete cascade,
  instructions  text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint uq_sop_operation unique (operation_id)
);

create index if not exists idx_sop_worker_family on public.sop_worker_instructions (model_family_id);
create index if not exists idx_sop_operation on public.sop_operation_instructions (operation_id);

drop trigger if exists trg_sop_worker_instructions_updated_at on public.sop_worker_instructions;
create trigger trg_sop_worker_instructions_updated_at
  before update on public.sop_worker_instructions
  for each row execute function set_updated_at();

drop trigger if exists trg_sop_operation_instructions_updated_at on public.sop_operation_instructions;
create trigger trg_sop_operation_instructions_updated_at
  before update on public.sop_operation_instructions
  for each row execute function set_updated_at();

alter table public.sop_worker_instructions enable row level security;
alter table public.sop_operation_instructions enable row level security;

drop policy if exists sop_worker_select on public.sop_worker_instructions;
create policy sop_worker_select on public.sop_worker_instructions
  for select to authenticated using (true);

drop policy if exists sop_worker_write on public.sop_worker_instructions;
create policy sop_worker_write on public.sop_worker_instructions
  for all to authenticated
  using (
    has_role('admin')
    or has_permission('station_operations', 'update')
    or has_permission('station_operations', 'manage')
    or has_permission('station_operations', 'create')
  )
  with check (
    has_role('admin')
    or has_permission('station_operations', 'update')
    or has_permission('station_operations', 'manage')
    or has_permission('station_operations', 'create')
  );

drop policy if exists sop_operation_select on public.sop_operation_instructions;
create policy sop_operation_select on public.sop_operation_instructions
  for select to authenticated using (true);

drop policy if exists sop_operation_write on public.sop_operation_instructions;
create policy sop_operation_write on public.sop_operation_instructions
  for all to authenticated
  using (
    has_role('admin')
    or has_permission('station_operations', 'update')
    or has_permission('station_operations', 'manage')
    or has_permission('station_operations', 'create')
  )
  with check (
    has_role('admin')
    or has_permission('station_operations', 'update')
    or has_permission('station_operations', 'manage')
    or has_permission('station_operations', 'create')
  );

grant select, insert, update, delete on public.sop_worker_instructions to authenticated;
grant select, insert, update, delete on public.sop_operation_instructions to authenticated;

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values ('pages', 'engineering_sop', 'SOP — تعليمات التشغيل', 'SOP — work instructions')
on conflict (module_key, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_sop.id, bool_or(rp.allowed)
from public.role_permissions rp
join public.system_permissions sp_mod on sp_mod.id = rp.permission_id
join public.system_permissions sp_sop on sp_sop.module_key = 'pages' and sp_sop.permission_key = 'engineering_sop'
where sp_mod.module_key = 'station_operations' and sp_mod.permission_key = 'view'
group by rp.role_id, sp_sop.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
