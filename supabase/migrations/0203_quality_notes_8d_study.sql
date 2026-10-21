-- 8D problem-solving fields for quality note study tab.
alter table public.quality_notes
  add column if not exists study_8d jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
