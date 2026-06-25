# Assembly Line Tracking System

SPA web app built with React + Vite + Tailwind CSS for tracking delayed cars and missing parts in an automotive assembly line.

## Features

- Dark industrial dashboard
- Local state management using React Context API
- Add delayed car form with validation
- Unique chassis number validation
- Criticality levels
- Stopper Type classification (Line Stopper / Car Stopper)
- Tracking grid with filters
- Change status workflow
- Edit data and add notes
- Responsive design for production screens and tablets

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Architecture

The app is built around a normalized factory domain enforced in PostgreSQL, not
in the browser. The vehicle is a first-class entity that can have many missing
parts, QC inspections, and stock movements. Critical business rules (unique +
immutable VIN, no negative stock, no closing a part before it is installed and
QC-approved, no completing/delivering a vehicle with open shortages or failed
QC) are enforced by database constraints, triggers, and `SECURITY DEFINER` RPCs.

### Database migrations

Run the SQL files in `supabase/migrations` in order (Supabase SQL editor or CLI):

1. `0001_factory_core_schema.sql` — enums, tables, indexes, constraints, guard triggers
2. `0002_rls_and_rpcs.sql` — Row Level Security + role permissions + transactional RPCs
3. `0003_reporting_views.sql` — dashboard / report views
4. `0004_auth_profile_bootstrap.sql` — auto-create a profile per auth user

### Environment

Create `.env.local` with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Auth & roles

The app requires Supabase Auth (email/password). New users default to the
least-privileged `viewer` role. After signing up, promote your first admin:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

Roles: `admin`, `production`, `warehouse`, `purchasing`, `quality`, `viewer`.

### Users & permissions (Settings → Users & Permissions)

Admins with `users.manage` can edit roles, the permission matrix, user accounts, and overrides.

**Create users from the app:** run migration `0043_admin_create_user_rpc.sql` in the Supabase SQL Editor (no Edge Function required). Also apply `0042_user_accounts_admin_crud.sql` after `0014` / `0015` if not already applied.

Optional fallback: `supabase functions deploy admin-users` if you prefer Edge Functions over the SQL RPC.

### Wipe stations + engineering BOM (fresh import)

To clear **all stations** and **engineering BOM** data (parts, BOM lines, import
batches) while keeping models, colors, work areas, vehicles, and missing-parts
records, run once in the Supabase SQL Editor:

`supabase/migrations/0033_wipe_stations_and_bom.sql`

Then re-import stations from **Settings → Stations** and BOM from **Settings → BOM**.

### Key tables

`profiles`, `production_orders`, `vehicles`, `items`, `warehouses`,
`inventory_stock`, `bom_lines`, `missing_parts`, `stock_movements`,
`qc_inspections`, `qc_defects`, `missing_part_comments`, `attachments`,
`audit_log`, plus the existing settings tables (`vehicle_models`, `work_areas`,
`stations`, `vehicle_colors`).

> The legacy `delayed_cars` table and its components remain in the repo for
> reference but are no longer wired into the app.

Vercel redeploy trigger