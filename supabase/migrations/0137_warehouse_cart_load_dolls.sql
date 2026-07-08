-- Cart max load (kg) and doll (دولية) slot dimensions for feeding trip planning
alter table warehouse_carts add column if not exists max_load_kg numeric(12, 2);
alter table warehouse_carts add column if not exists doll_count integer;
alter table warehouse_carts add column if not exists doll_length_cm numeric(12, 2);
alter table warehouse_carts add column if not exists doll_width_cm numeric(12, 2);
alter table warehouse_carts add column if not exists doll_height_cm numeric(12, 2);

comment on column warehouse_carts.max_load_kg is 'Maximum cart load in kg for feeding trips';
comment on column warehouse_carts.doll_count is 'Number of doll positions on the cart';
comment on column warehouse_carts.doll_length_cm is 'Doll slot length cm';
comment on column warehouse_carts.doll_width_cm is 'Doll slot width cm';
comment on column warehouse_carts.doll_height_cm is 'Doll slot height cm';
