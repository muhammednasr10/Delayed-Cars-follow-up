-- Vehicles whose shortage lines are all closed/cancelled should stay in archive.
-- They were accidentally reopened when shortage_resolved_at was cleared.

update vehicles v
set
  shortage_resolved_at = coalesce(
    v.shortage_resolved_at,
    (
      select max(mp.closed_at)
      from missing_parts mp
      where mp.vehicle_id = v.id
    ),
    now()
  )
where v.shortage_resolved_at is null
  and exists (select 1 from missing_parts mp where mp.vehicle_id = v.id)
  and not exists (
    select 1
    from missing_parts mp
    where mp.vehicle_id = v.id
      and mp.status = 'open'
      and mp.closed_at is null
  );
