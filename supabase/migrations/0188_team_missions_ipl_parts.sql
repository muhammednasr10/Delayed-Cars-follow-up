alter table public.team_missions
  add column if not exists ipl_parts jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
