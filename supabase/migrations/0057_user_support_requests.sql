-- User support requests: password reset, complaints, etc.

do $$ begin
  create type public.user_request_type as enum ('password_reset', 'complaint', 'account_issue', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.user_request_status as enum ('pending', 'in_progress', 'resolved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.user_support_requests (
  id uuid primary key default gen_random_uuid(),
  request_type public.user_request_type not null,
  email text not null,
  requester_user_id uuid references public.profiles(id) on delete set null,
  requester_name text,
  message text not null,
  status public.user_request_status not null default 'pending',
  admin_notes text,
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_support_requests_status_created
  on public.user_support_requests (status, created_at desc);

create index if not exists idx_user_support_requests_email
  on public.user_support_requests (lower(email));

drop trigger if exists trg_user_support_requests_updated_at on public.user_support_requests;
create trigger trg_user_support_requests_updated_at
  before update on public.user_support_requests
  for each row execute function public.set_updated_at();

alter table public.user_support_requests enable row level security;

drop policy if exists user_support_requests_admin_read on public.user_support_requests;
create policy user_support_requests_admin_read on public.user_support_requests
  for select to authenticated
  using (has_permission('users', 'manage') or requester_user_id = auth.uid());

drop policy if exists user_support_requests_admin_write on public.user_support_requests;
create policy user_support_requests_admin_write on public.user_support_requests
  for update to authenticated
  using (has_permission('users', 'manage'))
  with check (has_permission('users', 'manage'));

-- ---------------------------------------------------------------------------
-- Submit (login page — anon OK; logged-in users linked automatically)
-- ---------------------------------------------------------------------------

create or replace function public.submit_user_support_request(
  p_type text,
  p_email text,
  p_message text,
  p_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_email));
  v_message text := trim(p_message);
  v_type public.user_request_type;
  v_uid uuid := auth.uid();
begin
  if v_email = '' or length(v_message) < 10 then
    raise exception 'Email and message (min 10 chars) are required.' using errcode = '22023';
  end if;

  begin
    v_type := p_type::public.user_request_type;
  exception when others then
    raise exception 'Invalid request type.' using errcode = '22023';
  end if;

  -- Limit duplicate pending password-reset spam per email
  if v_type = 'password_reset' and exists (
    select 1 from public.user_support_requests r
    where lower(r.email) = v_email
      and r.request_type = 'password_reset'
      and r.status in ('pending', 'in_progress')
      and r.created_at > now() - interval '24 hours'
  ) then
    raise exception 'A password reset request is already pending for this email.' using errcode = '23505';
  end if;

  insert into public.user_support_requests (
    request_type, email, requester_user_id, requester_name, message
  ) values (
    v_type,
    v_email,
    v_uid,
    nullif(trim(p_name), ''),
    v_message
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_user_support_request(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: update status / notes
-- ---------------------------------------------------------------------------

create or replace function public.update_user_support_request(
  p_request_id uuid,
  p_status text default null,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.user_request_status;
begin
  if not has_permission('users', 'manage') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  if p_status is not null then
    begin
      v_status := p_status::public.user_request_status;
    exception when others then
      raise exception 'Invalid status.' using errcode = '22023';
    end;
  end if;

  update public.user_support_requests set
    status = coalesce(v_status, status),
    admin_notes = case when p_admin_notes is not null then nullif(trim(p_admin_notes), '') else admin_notes end,
    handled_by = case when p_status is not null and p_status in ('resolved', 'rejected', 'in_progress') then auth.uid() else handled_by end,
    handled_at = case when p_status is not null and p_status in ('resolved', 'rejected') then now() else handled_at end,
    updated_at = now()
  where id = p_request_id;

  if not found then
    raise exception 'Request not found.' using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function public.update_user_support_request(uuid, text, text) to authenticated;

-- Detail view for admin UI
create or replace view public.v_user_support_requests_detail as
select
  r.id,
  r.request_type,
  r.email,
  r.requester_user_id,
  r.requester_name,
  r.message,
  r.status,
  r.admin_notes,
  r.handled_by,
  r.handled_at,
  r.created_at,
  r.updated_at,
  p.full_name as requester_profile_name,
  p.employee_id,
  e.employee_code,
  e.full_name as employee_full_name,
  h.full_name as handled_by_name
from public.user_support_requests r
left join public.profiles p on p.id = r.requester_user_id
left join public.employees e on e.id = p.employee_id
left join public.profiles h on h.id = r.handled_by;

grant select on public.v_user_support_requests_detail to authenticated;
