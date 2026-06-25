-- IPL Type column often stores 1 = Part, 2 = Hardware — normalize to P / H/W
update parts
set part_type = 'P'
where part_type is null
   or trim(part_type) = ''
   or trim(part_type) in ('1', '1.0');

update parts
set part_type = 'H/W'
where trim(part_type) in ('2', '2.0');

-- Any other unrecognized codes → default Part
update parts
set part_type = 'P'
where part_type is not null
  and trim(part_type) not in ('P', 'H/W')
  and upper(trim(part_type)) not in ('PART', 'PARTS', 'HW', 'H', 'W')
  and part_type !~* 'هارد|hard|hw'
  and part_type !~* 'جزء';
