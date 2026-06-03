-- Optional stable code for vehicle colors (settings + reports).

alter table vehicle_colors
  add column if not exists code text;

update vehicle_colors
set code = lower(trim(regexp_replace(coalesce(nullif(trim(name), ''), 'x'), '[^a-zA-Z0-9]+', '_', 'g')))
where code is null or trim(code) = '';

update vehicle_colors
set code = 'c_' || substr(replace(id::text, '-', ''), 1, 12)
where code is null or trim(code) = '';

create unique index if not exists idx_vehicle_colors_code
  on vehicle_colors (code)
  where code is not null;
