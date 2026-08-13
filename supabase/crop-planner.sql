-- Run this once in the Supabase SQL Editor after schema.sql.
alter table public.crop_batches
  add column if not exists variety text,
  add column if not exists bed text,
  add column if not exists area numeric,
  add column if not exists plants integer,
  add column if not exists expected_harvest_on date,
  add column if not exists responsible_member text,
  add column if not exists note text;

create table if not exists public.crop_tasks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  batch_id uuid not null references public.crop_batches(id) on delete cascade,
  task_type text not null,
  due_on date not null,
  responsible_member text,
  instruction text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.crop_tasks enable row level security;
create policy "farm members access crop tasks" on public.crop_tasks for all
  using (public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));
