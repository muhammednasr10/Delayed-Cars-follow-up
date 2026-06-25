-- Run once in Supabase SQL Editor (replace email).
-- Grants admin legacy role + system role so Settings appears in the app.

update profiles
set
  role = 'admin',
  system_role_id = (select id from system_roles where role_code = 'admin' limit 1)
where lower(email) = lower('YOUR_EMAIL@example.com');
