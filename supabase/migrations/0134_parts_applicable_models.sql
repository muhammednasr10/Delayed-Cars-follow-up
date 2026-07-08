-- Manual model assignment on parts master list
alter table public.parts
  add column if not exists applicable_models_text text;

comment on column public.parts.applicable_models_text is 'موديلات الجزء (يدوي) — comma-separated model names';
