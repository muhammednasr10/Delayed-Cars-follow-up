-- Part master photo shown from the IPL part-details actions column.

alter table public.parts
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'part-images',
  'part-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists part_images_select on storage.objects;
create policy part_images_select on storage.objects
  for select to public
  using (bucket_id = 'part-images');

drop policy if exists part_images_write on storage.objects;
create policy part_images_write on storage.objects
  for all to authenticated
  using (bucket_id = 'part-images')
  with check (bucket_id = 'part-images');
