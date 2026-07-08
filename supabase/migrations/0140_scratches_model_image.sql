-- Scratches: parent/variant model, photo attachment.

alter table public.scratches
  add column if not exists parent_model_id uuid references public.vehicle_models (id) on delete set null,
  add column if not exists vehicle_model_id uuid references public.vehicle_models (id) on delete set null,
  add column if not exists image_path text;

create index if not exists idx_scratches_parent_model on public.scratches (parent_model_id);
create index if not exists idx_scratches_vehicle_model on public.scratches (vehicle_model_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scratches',
  'scratches',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists scratches_images_select on storage.objects;
create policy scratches_images_select on storage.objects
  for select to public
  using (bucket_id = 'scratches');

drop policy if exists scratches_images_write on storage.objects;
create policy scratches_images_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'scratches'
    and has_role('admin', 'production')
  )
  with check (
    bucket_id = 'scratches'
    and has_role('admin', 'production')
  );
