-- Run this in Supabase SQL Editor. It creates the multi-tenant farm data model.
create type public.member_role as enum ('admin', 'accountant', 'field_member');
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text, created_at timestamptz not null default now());
create table public.farms (id uuid primary key default gen_random_uuid(), name text not null, owner_id uuid not null references public.profiles(id), created_at timestamptz not null default now());
create table public.farm_members (farm_id uuid references public.farms(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, role public.member_role not null default 'field_member', investment numeric not null default 0, profit_share numeric not null default 0 check (profit_share between 0 and 100), primary key (farm_id,user_id));
create table public.transactions (id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade, kind text not null check (kind in ('expense','sale','harvest','labor')), occurred_on date not null default current_date, crop text, amount numeric, quantity numeric, unit text, note text, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now());
create table public.crop_batches (id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade, code text not null, crop text not null, stage text not null, planted_on date, created_by uuid not null references public.profiles(id), unique(farm_id,code));
create table public.inventory_items (id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade, name text not null, category text, quantity numeric not null default 0, unit text not null default 'pcs');
create table public.orders (id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade, customer_name text not null, crop text, quantity numeric, status text not null default 'new', created_at timestamptz not null default now());
create table public.receipts (id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade, transaction_id uuid references public.transactions(id) on delete set null, storage_path text not null, uploaded_by uuid not null references public.profiles(id), created_at timestamptz not null default now());
create or replace function public.is_farm_member(target_farm uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.farm_members where farm_id=target_farm and user_id=auth.uid()) $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name','')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.create_farm(farm_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare new_farm uuid;
begin
  insert into public.farms(name,owner_id) values (farm_name,auth.uid()) returning id into new_farm;
  insert into public.farm_members(farm_id,user_id,role) values (new_farm,auth.uid(),'admin');
  return new_farm;
end; $$;
alter table public.profiles enable row level security; alter table public.farms enable row level security; alter table public.farm_members enable row level security; alter table public.transactions enable row level security; alter table public.crop_batches enable row level security; alter table public.inventory_items enable row level security; alter table public.orders enable row level security; alter table public.receipts enable row level security;
create policy "profile owner" on public.profiles for all using (id=auth.uid()) with check (id=auth.uid());
create policy "farm members read farms" on public.farms for select using (public.is_farm_member(id));
create policy "authenticated users create owned farms" on public.farms for insert with check (owner_id=auth.uid());
create policy "farm members access membership" on public.farm_members for select using (public.is_farm_member(farm_id));
create policy "farm members access transactions" on public.transactions for all using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));
create policy "farm members access batches" on public.crop_batches for all using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));
create policy "farm members access inventory" on public.inventory_items for all using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));
create policy "farm members access orders" on public.orders for all using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));
create policy "farm members access receipts" on public.receipts for all using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id));
insert into storage.buckets(id,name,public) values ('receipts','receipts',false) on conflict (id) do nothing;
create policy "farm members read receipt objects" on storage.objects for select using (bucket_id='receipts' and public.is_farm_member((storage.foldername(name))[1]::uuid));
create policy "farm members upload receipt objects" on storage.objects for insert with check (bucket_id='receipts' and public.is_farm_member((storage.foldername(name))[1]::uuid));
