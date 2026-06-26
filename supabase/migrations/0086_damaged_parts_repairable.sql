-- Repairable flag for damaged parts records.

alter table public.damaged_parts
  add column if not exists is_repairable boolean not null default false;

comment on column public.damaged_parts.is_repairable is
  'Whether the damaged part can be repaired (true) or not (false).';
