-- Run this once in the Supabase SQL Editor after schema.sql, member-management.sql,
-- pending-member-invites.sql, crop-planner.sql and cash-handovers.sql.
--
-- Adds a "viewer" role: the member sees every page and report of the farm and
-- can write nothing. The earlier files gave every member one "for all" policy
-- per table, which grants insert, update and delete along with select. Here each
-- of those is split into a read policy every member keeps and write policies
-- only non-viewers get, so a viewer account is read-only in the database and not
-- merely in the interface.
alter type public.member_role add value if not exists 'viewer';

-- role::text keeps this function creatable in the same transaction as the
-- ALTER TYPE above: comparing as text needs no 'viewer' enum literal, which
-- Postgres would refuse to resolve until the transaction commits.
create or replace function public.can_edit_farm(target_farm uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.farm_members
    where farm_id = target_farm
      and user_id = auth.uid()
      and role::text <> 'viewer'
  )
$$;

grant execute on function public.can_edit_farm(uuid) to authenticated;

-- transactions: expenses, sales, harvest and labor rows.
drop policy if exists "farm members access transactions" on public.transactions;
create policy "farm members read transactions" on public.transactions
  for select using (public.is_farm_member(farm_id));
create policy "farm editors insert transactions" on public.transactions
  for insert with check (public.can_edit_farm(farm_id));
create policy "farm editors update transactions" on public.transactions
  for update using (public.can_edit_farm(farm_id))
  with check (public.can_edit_farm(farm_id));
create policy "farm editors delete transactions" on public.transactions
  for delete using (public.can_edit_farm(farm_id));

-- crop_batches
drop policy if exists "farm members access batches" on public.crop_batches;
create policy "farm members read batches" on public.crop_batches
  for select using (public.is_farm_member(farm_id));
create policy "farm editors insert batches" on public.crop_batches
  for insert with check (public.can_edit_farm(farm_id));
create policy "farm editors update batches" on public.crop_batches
  for update using (public.can_edit_farm(farm_id))
  with check (public.can_edit_farm(farm_id));
create policy "farm editors delete batches" on public.crop_batches
  for delete using (public.can_edit_farm(farm_id));

-- crop_tasks
drop policy if exists "farm members access crop tasks" on public.crop_tasks;
create policy "farm members read crop tasks" on public.crop_tasks
  for select using (public.is_farm_member(farm_id));
create policy "farm editors insert crop tasks" on public.crop_tasks
  for insert with check (public.can_edit_farm(farm_id));
create policy "farm editors update crop tasks" on public.crop_tasks
  for update using (public.can_edit_farm(farm_id))
  with check (public.can_edit_farm(farm_id));
create policy "farm editors delete crop tasks" on public.crop_tasks
  for delete using (public.can_edit_farm(farm_id));

-- cash_handovers
drop policy if exists "farm members access cash handovers" on public.cash_handovers;
create policy "farm members read cash handovers" on public.cash_handovers
  for select using (public.is_farm_member(farm_id));
create policy "farm editors insert cash handovers" on public.cash_handovers
  for insert with check (public.can_edit_farm(farm_id));
create policy "farm editors update cash handovers" on public.cash_handovers
  for update using (public.can_edit_farm(farm_id))
  with check (public.can_edit_farm(farm_id));
create policy "farm editors delete cash handovers" on public.cash_handovers
  for delete using (public.can_edit_farm(farm_id));

-- inventory_items
drop policy if exists "farm members access inventory" on public.inventory_items;
create policy "farm members read inventory" on public.inventory_items
  for select using (public.is_farm_member(farm_id));
create policy "farm editors insert inventory" on public.inventory_items
  for insert with check (public.can_edit_farm(farm_id));
create policy "farm editors update inventory" on public.inventory_items
  for update using (public.can_edit_farm(farm_id))
  with check (public.can_edit_farm(farm_id));
create policy "farm editors delete inventory" on public.inventory_items
  for delete using (public.can_edit_farm(farm_id));

-- orders
drop policy if exists "farm members access orders" on public.orders;
create policy "farm members read orders" on public.orders
  for select using (public.is_farm_member(farm_id));
create policy "farm editors insert orders" on public.orders
  for insert with check (public.can_edit_farm(farm_id));
create policy "farm editors update orders" on public.orders
  for update using (public.can_edit_farm(farm_id))
  with check (public.can_edit_farm(farm_id));
create policy "farm editors delete orders" on public.orders
  for delete using (public.can_edit_farm(farm_id));

-- receipts and their stored files
drop policy if exists "farm members access receipts" on public.receipts;
create policy "farm members read receipts" on public.receipts
  for select using (public.is_farm_member(farm_id));
create policy "farm editors insert receipts" on public.receipts
  for insert with check (public.can_edit_farm(farm_id));
create policy "farm editors update receipts" on public.receipts
  for update using (public.can_edit_farm(farm_id))
  with check (public.can_edit_farm(farm_id));
create policy "farm editors delete receipts" on public.receipts
  for delete using (public.can_edit_farm(farm_id));

drop policy if exists "farm members upload receipt objects" on storage.objects;
create policy "farm editors upload receipt objects" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and public.can_edit_farm((storage.foldername(name))[1]::uuid)
  );
