# Lissy Kitchen — personal mess tracker

Track your mess meals and prepaid balance. Set a weekly routine once; meals are
marked eaten / not needed automatically when their time passes. Multi-user:
every account sees only its own data (Postgres Row Level Security).

## Rules
- **₹100 = 3 meals** (configurable in Settings). Balance is kept in meals; ₹250 = 7.5 meals.
- Each eaten meal uses 1 meal. Skipped meals cost nothing, so the balance simply lasts longer.
- Status of a meal = your exception for that date, else your weekly default.
- Past meals can be edited at any time; the balance recalculates (refund or charge).
- Changing the weekly default applies from today; past days keep their old schedule.

## Run
```bash
npm install
npm run db:migrate   # applies supabase/migrations/*.sql to DATABASE_URL
npm run dev          # http://localhost:5173
npm test             # ledger logic tests
```

`.env` (see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
and `DATABASE_URL` (used only by the migration script, never bundled).

## Supabase setup
Authentication → URL Configuration: set **Site URL** to your app URL
(`http://localhost:5173` while developing) and add `http://localhost:5173/**`
to **Redirect URLs**, so confirmation and password-reset emails link back here.

## Structure
- `src/lib/ledger.ts` — all meal-status and balance logic (pure, unit-tested)
- `src/context/DataContext.tsx` — loads data, optimistic updates
- `src/pages/` — Auth, Dashboard, Calendar, Payments, Settings
- `supabase/migrations/001_init.sql` — tables, RLS, signup trigger
