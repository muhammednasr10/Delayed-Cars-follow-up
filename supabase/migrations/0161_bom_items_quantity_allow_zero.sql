-- IPL "not fitted" marker rows use quantity 0 (part_number/qty token NA).
-- The original check (quantity > 0) blocked saving parts with not-fitted models.

alter table public.bom_items drop constraint if exists bom_items_quantity_check;
alter table public.bom_items add constraint bom_items_quantity_check check (quantity >= 0);
