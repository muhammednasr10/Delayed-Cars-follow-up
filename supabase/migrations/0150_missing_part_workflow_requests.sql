-- Pending transfer (to quality station) and restore-from-archive requests, reviewed by engineer/admin.

alter table public.vehicles
  add column if not exists shortage_resolved_by uuid references auth.users (id);

alter table public.missing_parts
  add column if not exists transferred_at timestamptz;

create table if not exists public.missing_part_workflow_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('transfer', 'restore')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  missing_part_id uuid references public.missing_parts (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  from_station_id uuid references public.stations (id) on delete set null,
  to_station_id uuid references public.stations (id) on delete set null,
  requested_by uuid references auth.users (id),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  review_note text,
  constraint mp_wf_transfer_needs_part check (kind <> 'transfer' or missing_part_id is not null),
  constraint mp_wf_transfer_needs_dest check (kind <> 'transfer' or to_station_id is not null)
);

create unique index if not exists uq_mp_wf_pending_transfer
  on public.missing_part_workflow_requests (missing_part_id)
  where kind = 'transfer' and status = 'pending' and missing_part_id is not null;

create unique index if not exists uq_mp_wf_pending_restore
  on public.missing_part_workflow_requests (vehicle_id)
  where kind = 'restore' and status = 'pending';

create index if not exists idx_mp_wf_pending
  on public.missing_part_workflow_requests (status, requested_at desc)
  where status = 'pending';

comment on table public.missing_part_workflow_requests is
  'Pending transfer-to-quality and restore-from-archive requests awaiting engineer/admin review.';

alter table public.missing_part_workflow_requests enable row level security;

grant select on public.missing_part_workflow_requests to authenticated;

create or replace function is_quality_transfer_station(p_station_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stations s
    where s.id = p_station_id
      and s.is_active = true
      and s.station_type = 'quality'
  );
$$;

create or replace function can_review_missing_part_workflow()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    has_role('admin')
    or has_permission('users', 'manage')
    or has_permission('missing_parts', 'approve')
    or exists (
      select 1
      from public.profiles p
      join public.system_roles sr on sr.id = p.system_role_id
      where p.id = auth.uid()
        and sr.role_code in ('super_admin', 'admin', 'engineer')
    );
$$;

