-- Run this once in the Supabase SQL Editor after schema.sql.
-- An admin can add an existing signed-up user to their farm by email.
alter type public.member_role add value if not exists 'sales';

create or replace function public.invite_farm_member(
  target_farm uuid,
  member_email text,
  desired_role public.member_role
) returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  member_id uuid;
begin
  if not exists (
    select 1 from public.farm_members
    where farm_id = target_farm and user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only a farm admin can add members.';
  end if;

  select id into member_id from auth.users where lower(email) = lower(trim(member_email));
  if member_id is null then
    raise exception 'This email has not created an account yet.';
  end if;

  insert into public.farm_members (farm_id, user_id, role)
  values (target_farm, member_id, desired_role)
  on conflict (farm_id, user_id) do update set role = excluded.role;

  return 'Member added.';
end;
$$;

grant execute on function public.invite_farm_member(uuid, text, public.member_role) to authenticated;
