# Assembly Line Tracking System (AFA ERP)

Arabic-first factory ERP for automotive assembly: production, missing parts, productivity, planning, engineering (BOM / line balancing), warehouses, quality, HR, and training — built with **React 19**, **Vite**, **Tailwind CSS**, and **Supabase**.

Production URL example: [delayed-cars-follow-up.vercel.app](https://delayed-cars-follow-up.vercel.app)

---

## Modules

| Area | Highlights |
|------|------------|
| **Production** | Home dashboard, missing parts (list / cards / archive / bulk actions), productivity, damaged parts, missions, requests, scratches, equipment, feedback |
| **Planning** | Production plan, work days, tracking, orders |
| **Engineering** | IPL / BOM, line balancing, time study, SOP |
| **Warehouses** | Feeding, equipment, inventory flows |
| **Quality** | Quality notes & records |
| **HR** | Attendance-oriented pages (scoped by permissions) |
| **Training** | Skills matrix, expiry dashboard, qualifications |
| **Settings** | Factory org, models, stations, colors, helper lists (reason / department lookups), users & permissions |

RTL Arabic is the default UI; English is available from the header toggle. Installable as a **PWA** on mobile and desktop.

---

## Prerequisites

- **Node.js** 20+ (CI uses 22)
- **Supabase** project with migrations applied
- **npm** (lockfile: `package-lock.json`)

---

## Run locally

```bash
npm install
cp .env.example .env.local
# Edit .env.local — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Open `http://localhost:5173`.

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Typecheck (`tsc -b`) + production build |
| `npm run preview` | Preview production build |
| `npm run test` | Vitest (watch) |
| `npm run test:run` | Vitest once (CI) |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check (CI) |
| `npm run check` | Full local CI (lint + format + test + build) |
| `npm run latency` | Boot latency check (needs env credentials) |

---

## Environment variables

Create `.env.local` from `.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `VITE_SENTRY_DSN` | No | Sentry error reporting |
| `VITE_SENTRY_ENVIRONMENT` | No | e.g. `production` |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | No | Default `0.1` |
| `VITE_SENTRY_ENABLED` | No | Set `true` to enable Sentry in dev |

Never commit `.env.local` or secrets.

---

## Database migrations

Business rules (VIN immutability, stock guards, QC gates, permissions) live in **PostgreSQL**, not only in the browser.

There are **140+** ordered SQL files in `supabase/migrations/`. Apply them **in numeric order** on a fresh Supabase project:

1. Supabase Dashboard → **SQL Editor**
2. Run each file from `0001_…` through the latest (`0141_…` and up)
3. Or use Supabase CLI if you maintain a linked project

After migrations, promote your first admin (custom app auth uses `profiles`):

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

**Note:** Some migration numbers appear twice (e.g. two `0115_*` files). Apply **both** files with that prefix; order within the same number should follow filename semantics or project history.

### Edge functions (auth)

Login/session refresh uses `supabase/functions/app-auth`. Deploy after pulling auth changes:

```bash
supabase functions deploy app-auth
```

Required secrets on Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and JWT secret (`SUPABASE_JWT_SECRET` or equivalent — see function code).

Optional: `supabase functions deploy admin-users` for admin user management fallback.

---

## Auth & permissions

- **Login:** email + password via `app-auth` edge function (fallback: Supabase Auth GoTrue)
- **Session:** stored in `localStorage`, auto-refresh on interval and when the tab regains focus
- **Roles:** legacy `profiles.role` plus **system roles** and a granular **permission matrix** (page / tab / action)
- **Settings → Users & Permissions:** manage accounts and overrides (admin only)

---

## Deploy on Vercel

1. Push the repo to GitHub.
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework: **Vite**. Build: `npm run build`. Output: `dist`.
4. Environment variables (Production + Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Optional Sentry vars
5. Deploy. SPA routing uses `vercel.json` rewrites.

CLI:

```bash
npx vercel --prod
```

---

## CI (GitHub Actions)

On every **push** and **pull request**, `.github/workflows/ci.yml` runs:

1. `npm ci`
2. `npm run lint`
3. `npm run format:check`
4. `npm run build`
5. `npm run test:run`

Fix locally before pushing:

```bash
npm run lint:fix && npm run format && npm run build && npm run test:run
```

---

## Architecture (short)

```
Browser (React)
  → Context (Auth, Permissions, Navigation)
  → hooks
  → services (src/services/*)
  → Supabase (RLS tables + SECURITY DEFINER RPCs)
```

Navigation is **in-app state** (`NavigationContext`), not URL routes — deep linking is limited by design today.

Key folders:

- `src/Pages/` — department pages
- `src/Components/` — UI by feature
- `src/services/` — Supabase API layer
- `src/config/` — page access & permission tree
- `supabase/migrations/` — schema and RPCs

Legacy **delayed cars** mock/context files remain for reference but are not part of the main app flow.

---

## PWA / mobile

- Responsive layout, 44px touch targets, safe-area insets
- **Install** from browser menu or the header install button (when supported)
- Service worker caches static assets; **data requires network** (no offline mutation queue yet)

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| White screen after edit | Hard refresh `Ctrl+Shift+R` or restart `npm run dev` |
| “Session expired” | Log in again; ensure `app-auth` is deployed and network is stable |
| “Supabase not configured” | Check `.env.local` and restart dev server |
| Missing tables / RPC errors | Apply pending migrations in order |
| CI fails on lint/format | Run `npm run lint:fix` and `npm run format` locally |

---

## License

Private / internal project — see repository owner for usage terms.
