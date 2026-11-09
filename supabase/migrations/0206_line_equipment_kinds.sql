-- Catalog of factory tool kinds (rivet guns, torque wrenches, or any custom type).
-- Settings → العدة manages this list; assembly Equipment page tabs come from it.

create table if not exists public.line_equipment_kinds (
  code text primary key,
  label_ar text not null,
  label_en text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.line_equipment_kinds is
  'Master list of equipment kinds shown as tabs on the assembly Equipment page.';

insert into public.line_equipment_kinds (code, label_ar, label_en, sort_order, is_active)
values
  ('rivet_gun', 'مسدس برشام', 'Rivet gun', 10, true),
  ('torque_wrench', 'مفتاح عزم', 'Torque wrench', 20, true),
  ('other', 'أخرى', 'Other', 30, true)
on conflict (code) do nothing;

alter table public.line_equipment
  drop constraint if exists line_equipment_equipment_type_check;

alter table public.line_equipment
  drop constraint if exists line_equipment_type_check;

do $$
declare
  rec record;
begin
  for rec in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'line_equipment'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%equipment_type%'
  loop
    execute format('alter table public.line_equipment drop constraint if exists %I', rec.conname);
  end loop;
end $$;

alter table public.line_equipment
  alter column equipment_type type text;

grant select, insert, update, delete on public.line_equipment_kinds to authenticated;
grant all on public.line_equipment_kinds to service_role;

alter table public.line_equipment_kinds enable row level security;

drop policy if exists line_equipment_kinds_select on public.line_equipment_kinds;
create policy line_equipment_kinds_select
  on public.line_equipment_kinds for select to authenticated
  using (true);

drop policy if exists line_equipment_kinds_write on public.line_equipment_kinds;
create policy line_equipment_kinds_write
  on public.line_equipment_kinds for all to authenticated
  using (true)
  with check (true);

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values ('pages', 'production_settings__equipment', 'الإعدادات — العدة', 'Settings — tools')
on conflict (module_key, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_child.id, bool_or(rp.allowed)
from public.system_permissions sp_parent
join public.system_permissions sp_child
  on sp_child.module_key = 'pages'
 and sp_child.permission_key = 'production_settings__equipment'
join public.role_permissions rp on rp.permission_id = sp_parent.id
where sp_parent.module_key = 'pages'
  and sp_parent.permission_key = 'production_settings'
group by rp.role_id, sp_child.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;
