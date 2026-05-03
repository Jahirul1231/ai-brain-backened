-- Fix infinite recursion in profiles RLS policy.
-- The original policy did a subquery back into profiles to check tenant_id,
-- causing PostgreSQL to detect infinite recursion when evaluating the policy.
-- Fix: each user may only read/write their own profile row.

drop policy if exists "own_profile" on public.profiles;

create policy "own_profile" on public.profiles
  for all using (id = auth.uid());
