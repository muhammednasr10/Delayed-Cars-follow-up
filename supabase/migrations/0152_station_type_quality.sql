-- Must be applied alone (new enum values cannot be used in the same transaction).

alter type public.station_type add value if not exists 'quality';
