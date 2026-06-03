-- Worker #1 operation group description per station (عمليات العامل 1)
alter table stations add column if not exists worker1_operations_summary text;
