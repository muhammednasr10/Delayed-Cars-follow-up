-- User self-service: avatar, display name, password (via auth API)

alter table profiles add column if not exists avatar_url text;

create or replace function update_my_profile(
  p_full_name text default null,
  p_avatar_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;

  update profiles set
    full_name = case
      when p_full_name is not null then nullif(trim(p_full_name), '')
      else full_name
    end,
    avatar_url = case
      when p_avatar_url is not null then nullif(trim(p_avatar_url), '')
      else avatar_url
    end
  where id = auth.uid();
end;
$$;

grant execute on function update_my_profile(text, text) to authenticated;

-- Avatars bucket (public read for profile images)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_select_public on storage.objects;
create policy avatars_select_public on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
