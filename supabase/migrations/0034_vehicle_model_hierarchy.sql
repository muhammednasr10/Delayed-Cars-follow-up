-- Parent model (family) e.g. T4 → variants T4C, T4L, T4T

alter table vehicle_models
  add column if not exists parent_model_id uuid references vehicle_models (id) on delete restrict,
  add column if not exists model_kind text not null default 'variant';

alter table vehicle_models drop constraint if exists vehicle_models_kind_check;
alter table vehicle_models add constraint vehicle_models_kind_check
  check (model_kind in ('family', 'variant'));

alter table vehicle_models drop constraint if exists vehicle_models_family_no_parent;
alter table vehicle_models add constraint vehicle_models_family_no_parent
  check (model_kind <> 'family' or parent_model_id is null);

create index if not exists idx_vehicle_models_parent on vehicle_models (parent_model_id);
create index if not exists idx_vehicle_models_kind on vehicle_models (model_kind);

-- Ensure T4 family row exists
insert into vehicle_models (name, model_kind, is_active)
select 'T4', 'family', true
where not exists (select 1 from vehicle_models where upper(trim(name)) = 'T4');

update vehicle_models
set model_kind = 'family', parent_model_id = null
where upper(trim(name)) = 'T4';

-- Link T4* variants to T4 parent
update vehicle_models v
set
  model_kind = 'variant',
  parent_model_id = p.id
from vehicle_models p
where p.model_kind = 'family' and upper(trim(p.name)) = 'T4'
  and upper(trim(v.name)) ~ '^T4[A-Z0-9]+$'
  and upper(trim(v.name)) <> 'T4'
  and (v.parent_model_id is distinct from p.id or v.model_kind <> 'variant');

-- Mirror in vehicle_model_families (used by operations / time study)
-- Run 0035_fix_stamp_actor_trigger.sql if insert fails on created_by (erroneous stamp trigger).

insert into vehicle_model_families (family_code, name_ar, name_en)
values ('t4', 'T4', 'T4')
on conflict (family_code) do update set name_ar = excluded.name_ar, name_en = excluded.name_en;

drop trigger if exists trg_vehicle_model_family_members_stamp on vehicle_model_family_members;
drop trigger if exists trg_vehicle_model_families_stamp on vehicle_model_families;

insert into vehicle_model_family_members (family_id, vehicle_model_id)
select f.id, v.id
from vehicle_model_families f
cross join vehicle_models v
where f.family_code = 't4'
  and v.model_kind = 'variant'
  and v.parent_model_id = (select id from vehicle_models where upper(trim(name)) = 'T4' and model_kind = 'family' limit 1)
on conflict (family_id, vehicle_model_id) do nothing;
