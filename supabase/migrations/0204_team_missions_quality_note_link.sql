-- Link team missions created from quality-note 8D study.
alter table public.team_missions
  add column if not exists source_quality_note_id uuid references public.quality_notes (id) on delete set null;

create index if not exists idx_team_missions_source_quality_note
  on public.team_missions (source_quality_note_id)
  where source_quality_note_id is not null;

notify pgrst, 'reload schema';
