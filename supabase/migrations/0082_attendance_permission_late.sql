-- Add permission (إذن) and late (تأخير) attendance statuses.

alter type attendance_day_status add value if not exists 'permission';
alter type attendance_day_status add value if not exists 'late';
