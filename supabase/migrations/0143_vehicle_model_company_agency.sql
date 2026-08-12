-- Parent company (OEM) and dealership/agency per vehicle model
alter table vehicle_models
  add column if not exists parent_company text,
  add column if not exists agency text;

comment on column vehicle_models.parent_company is 'OEM / parent company (الشركة الأم)';
comment on column vehicle_models.agency is 'Dealership / agency (التوكيل)';
