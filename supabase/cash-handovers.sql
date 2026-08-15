-- Run this once in the Supabase SQL Editor after schema.sql.
-- A handover moves cash that is already recorded from one person to another
-- (member to member, or member to the bank). It is neither income nor an
-- expense, so it lives outside transactions and never changes profit or loss —
-- it only changes who is holding the money.
create table if not exists public.cash_handovers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  occurred_on date not null default current_date,
  from_holder text not null,
  to_holder text not null,
  amount numeric not null check (amount > 0),
  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  -- Money handed to yourself is a typo, not a handover.
  check (from_holder <> to_holder)
);

alter table public.cash_handovers enable row level security;
create policy "farm members access cash handovers" on public.cash_handovers for all
  using (public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));
