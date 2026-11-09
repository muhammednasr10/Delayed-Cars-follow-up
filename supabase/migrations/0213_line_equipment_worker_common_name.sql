-- Common/colloquial name for the assigned worker line (e.g. أكرة ش for ST1-L1).

alter table public.line_equipment
  add column if not exists worker_common_name text not null default '';

comment on column public.line_equipment.worker_common_name is
  'Common name of the worker/station line (الاسم الشائع), e.g. أكرة ش for ST1-L1.';
