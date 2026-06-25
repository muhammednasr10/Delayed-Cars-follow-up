-- Fix part_name_en stored as Arabic: prefer English from IPL raw_data column.

update parts p
set part_name_en = sub.raw_en
from (
  select distinct on (bi.part_id)
    bi.part_id,
    coalesce(
      nullif(trim(bi.raw_data->>'Part Name(EN)'), ''),
      nullif(trim(bi.raw_data->>'Part Name (EN)'), ''),
      nullif(trim(bi.raw_data->>'PART NAME (EN)'), '')
    ) as raw_en
  from bom_items bi
  where bi.raw_data is not null
    and bi.is_active
  order by bi.part_id, bi.updated_at desc nulls last
) sub
where p.id = sub.part_id
  and sub.raw_en is not null
  and sub.raw_en ~ '[A-Za-z]'
  and sub.raw_en !~ '[ء-ي]'
  and (
    p.part_name_en is null
    or p.part_name_en = p.part_name_ar
    or p.part_name_en ~ '[ء-ي]'
  );

-- Clear Arabic mistaken as English so UI glossary can fill on read.
update parts
set part_name_en = null
where part_name_en is not null
  and part_name_en ~ '[ء-ي]'
  and (part_name_en = part_name_ar or part_name_en !~ '[A-Za-z]');
