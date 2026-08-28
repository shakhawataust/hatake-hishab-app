-- Run this once in the Supabase SQL Editor after schema.sql, member-management.sql,
-- pending-member-invites.sql, crop-planner.sql, cash-handovers.sql and
-- view-only-role.sql.
--
-- Lets a member who forgot their password set a new one on the spot, from the
-- sign-in screen, with no email step. The project has no SMTP sender, and
-- Supabase's built-in one only delivers to the project owner's own address, so
-- the emailed reset link left the rest of the farm with no way back into their
-- accounts.
--
-- READ THIS BEFORE RUNNING IT. Knowing a member's email address is enough to set
-- that member's password: there is no second proof of identity, because there is
-- no channel to send one over. Anyone who learns an address can take over that
-- account and see or change the farm's money records. What the function does do:
--   * it only touches accounts that already belong to a farm, so the sign-up
--     table is not a list of resettable strangers,
--   * it signs out every device that account was signed in on, so a reset cannot
--     go unnoticed by whoever was using it,
--   * it writes a row per reset into public.password_resets, which the farm's
--     admins can read, so there is a record of every use.
-- Configure SMTP and go back to emailed reset links when the farm outgrows this.
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists password_resets_email_idx
  on public.password_resets (email, created_at desc);

alter table public.password_resets enable row level security;

-- Rows are written only inside the security-definer function below, so nobody
-- needs insert rights. An admin can read the resets of the members they share a
-- farm with, and no one else's.
drop policy if exists "farm admins read password resets" on public.password_resets;
create policy "farm admins read password resets" on public.password_resets
  for select using (
    exists (
      select 1
      from public.farm_members reset_member
      join public.farm_members reader
        on reader.farm_id = reset_member.farm_id
      where reset_member.user_id = password_resets.user_id
        and reader.user_id = auth.uid()
        and reader.role = 'admin'
    )
  );

-- extensions holds pgcrypto on Supabase. crypt() with a bcrypt salt writes the
-- same $2a$ hash format the auth service reads, so the new password works on the
-- normal sign-in path straight away.
create or replace function public.reset_forgotten_password(
  member_email text,
  new_password text
) returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  clean_email text := lower(trim(member_email));
  target_id uuid;
  recent_resets integer;
begin
  if length(coalesce(new_password, '')) < 8 then
    raise exception 'Choose a password of at least 8 characters.';
  end if;

  select id into target_id
  from auth.users
  where lower(email) = clean_email and deleted_at is null;

  -- Accounts outside every farm are left alone: a stranger who signed up but was
  -- never added to the farm has nothing here to protect and no reason to reset.
  if target_id is null or not exists (
    select 1 from public.farm_members where user_id = target_id
  ) then
    raise exception 'No farm member uses that email address.';
  end if;

  select count(*) into recent_resets
  from public.password_resets
  where email = clean_email and created_at > now() - interval '1 hour';
  if recent_resets >= 5 then
    raise exception 'That address has been reset too many times in the past hour. Try again later.';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(
        new_password,
        extensions.gen_salt('bf', 10)
      ),
      updated_at = now()
  where id = target_id;

  -- Whoever was signed in on another device is signed out, so the old password
  -- holder loses access at the moment someone resets it.
  delete from auth.sessions where user_id = target_id;
  delete from auth.refresh_tokens where user_id = target_id::text;

  insert into public.password_resets (email, user_id)
  values (clean_email, target_id);

  return 'Password set. Sign in with the new one.';
end;
$$;

-- Postgres hands every new function to PUBLIC, so take that back first and then
-- name the two roles meant to have it. anon is one of them: the member asking is
-- on the sign-in screen and not signed in.
revoke execute on function public.reset_forgotten_password(text, text) from public;
grant execute on function public.reset_forgotten_password(text, text) to anon;
grant execute on function public.reset_forgotten_password(text, text) to authenticated;
