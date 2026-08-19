drop function if exists public.respond_my_team_mission(uuid, text);

create table if not exists public.team_mission_response_attachments (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.team_mission_responses (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_team_mission_response_attachments_response
  on public.team_mission_response_attachments (response_id, created_at);

alter table public.team_mission_response_attachments enable row level security;

drop policy if exists team_mission_response_attachments_select on public.team_mission_response_attachments;
create policy team_mission_response_attachments_select on public.team_mission_response_attachments
  for select to authenticated using (true);

grant select on public.team_mission_response_attachments to authenticated;

create or replace function public.respond_my_team_mission(
  p_mission_id uuid,
  p_response text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_name text;
  v_status text;
  v_allowed boolean;
  v_id uuid;
begin
  if nullif(trim(p_response), '') is null then
    raise exception 'RESPONSE_REQUIRED';
  end if;

  v_employee_id := auth_employee_id();
  if v_employee_id is null and not has_role('admin', 'production') then
    raise exception 'NO_EMPLOYEE_LINK';
  end if;

  select tm.status into v_status
  from public.team_missions tm
  where tm.id = p_mission_id;

  if not found then
    raise exception 'MISSION_NOT_FOUND';
  end if;

  v_allowed := has_role('admin', 'production')
    or (
      v_employee_id is not null
      and (
        is_mission_assignee(p_mission_id, v_employee_id)
        or mission_assignees_are_subordinates(p_mission_id, v_employee_id)
      )
    );

  if not v_allowed then
    raise exception 'MISSION_NOT_ASSIGNEE';
  end if;

  if v_employee_id is not null then
    select coalesce(e.full_name, '—') into v_name
    from public.employees e
    where e.id = v_employee_id;
  end if;

  if v_name is null then
    select coalesce(nullif(trim(p.full_name), ''), '—') into v_name
    from public.profiles p
    where p.id = auth.uid();
  end if;

  v_name := coalesce(nullif(trim(v_name), ''), '—');

  insert into public.team_mission_responses (mission_id, author_employee_id, author_name, body)
  values (p_mission_id, v_employee_id, v_name, trim(p_response))
  returning id into v_id;

  update public.team_missions
  set status = case when v_status = 'pending' then 'in_progress' else v_status end
  where id = p_mission_id;

  return v_id;
end;
$$;

grant execute on function public.respond_my_team_mission(uuid, text) to authenticated;

create or replace function public.attach_team_mission_response_file(
  p_response_id uuid,
  p_file_path text,
  p_file_name text,
  p_mime_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_id uuid;
  v_employee_id uuid;
  v_allowed boolean;
  v_count int;
  v_id uuid;
begin
  if nullif(trim(p_file_path), '') is null then
    raise exception 'FILE_REQUIRED';
  end if;

  select r.mission_id into v_mission_id
  from public.team_mission_responses r
  where r.id = p_response_id;

  if not found then
    raise exception 'MISSION_NOT_FOUND';
  end if;

  v_employee_id := auth_employee_id();
  v_allowed := has_role('admin', 'production')
    or (
      v_employee_id is not null
      and (
        is_mission_assignee(v_mission_id, v_employee_id)
        or mission_assignees_are_subordinates(v_mission_id, v_employee_id)
      )
    );

  if not v_allowed then
    raise exception 'MISSION_NOT_ASSIGNEE';
  end if;

  select count(*) into v_count
  from public.team_mission_response_attachments
  where response_id = p_response_id;

  if v_count >= 3 then
    raise exception 'FILE_TOO_MANY';
  end if;

  insert into public.team_mission_response_attachments (response_id, file_path, file_name, mime_type)
  values (
    p_response_id,
    trim(p_file_path),
    coalesce(nullif(trim(p_file_name), ''), 'image'),
    coalesce(nullif(trim(p_mime_type), ''), 'image/jpeg')
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.attach_team_mission_response_file(uuid, text, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mission-responses',
  'mission-responses',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists mission_response_images_select on storage.objects;
create policy mission_response_images_select on storage.objects
  for select to public
  using (bucket_id = 'mission-responses');

drop policy if exists mission_response_images_write on storage.objects;
create policy mission_response_images_write on storage.objects
  for all to authenticated
  using (bucket_id = 'mission-responses')
  with check (bucket_id = 'mission-responses');

notify pgrst, 'reload schema';
