-- Custom JWT users may not exist in auth.users; keep actor/reader ids as uuid only.
alter table public.app_notifications drop constraint if exists app_notifications_actor_id_fkey;
alter table public.app_notification_reads drop constraint if exists app_notification_reads_user_id_fkey;
