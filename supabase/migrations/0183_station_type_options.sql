-- Editable station types. Existing codes stay (main_line, quality, …) and new ones can be added from settings.

create table if not exists public.station_type_options (
  code text primary key,
  label_ar text not null,
  label_en text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.station_type_options (code, label_ar, label_en, sort_order) values
  ('main_line', 'محطة على الخط', 'On-line station', 10),
  ('side_assembly', 'محطة تجميع جانبي', 'Side assembly', 20),
  ('offline_prep', 'محطة تحضير', 'Offline prep', 30),
  ('quality', 'محطة جودة', 'Quality station', 40)
on conflict (code) do nothing;

alter table public.station_type_options enable row level security;

drop policy if exists station_type_options_select on public.station_type_options;
create policy station_type_options_select on public.station_type_options
  for select to authenticated
  using (true);

drop policy if exists station_type_options_write on public.station_type_options;
create policy station_type_options_write on public.station_type_options
  for all to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.station_type_options to authenticated;

-- Free-text so a new type from settings can be stored on the station.
do $$
declare
  col_udt text;
begin
  select udt_name into col_udt
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'stations'
    and column_name = 'station_type';

  if col_udt is distinct from 'text' then
    alter table public.stations alter column station_type drop default;
    alter table public.stations alter column station_type type text using station_type::text;
    alter table public.stations alter column station_type set default 'main_line';
    alter table public.stations alter column station_type set not null;
  end if;
end $$;
