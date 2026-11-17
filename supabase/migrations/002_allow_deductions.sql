-- Allow deductions: a payment row with a negative amount reduces the balance.
-- Deductions are created only from the Settings page ("Reduce balance").
-- Idempotent: safe to re-run.

alter table public.payments drop constraint if exists payments_amount_check;
alter table public.payments drop constraint if exists payments_amount_nonzero;
alter table public.payments add constraint payments_amount_nonzero check (amount <> 0);
