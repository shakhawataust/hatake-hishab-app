-- Run this once in the Supabase SQL Editor after schema.sql and member-management.sql.
-- Lets an admin add a member before that person has registered an account.
create table if not exists public.farm_member_invites (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'field_member',
  created_at timestamptz not null default now(),
  unique (farm_id, email)
);

alter table public.farm_member_invites enable row level security;

-- Writes happen only inside the security-definer functions below, so members
-- need read access and nothing more. Without a policy the table is invisible
-- to everyone and a farm's admin cannot see its own pending invites.
drop policy if exists "farm members read invites" on public.farm_member_invites;
create policy "farm members read invites" on public.farm_member_invites
  for select using (public.is_farm_member(farm_id));

create or replace function public.invite_or_add_farm_member(
  target_farm uuid,
  member_email text,
  desired_role public.member_role
) returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  existing_member_id uuid;
  clean_email text := lower(trim(member_email));
begin
  if not exists (
    select 1 from public.farm_members
    where farm_id = target_farm and user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only a farm admin can add members.';
  end if;

  select id into existing_member_id from auth.users where lower(email) = clean_email;
  if existing_member_id is not null then
    insert into public.farm_members (farm_id, user_id, role)
    values (target_farm, existing_member_id, desired_role)
    on conflict (farm_id, user_id) do update set role = excluded.role;
    return 'Member added to this farm.';
  end if;

  insert into public.farm_member_invites (farm_id, email, role)
  values (target_farm, clean_email, desired_role)
  on conflict (farm_id, email) do update set role = excluded.role, created_at = now();
  return 'Pending invitation saved. The member can now create their account.';
end;
$$;

create or replace function public.claim_pending_farm_invites()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  user_email text := lower(auth.jwt() ->> 'email');
  added_count integer := 0;
begin
  if user_email is null then return 0; end if;
  insert into public.farm_members (farm_id, user_id, role)
  select farm_id, auth.uid(), role
  from public.farm_member_invites
  where email = user_email
  on conflict (farm_id, user_id) do update set role = excluded.role;
  get diagnostics added_count = row_count;
  delete from public.farm_member_invites where email = user_email;
  return added_count;
end;
$$;

grant execute on function public.invite_or_add_farm_member(uuid, text, public.member_role) to authenticated;
grant execute on function public.claim_pending_farm_invites() to authenticated;
