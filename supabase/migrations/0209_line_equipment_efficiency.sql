-- Tool efficiency as a percentage (0–100), separate from status.

alter table public.line_equipment
  add column if not exists efficiency_percent numeric(5, 2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'line_equipment_efficiency_percent_check'
  ) then
    alter table public.line_equipment
      add constraint line_equipment_efficiency_percent_check
      check (
        efficiency_percent is null
        or (efficiency_percent >= 0 and efficiency_percent <= 100)
      );
  end if;
end $$;
