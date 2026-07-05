-- Optional unit cost for damaged parts monthly cost totals on home cards.
alter table public.damaged_parts
  add column if not exists unit_cost numeric(14, 2);
