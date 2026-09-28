-- Custom cross-model comparison traits on the part master (size, shape, color, …).

alter table public.parts
  add column if not exists compare_traits jsonb not null default '[]'::jsonb;
