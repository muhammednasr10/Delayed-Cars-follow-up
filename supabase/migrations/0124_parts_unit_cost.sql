-- Optional unit cost for damaged-parts monthly cost on home cards.
alter table public.parts
  add column if not exists unit_cost numeric(14, 2) not null default 0;
