-- =============================================================================
-- 0014_auth_permissions_foundation.sql
-- System roles, granular permissions, employment status, profile blocking.
-- Additive. Keeps legacy profiles.role for transitional RLS fallback.
-- =============================================================================

-- Employment status (HR — separate from login block)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'employment_status') then
    create type employment_status as enum (
      'active', 'suspended', 'resigned', 'terminated', 'on_leave'
    );
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- system_roles
-- ---------------------------------------------------------------------------
create table if not exists system_roles (
  id            uuid primary key default gen_random_uuid(),
  role_code     text not null unique,
  role_name_ar  text not null,
  role_name_en  text,
  description   text,
  is_system     boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_system_roles_updated_at on system_roles;
create trigger trg_system_roles_updated_at
  before update on system_roles for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- system_permissions
-- ---------------------------------------------------------------------------
create table if not exists system_permissions (
  id                uuid primary key default gen_random_uuid(),
  module_key        text not null,
  permission_key    text not null,
  permission_name_ar text not null,
  permission_name_en text,
  description       text,
  is_active         boolean not null default true,
  constraint system_permissions_module_perm_key unique (module_key, permission_key)
);

-- ---------------------------------------------------------------------------
-- role_permissions
-- ---------------------------------------------------------------------------
create table if not exists role_permissions (
  id            uuid primary key default gen_random_uuid(),
  role_id       uuid not null references system_roles (id) on delete cascade,
  permission_id uuid not null references system_permissions (id) on delete cascade,
  allowed       boolean not null default true,
  constraint role_permissions_role_perm_key unique (role_id, permission_id)
);

create index if not exists idx_role_permissions_role on role_permissions (role_id);

-- ---------------------------------------------------------------------------
-- user_permission_overrides
-- ---------------------------------------------------------------------------
create table if not exists user_permission_overrides (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles (id) on delete cascade,
  permission_id uuid not null references system_permissions (id) on delete cascade,
  allowed       boolean not null,
  reason        text,
  created_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  constraint user_permission_overrides_user_perm_key unique (user_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- security_audit_events (admin actions — separate from table triggers audit_log)
-- ---------------------------------------------------------------------------
create table if not exists security_audit_events (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references profiles (id),
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  old_values    jsonb,
  new_values    jsonb,
  reason        text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_security_audit_created on security_audit_events (created_at desc);
create index if not exists idx_security_audit_entity on security_audit_events (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Seed system roles
-- ---------------------------------------------------------------------------
insert into system_roles (role_code, role_name_ar, role_name_en, is_system, description)
values
  ('super_admin', 'مدير النظام الأعلى', 'Super Admin', true, 'Full system access'),
  ('admin', 'مسؤول النظام', 'Administrator', true, 'Full operational access'),
  ('general_manager', 'مدير عام', 'General Manager', true, 'Executive view and approvals'),
  ('production_manager', 'مدير إنتاج', 'Production Manager', true, 'Production and manpower'),
  ('engineer', 'مهندس', 'Engineer', true, 'BOM, stations, operations'),
  ('supervisor', 'مشرف', 'Supervisor', true, 'Line supervision'),
  ('qc_user', 'جودة', 'QC User', true, 'Quality and inspections'),
  ('data_entry', 'إدخال بيانات', 'Data Entry', true, 'Create/update without delete'),
  ('viewer', 'عرض فقط', 'Viewer', true, 'Read-only access')
on conflict (role_code) do nothing;

-- ---------------------------------------------------------------------------
-- Seed permissions (modules × actions)
-- ---------------------------------------------------------------------------
insert into system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
select m.module_key, a.perm_key, a.name_ar, a.name_en
from (values
  ('dashboard'), ('users'), ('employees'), ('organizational_structure'),
  ('stations'), ('station_operations'), ('training_matrix'), ('bom'),
  ('missing_parts'), ('qc'), ('production'), ('inventory'), ('reports'), ('settings')
) as m(module_key)
cross join (values
  ('view', 'عرض', 'View'),
  ('create', 'إضافة', 'Create'),
  ('update', 'تعديل', 'Update'),
  ('delete', 'حذف', 'Delete'),
  ('approve', 'اعتماد', 'Approve'),
  ('export', 'تصدير', 'Export'),
  ('import', 'استيراد', 'Import'),
  ('print', 'طباعة', 'Print'),
  ('manage', 'إدارة', 'Manage'),
  ('assign', 'تعيين', 'Assign'),
  ('override', 'تجاوز', 'Override')
) as a(perm_key, name_ar, name_en)
on conflict (module_key, permission_key) do nothing;

-- ---------------------------------------------------------------------------
-- Helper: grant all permissions to a role
-- ---------------------------------------------------------------------------
create or replace function grant_all_permissions_to_role(p_role_code text)
returns void
language plpgsql
as $$
declare
  rid uuid;
begin
  select id into rid from system_roles where role_code = p_role_code;
  if rid is null then
    return;
  end if;
  insert into role_permissions (role_id, permission_id, allowed)
  select rid, sp.id, true from system_permissions sp where sp.is_active
  on conflict (role_id, permission_id) do update set allowed = true;
end;
$$;

-- Viewer: view only
insert into role_permissions (role_id, permission_id, allowed)
select sr.id, sp.id, sp.permission_key = 'view'
from system_roles sr
cross join system_permissions sp
where sr.role_code = 'viewer' and sp.is_active
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- Super admin + admin: all permissions
select grant_all_permissions_to_role('super_admin');
select grant_all_permissions_to_role('admin');

-- Engineer: BOM + stations + operations + training view/update + org view
insert into role_permissions (role_id, permission_id, allowed)
select sr.id, sp.id,
  case
    when sp.module_key in ('dashboard', 'organizational_structure', 'employees') and sp.permission_key = 'view' then true
    when sp.module_key = 'bom' and sp.permission_key in ('view', 'create', 'update', 'import', 'export') then true
    when sp.module_key in ('stations', 'station_operations') and sp.permission_key in ('view', 'update') then true
    when sp.module_key = 'training_matrix' and sp.permission_key in ('view', 'update') then true
    else false
  end
from system_roles sr
cross join system_permissions sp
where sr.role_code = 'engineer' and sp.is_active
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- Supervisor: missing parts, org view, stations view, manpower-style override on training view
insert into role_permissions (role_id, permission_id, allowed)
select sr.id, sp.id,
  case
    when sp.permission_key = 'view' and sp.module_key in ('dashboard', 'organizational_structure', 'employees', 'stations', 'station_operations', 'missing_parts', 'bom', 'training_matrix') then true
    when sp.module_key = 'missing_parts' and sp.permission_key in ('create', 'update') then true
    when sp.module_key = 'training_matrix' and sp.permission_key in ('view', 'update') then true
    else false
  end
from system_roles sr
cross join system_permissions sp
where sr.role_code = 'supervisor' and sp.is_active
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- QC user
insert into role_permissions (role_id, permission_id, allowed)
select sr.id, sp.id,
  case
    when sp.module_key in ('dashboard', 'qc', 'missing_parts') and sp.permission_key in ('view', 'approve', 'update') then true
    when sp.module_key = 'missing_parts' and sp.permission_key = 'view' then true
    else false
  end
from system_roles sr
cross join system_permissions sp
where sr.role_code = 'qc_user' and sp.is_active
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- Data entry: view + create + update (no delete/approve/manage on users/settings)
insert into role_permissions (role_id, permission_id, allowed)
select sr.id, sp.id,
  case
    when sp.permission_key in ('view', 'create', 'update') then true
    when sp.module_key in ('users', 'settings') then sp.permission_key = 'view'
    else false
  end
from system_roles sr
cross join system_permissions sp
where sr.role_code = 'data_entry' and sp.is_active
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- Production manager
insert into role_permissions (role_id, permission_id, allowed)
select sr.id, sp.id,
  case
    when sp.permission_key = 'view' then true
    when sp.module_key in ('stations', 'station_operations', 'missing_parts', 'production', 'organizational_structure') and sp.permission_key in ('create', 'update', 'approve') then true
    when sp.module_key = 'bom' and sp.permission_key in ('view', 'update') then true
    else false
  end
from system_roles sr
cross join system_permissions sp
where sr.role_code = 'production_manager' and sp.is_active
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- General manager: broad view + approve + reports
insert into role_permissions (role_id, permission_id, allowed)
select sr.id, sp.id,
  case
    when sp.permission_key in ('view', 'approve', 'export', 'print') then true
    when sp.permission_key in ('delete', 'manage', 'import') and sp.module_key in ('users', 'settings') then false
    else sp.permission_key not in ('delete', 'manage', 'import', 'override')
  end
from system_roles sr
cross join system_permissions sp
where sr.role_code = 'general_manager' and sp.is_active
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- ---------------------------------------------------------------------------
-- Extend profiles
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists employee_id uuid references employees (id) on delete set null;
alter table profiles add column if not exists system_role_id uuid references system_roles (id) on delete set null;
alter table profiles add column if not exists is_blocked boolean not null default false;
alter table profiles add column if not exists blocked_reason text;
alter table profiles add column if not exists blocked_at timestamptz;
alter table profiles add column if not exists blocked_by uuid references profiles (id) on delete set null;

create unique index if not exists idx_profiles_employee_active
  on profiles (employee_id)
  where employee_id is not null and is_active and not is_blocked;

create index if not exists idx_profiles_system_role on profiles (system_role_id);

-- Map legacy profiles.role -> system_role_id
update profiles p set system_role_id = sr.id
from system_roles sr
where p.system_role_id is null
  and (
    (p.role = 'admin' and sr.role_code = 'admin')
    or (p.role = 'production' and sr.role_code = 'production_manager')
    or (p.role = 'warehouse' and sr.role_code = 'data_entry')
    or (p.role = 'purchasing' and sr.role_code = 'data_entry')
    or (p.role = 'quality' and sr.role_code = 'qc_user')
    or (p.role = 'viewer' and sr.role_code = 'viewer')
  );

-- Promote earliest admin to super_admin
update profiles p set system_role_id = (select id from system_roles where role_code = 'super_admin')
where p.id = (
  select id from profiles where role = 'admin' order by created_at nulls last limit 1
);

-- Default any remaining null system_role to viewer
update profiles set system_role_id = (select id from system_roles where role_code = 'viewer')
where system_role_id is null;

-- ---------------------------------------------------------------------------
-- Extend employees
-- ---------------------------------------------------------------------------
alter table employees add column if not exists employment_status employment_status not null default 'active';
alter table employees add column if not exists stopped_reason text;
alter table employees add column if not exists stopped_at timestamptz;
alter table employees add column if not exists stopped_by uuid references profiles (id) on delete set null;

create index if not exists idx_employees_employment_status on employees (employment_status);

-- Sync profile_id on employees from profiles.employee_id
update employees e set profile_id = p.id
from profiles p
where p.employee_id = e.id and (e.profile_id is null or e.profile_id <> p.id);

-- ---------------------------------------------------------------------------
-- Bidirectional link sync trigger
-- ---------------------------------------------------------------------------
create or replace function sync_profile_employee_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'profiles' then
    if tg_op in ('INSERT', 'UPDATE') then
      if new.employee_id is not null then
        update employees set profile_id = new.id where id = new.employee_id and profile_id is distinct from new.id;
        update employees set profile_id = null where profile_id = new.id and id <> new.employee_id;
      elsif tg_op = 'UPDATE' and old.employee_id is not null and new.employee_id is null then
        update employees set profile_id = null where id = old.employee_id and profile_id = new.id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_employee on profiles;
create trigger trg_profiles_sync_employee
  after insert or update of employee_id on profiles
  for each row execute function sync_profile_employee_link();
