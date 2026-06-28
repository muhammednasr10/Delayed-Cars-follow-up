-- Archive sets qc_approved before closing; skip install-qty guard when QC/archive is confirmed.

create or replace function enforce_missing_part_close()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'closed' then
    if new.installed_qty < new.required_qty and not coalesce(new.qc_approved, false) then
      raise exception
        'Cannot close missing part %: installed (%) < required (%).',
        new.id, new.installed_qty, new.required_qty
        using errcode = 'check_violation';
    end if;
    if not coalesce(new.qc_approved, false) then
      raise exception
        'Cannot close missing part %: QC approval is required first.', new.id
        using errcode = 'check_violation';
    end if;
    if new.closed_at is null then
      new.closed_at := now();
    end if;
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;