create or replace function apply_approved_missing_part_transfer(
  p_missing_part_id uuid,
  p_to_station_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mp missing_parts%rowtype;
  v_open int;
  v_archived boolean := false;
begin
  select * into mp from missing_parts where id = p_missing_part_id for update;
  if not found then
    raise exception 'Missing part not found';
  end if;

  if mp.status in ('closed'::missing_part_status, 'cancelled'::missing_part_status) then
    raise exception 'Issue is already closed';
  end if;

  update vehicles
  set current_station_id = p_to_station_id
  where id = mp.vehicle_id
    and is_deleted = false;

  update missing_parts
  set qc_approved    = true,
      status         = 'closed'::missing_part_status,
      closed_at      = coalesce(closed_at, now()),
      transferred_at = coalesce(transferred_at, now())
  where id = p_missing_part_id;

  select count(*)::int into v_open
  from missing_parts
  where vehicle_id = mp.vehicle_id
    and status not in ('closed'::missing_part_status, 'cancelled'::missing_part_status);

  if v_open = 0 then
    update vehicles
    set shortage_resolved_at = coalesce(shortage_resolved_at, now()),
        shortage_resolved_by = coalesce(shortage_resolved_by, auth.uid()),
        completion_status    = 'complete'::vehicle_completion_status,
        final_approved_at    = coalesce(final_approved_at, now()),
        final_approved_by    = coalesce(final_approved_by, auth.uid())
    where id = mp.vehicle_id
      and is_deleted = false;
    v_archived := true;
    perform recalc_vehicle_status(mp.vehicle_id);
  else
    perform recalc_vehicle_status(mp.vehicle_id);
  end if;

  return jsonb_build_object(
    'missing_part_id', p_missing_part_id,
    'vehicle_id', mp.vehicle_id,
    'vehicle_archived', v_archived
  );
end;
$$;

create or replace function apply_approved_vehicle_shortage_restore(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v vehicles%rowtype;
begin
  select * into v from vehicles where id = p_vehicle_id and not is_deleted for update;
  if not found then
    raise exception 'Vehicle not found';
  end if;

  if v.shortage_resolved_at is null then
    raise exception 'Vehicle is not archived';
  end if;

  update vehicles
  set shortage_resolved_at = null,
      shortage_resolved_by = null,
      completion_status    = 'incomplete'::vehicle_completion_status
  where id = p_vehicle_id;

  update missing_parts
  set qc_approved    = false,
      closed_at      = null,
      transferred_at = null,
      status         = case
        when installed_qty >= required_qty then 'qc_pending'::missing_part_status
        when installed_qty > 0 then 'installed'::missing_part_status
        else 'open'::missing_part_status
      end
  where vehicle_id = p_vehicle_id
    and status = 'closed'::missing_part_status;

  perform recalc_vehicle_status(p_vehicle_id);
end;
$$;

create or replace function request_missing_part_transfer(
  p_missing_part_id uuid,
  p_to_station_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  mp missing_parts%rowtype;
  v vehicles%rowtype;
  rid uuid;
begin
  if not can_manage_missing_parts(true) then
    raise exception 'Permission denied';
  end if;

  if p_to_station_id is null or not is_quality_transfer_station(p_to_station_id) then
    raise exception 'Destination must be an active quality station (e.g. QP3)';
  end if;

  select * into mp from missing_parts where id = p_missing_part_id for update;
  if not found then
    raise exception 'Missing part not found';
  end if;

  if mp.status in ('closed'::missing_part_status, 'cancelled'::missing_part_status) then
    raise exception 'Issue is already closed';
  end if;

  select * into v from vehicles where id = mp.vehicle_id and not is_deleted;
  if not found then
    raise exception 'Vehicle not found';
  end if;

  if v.shortage_resolved_at is not null then
    raise exception 'Vehicle is already archived';
  end if;

  if exists (
    select 1 from missing_part_workflow_requests
    where missing_part_id = p_missing_part_id
      and kind = 'transfer'
      and status = 'pending'
  ) then
    raise exception 'A pending transfer request already exists for this issue';
  end if;

  insert into missing_part_workflow_requests (
    kind, status, missing_part_id, vehicle_id, from_station_id, to_station_id, requested_by
  ) values (
    'transfer', 'pending', p_missing_part_id, mp.vehicle_id, v.current_station_id, p_to_station_id, auth.uid()
  )
  returning id into rid;

  return rid;
end;
$$;

create or replace function request_vehicle_shortage_restore(p_vehicle_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v vehicles%rowtype;
  rid uuid;
begin
  if not can_manage_missing_parts(true) then
    raise exception 'Permission denied';
  end if;

  select * into v from vehicles where id = p_vehicle_id and not is_deleted for update;
  if not found then
    raise exception 'Vehicle not found';
  end if;

  if v.shortage_resolved_at is null then
    raise exception 'Vehicle is not archived';
  end if;

  if exists (
    select 1 from missing_part_workflow_requests
    where vehicle_id = p_vehicle_id
      and kind = 'restore'
      and status = 'pending'
  ) then
    raise exception 'A pending restore request already exists for this vehicle';
  end if;

  insert into missing_part_workflow_requests (
    kind, status, vehicle_id, from_station_id, requested_by
  ) values (
    'restore', 'pending', p_vehicle_id, v.current_station_id, auth.uid()
  )
  returning id into rid;

  return rid;
end;
$$;

create or replace function review_missing_part_workflow_request(
  p_id uuid,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  req missing_part_workflow_requests%rowtype;
  result jsonb := '{}'::jsonb;
begin
  if not can_review_missing_part_workflow() then
    raise exception 'Permission denied';
  end if;

  select * into req from missing_part_workflow_requests where id = p_id for update;
  if not found then
    raise exception 'Request not found';
  end if;

  if req.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  if p_approve then
    if req.kind = 'transfer' then
      if req.missing_part_id is null or req.to_station_id is null then
        raise exception 'Transfer request is incomplete';
      end if;
      if not is_quality_transfer_station(req.to_station_id) then
        raise exception 'Destination must be an active quality station (e.g. QP3)';
      end if;
      result := apply_approved_missing_part_transfer(req.missing_part_id, req.to_station_id);
    elsif req.kind = 'restore' then
      perform apply_approved_vehicle_shortage_restore(req.vehicle_id);
      result := jsonb_build_object('vehicle_id', req.vehicle_id, 'restored', true);
    end if;

    update missing_part_workflow_requests
    set status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = nullif(trim(p_note), '')
    where id = p_id;
  else
    update missing_part_workflow_requests
    set status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = nullif(trim(p_note), '')
    where id = p_id;
    result := jsonb_build_object('rejected', true);
  end if;

  return result || jsonb_build_object('request_id', p_id, 'approved', p_approve);
end;
$$;

drop view if exists public.v_missing_part_workflow_requests;
create view public.v_missing_part_workflow_requests
with (security_invoker = true) as
select
  r.id,
  r.kind,
  r.status,
  r.missing_part_id,
  r.vehicle_id,
  r.from_station_id,
  r.to_station_id,
  r.requested_by,
  r.requested_at,
  r.reviewed_by,
  r.reviewed_at,
  r.review_note,
  v.vin,
  vm.name as model_name,
  mp.part_description,
  fs.station_number as from_station_number,
  fs.station_name as from_station_name,
  ts.station_number as to_station_number,
  ts.station_name as to_station_name,
  coalesce(req_e.full_name, req_p.full_name) as requested_by_name,
  coalesce(rev_e.full_name, rev_p.full_name) as reviewed_by_name
from public.missing_part_workflow_requests r
  join public.vehicles v on v.id = r.vehicle_id
  left join public.vehicle_models vm on vm.id = v.model_id
  left join public.missing_parts mp on mp.id = r.missing_part_id
  left join public.stations fs on fs.id = r.from_station_id
  left join public.stations ts on ts.id = r.to_station_id
  left join public.profiles req_p on req_p.id = r.requested_by
  left join public.employees req_e on req_e.id = req_p.employee_id
  left join public.profiles rev_p on rev_p.id = r.reviewed_by
  left join public.employees rev_e on rev_e.id = rev_p.employee_id
where v.is_deleted = false;

drop view if exists public.v_missing_parts_detail;
create view public.v_missing_parts_detail
with (security_invoker = true) as
select
  mp.id,
  mp.vehicle_id,
  mp.report_group_id,
  mp.item_id,
  mp.part_description,
  mp.required_qty,
  mp.installed_qty,
  mp.remaining_qty,
  mp.reason,
  mp.department,
  mp.priority,
  mp.status,
  mp.qc_approved,
  mp.is_dr_item,
  mp.stopper_type,
  mp.notes,
  mp.created_at,
  mp.updated_at,
  mp.closed_at,
  mp.transferred_at,
  mp.factory_org_unit_id,
  v.vin,
  v.model_id,
  vm.name           as model_name,
  v.vehicle_color_id,
  vc.name           as color_name,
  vc.hex_code       as color_hex,
  v.current_station_id as station_id,
  v.shortage_resolved_at,
  v.shortage_resolved_by,
  coalesce(re.full_name, rp.full_name) as shortage_resolved_by_name,
  st.station_number,
  st.station_name,
  st.line_name              as station_line_name,
  wa.name                   as station_area,
  st.responsible_department as station_department,
  st.responsible_person     as station_person,
  mp.created_by,
  cp.full_name      as created_by_name,
  cp.email          as created_by_email,
  ptr.id            as pending_transfer_request_id,
  prr.id            as pending_restore_request_id
from public.missing_parts mp
  join public.vehicles v on v.id = mp.vehicle_id
  left join public.vehicle_models vm on vm.id = v.model_id
  left join public.vehicle_colors vc on vc.id = v.vehicle_color_id
  left join public.stations st on st.id = v.current_station_id
  left join public.work_areas wa on wa.id = st.work_area_id
  left join public.profiles cp on cp.id = mp.created_by
  left join public.profiles rp on rp.id = v.shortage_resolved_by
  left join public.employees re on re.id = rp.employee_id
  left join public.missing_part_workflow_requests ptr
    on ptr.missing_part_id = mp.id
   and ptr.kind = 'transfer'
   and ptr.status = 'pending'
  left join public.missing_part_workflow_requests prr
    on prr.vehicle_id = v.id
   and prr.kind = 'restore'
   and prr.status = 'pending'
where v.is_deleted = false;

insert into public.system_permissions (module_key, permission_key, permission_name_ar, permission_name_en)
values
  ('pages', 'production_missing__approvals', 'نواقص — اعتماد الترحيل', 'Missing parts — transfer approvals')
on conflict (module_key, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_id, allowed)
select rp.role_id, sp_tab.id, bool_or(rp.allowed)
from public.system_permissions sp_parent
join public.role_permissions rp on rp.permission_id = sp_parent.id and rp.allowed = true
join public.system_permissions sp_tab
  on sp_tab.module_key = 'pages'
 and sp_tab.permission_key = 'production_missing__approvals'
where sp_parent.module_key = 'pages'
  and sp_parent.permission_key in (
    'production_missing',
    'production_missing__historySummary'
  )
group by rp.role_id, sp_tab.id
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

revoke execute on function apply_approved_missing_part_transfer(uuid, uuid) from public, anon, authenticated;
revoke execute on function apply_approved_vehicle_shortage_restore(uuid) from public, anon, authenticated;

grant execute on function is_quality_transfer_station(uuid) to authenticated;
grant execute on function can_review_missing_part_workflow() to authenticated;
grant execute on function request_missing_part_transfer(uuid, uuid) to authenticated;
grant execute on function request_vehicle_shortage_restore(uuid) to authenticated;
grant execute on function review_missing_part_workflow_request(uuid, boolean, text) to authenticated;
grant select on public.v_missing_part_workflow_requests to authenticated;

drop policy if exists mp_wf_select on public.missing_part_workflow_requests;
create policy mp_wf_select on public.missing_part_workflow_requests
  for select to authenticated
  using (
    can_manage_missing_parts(false)
    or can_review_missing_part_workflow()
  );
