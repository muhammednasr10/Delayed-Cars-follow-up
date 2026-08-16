-- IPL feeding columns used by the add/edit part card.
-- Run in Supabase SQL editor if save fails with: Could not find the 'carton_qty' column

alter table public.bom_items add column if not exists carton_qty text;
alter table public.bom_items add column if not exists part_weight text;
alter table public.bom_items add column if not exists carton_weight text;
alter table public.bom_items add column if not exists rack_length text;
alter table public.bom_items add column if not exists rack_width text;
alter table public.bom_items add column if not exists rack_height text;

notify pgrst, 'reload schema';
