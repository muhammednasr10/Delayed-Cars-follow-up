alter table public.team_missions
  add column if not exists created_by_employee_id uuid references public.employees (id) on delete set null,
  add column if not exists created_by_name text;

create or replace function public.team_missions_freeze_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp uuid;
  v_name text;
begin
  if tg_op = 'UPDATE' then
    new.created_by_employee_id := old.created_by_employee_id;
    new.created_by_name := old.created_by_name;
    return new;
  end if;

  v_emp := auth_employee_id();
  new.created_by_employee_id := v_emp;

  if v_emp is not null then
    select coalesce(nullif(trim(e.full_name), ''), '—') into v_name
    from public.employees e
    where e.id = v_emp;
  end if;

  if v_name is null then
    select coalesce(nullif(trim(p.full_name), ''), '—') into v_name
    from public.profiles p
    where p.id = auth.uid();
  end if;

  new.created_by_name := coalesce(v_name, '—');
  return new;
end;
$$;

drop trigger if exists trg_team_missions_freeze_creator on public.team_missions;
create trigger trg_team_missions_freeze_creator
  before insert or update on public.team_missions
  for each row execute function public.team_missions_freeze_creator();

notify pgrst, 'reload schema';
