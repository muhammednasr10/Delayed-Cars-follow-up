-- Quality notes: worker line (PBS01-L1) from line balancing instead of assigned employee.

alter table public.quality_notes
  add column if not exists worker_line_station_id uuid references public.stations (id) on delete set null;

create index if not exists idx_quality_notes_worker_line
  on public.quality_notes (worker_line_station_id);
