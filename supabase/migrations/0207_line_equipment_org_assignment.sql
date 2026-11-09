-- Org placement and worker assignment for factory tools.

alter table public.line_equipment
  add column if not exists org_unit_id uuid references public.factory_org_units (id) on delete set null,
  add column if not exists assigned_employee_id uuid references public.employees (id) on delete set null;

create index if not exists idx_line_equipment_org_unit on public.line_equipment (org_unit_id);
create index if not exists idx_line_equipment_assignee on public.line_equipment (assigned_employee_id);
