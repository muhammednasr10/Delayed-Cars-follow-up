insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mission-responses',
  'mission-responses',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
    coalesce(nullif(trim(p_file_name), ''), 'file'),
    coalesce(nullif(trim(p_mime_type), ''), 'application/octet-stream')
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.attach_team_mission_response_file(uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';
