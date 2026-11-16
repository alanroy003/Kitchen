-- Lissy Kitchen: personal mess tracker schema.
-- Idempotent: safe to re-run.
--
-- Model
--   * Balance is kept in MEALS, not rupees. A payment of `amount` at `rate`
--     rupees per 3 meals credits amount * 3 / rate meals.
--   * Each meal (0 = breakfast, 1 = lunch, 2 = dinner) on a date is
--     "taken" or "skipped". Its status = override for that date, else the
--     weekly default pattern in force on that date.
--   * Once a meal's time passes it counts: taken -> consumed (1 meal used).
--     Overrides can still be changed afterwards; the balance recalculates.

-- ─── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text not null default '',
  timezone        text not null default 'Asia/Kolkata',
  start_date      date not null default current_date,
  breakfast_time  time not null default '08:00',
  lunch_time      time not null default '13:00',
  dinner_time     time not null default '20:00',
  rate            numeric(10,2) not null default 100 check (rate > 0), -- rupees per 3 meals
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── weekly default pattern, versioned so history never changes ─────────────
-- pattern: 21 booleans, index = weekday * 3 + meal, weekday 0 = Monday.
create table if not exists public.schedule_versions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  effective_from  date not null,
  pattern         boolean[] not null check (array_length(pattern, 1) = 21),
  created_at      timestamptz not null default now(),
  unique (user_id, effective_from)
);

-- ─── per-date exceptions ─────────────────────────────────────────────────────
create table if not exists public.meal_overrides (
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  meal        smallint not null check (meal between 0 and 2),
  status      text not null check (status in ('taken', 'skipped')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, date, meal)
);

-- ─── payments ────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  amount      numeric(10,2) not null check (amount > 0),
  rate        numeric(10,2) not null check (rate > 0),
  meals       numeric(12,4) generated always as (amount * 3 / rate) stored,
  paid_on     date not null default current_date,
  note        text not null default '' check (char_length(note) <= 200),
  created_at  timestamptz not null default now()
);

create index if not exists payments_user_idx on public.payments (user_id, paid_on desc);
create index if not exists overrides_user_idx on public.meal_overrides (user_id, date);

-- ─── Row Level Security: every row belongs to exactly one user ──────────────
alter table public.profiles          enable row level security;
alter table public.schedule_versions enable row level security;
alter table public.meal_overrides    enable row level security;
alter table public.payments          enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own schedule" on public.schedule_versions;
create policy "own schedule" on public.schedule_versions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own overrides" on public.meal_overrides;
create policy "own overrides" on public.meal_overrides
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Default user_id to the caller so the client never has to send it.
alter table public.schedule_versions alter column user_id set default auth.uid();
alter table public.meal_overrides    alter column user_id set default auth.uid();
alter table public.payments          alter column user_id set default auth.uid();

-- ─── updated_at bookkeeping ──────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists overrides_touch on public.meal_overrides;
create trigger overrides_touch before update on public.meal_overrides
  for each row execute function public.touch_updated_at();

-- ─── New user: create profile + an "every meal" default schedule ────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  insert into public.profiles (id, full_name, start_date)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), today)
  on conflict (id) do nothing;

  insert into public.schedule_versions (user_id, effective_from, pattern)
  values (new.id, '2000-01-01', array_fill(true, array[21]))
  on conflict (user_id, effective_from) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users who signed up before this migration existed.
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', '') from auth.users u
on conflict (id) do nothing;
insert into public.schedule_versions (user_id, effective_from, pattern)
select u.id, '2000-01-01', array_fill(true, array[21]) from auth.users u
on conflict (user_id, effective_from) do nothing;

-- ─── Grants (Supabase defaults usually cover these; explicit for clarity) ────
grant select, insert, update, delete on
  public.profiles, public.schedule_versions, public.meal_overrides, public.payments
  to authenticated;
revoke all on public.profiles, public.schedule_versions, public.meal_overrides, public.payments from anon;
