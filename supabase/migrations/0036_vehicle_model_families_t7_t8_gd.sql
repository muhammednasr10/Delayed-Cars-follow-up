-- Parent/variant hierarchy: T7, T8, GD (idempotent; run after 0034/0035).

drop trigger if exists trg_vehicle_model_family_members_stamp on vehicle_model_family_members;
drop trigger if exists trg_vehicle_model_families_stamp on vehicle_model_families;

do $$
begin
  create temp table _hierarchy_seed (
    parent_name text not null,
    family_code text not null,
    variant_name text not null
  ) on commit drop;

  insert into _hierarchy_seed (parent_name, family_code, variant_name) values
    ('T7', 't7', 'T7B'),
    ('T7', 't7', 'T7H'),
    ('T8', 't8', 'T8C7'),
    ('T8', 't8', 'T8L5'),
    ('T8', 't8', 'T8L7'),
    ('GD', 'gd', 'K50'),
    ('GD', 'gd', 'K51'),
    ('GD', 'gd', 'F10'),
    ('GD', 'gd', 'K52'),
    ('GD', 'gd', 'K53'),
    ('GD', 'gd', 'F12');

  insert into vehicle_models (name, model_kind, is_active)
  select distinct s.parent_name, 'family', true
  from _hierarchy_seed s
  where not exists (
    select 1 from vehicle_models m where upper(trim(m.name)) = upper(s.parent_name)
  );

  update vehicle_models m
  set model_kind = 'family', parent_model_id = null
  from (select distinct parent_name from _hierarchy_seed) s
  where upper(trim(m.name)) = upper(s.parent_name);

  update vehicle_models v
  set
    model_kind = 'variant',
    parent_model_id = p.id
  from _hierarchy_seed s
  join vehicle_models p
    on upper(trim(p.name)) = upper(s.parent_name) and p.model_kind = 'family'
  where upper(trim(v.name)) = upper(s.variant_name)
    and (v.parent_model_id is distinct from p.id or v.model_kind <> 'variant');

  insert into vehicle_models (name, model_kind, is_active, parent_model_id)
  select s.variant_name, 'variant', true, p.id
  from _hierarchy_seed s
  join vehicle_models p
    on upper(trim(p.name)) = upper(s.parent_name) and p.model_kind = 'family'
  where not exists (
    select 1 from vehicle_models m where upper(trim(m.name)) = upper(s.variant_name)
  );

  insert into vehicle_model_families (family_code, name_ar, name_en)
  select distinct s.family_code, s.parent_name, s.parent_name
  from _hierarchy_seed s
  on conflict (family_code) do update
    set name_ar = excluded.name_ar, name_en = excluded.name_en;

  insert into vehicle_model_family_members (family_id, vehicle_model_id)
  select f.id, v.id
  from _hierarchy_seed s
  join vehicle_model_families f on f.family_code = s.family_code
  join vehicle_models v on upper(trim(v.name)) = upper(s.variant_name)
  where v.model_kind = 'variant'
  on conflict (family_id, vehicle_model_id) do nothing;
end $$;
