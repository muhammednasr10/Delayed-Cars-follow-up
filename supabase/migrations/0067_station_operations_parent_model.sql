-- Link station operations to parent vehicle model (T4, T8, …) from Settings → Models
alter table station_operations
  add column if not exists parent_model_id uuid references vehicle_models (id) on delete set null;

create index if not exists idx_station_ops_parent_model on station_operations (parent_model_id);
