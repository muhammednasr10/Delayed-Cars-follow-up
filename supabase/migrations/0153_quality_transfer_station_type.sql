-- Quality stations are a dedicated station_type; transfer picker uses only these.
-- Enum value is added in 0152; this function must run in a later transaction.

create or replace function public.is_quality_transfer_station(p_station_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stations s
    where s.id = p_station_id
      and s.is_active = true
      and s.station_type = 'quality'
  );
$$;

grant execute on function public.is_quality_transfer_station(uuid) to authenticated;
