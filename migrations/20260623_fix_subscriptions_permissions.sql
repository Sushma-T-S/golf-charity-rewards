-- Fix permissions for subscriptions table.
-- Run in Supabase SQL editor.

-- Ensure required extensions exist for UUID generation (safe no-op if already present).
create extension if not exists pgcrypto;

-- Grant privileges.
-- Supabase typically uses these roles:
--  - anon: public/anonymous
--  - authenticated: logged-in users
--  - service_role: backend using service key (role name may differ / may not exist)
--
-- Grant defensively to all likely roles + PUBLIC so service-key connections can't hit
-- "permission denied for table".

-- Base roles (guard grants so script is idempotent across environments).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select, insert, update, delete on table public.subscriptions to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on table public.subscriptions to authenticated;
  end if;

  -- Some projects use different admin role names; cover common ones.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on table public.subscriptions to service_role;
  end if;

  -- Your current error explicitly recommends granting to service_role.
  -- Ensure the service_role role exists and receives privileges.
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise notice 'WARNING: service_role role not found in this project; permission fixes may not apply.';
  end if;

  -- Additional likely roles/aliases.
  -- Depending on how Supabase is configured, the service key connection may be mapped to different DB roles.
  -- (We keep these idempotent and guarded with exists checks.)
  if exists (select 1 from pg_roles where rolname = 'postgres') then
    grant select, insert, update, delete on table public.subscriptions to postgres;
  end if;

  if exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    grant select, insert, update, delete on table public.subscriptions to supabase_admin;
  end if;

  -- Some Supabase projects map the service key to a role name like "authenticated" or "supabase_admin"
  -- instead of exactly "service_role"; cover a few common aliases.
  if exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    grant select, insert, update, delete on table public.subscriptions to supabase_admin;
  end if;
end $$;

-- PUBLIC is always present; include as a safety net.
grant select, insert, update, delete on table public.subscriptions to public;

-- Debug: show effective grants (useful when diagnosing which role the service key maps to).
do $$
begin
  raise notice '--- subscriptions privilege debug ---';
  raise notice 'current_user=%', current_user;

  for r in
    select rolname
    from pg_roles
    where rolname in ('anon','authenticated','service_role','supabase_admin')
  loop
    raise notice 'role=% select_priv=%',
      r.rolname,
      has_table_privilege(r.rolname, 'public.subscriptions', 'SELECT');
  end loop;
end $$;





-- If RLS is enabled, add policies for authenticated users.
-- Service role bypasses RLS by default, but we still set sane policies.


-- Create policies only if they don't already exist.
do $$
begin

  -- Enable RLS if not already enabled
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'subscriptions'
      and n.nspname = 'public'
      and c.relrowsecurity
  ) then
    alter table public.subscriptions enable row level security;
  end if;

  -- IMPORTANT:
  -- Our Next.js API uses `supabaseAdmin` with the service role key, which bypasses RLS.
  -- But in some Supabase setups, the service key may be mapped to a different role
  -- or RLS might still block operations if privileges/policies aren't aligned.
  -- Provide policies for BOTH authenticated users and (if present) service_role.


  -- SELECT policy (authenticated)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'subscriptions_select_own'
  ) then
    create policy subscriptions_select_own
      on public.subscriptions
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  -- INSERT policy (authenticated)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'subscriptions_insert_own'
  ) then
    create policy subscriptions_insert_own
      on public.subscriptions
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  -- UPDATE policy (authenticated)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'subscriptions_update_own'
  ) then
    create policy subscriptions_update_own
      on public.subscriptions
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  -- DELETE policy (authenticated)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'subscriptions_delete_own'
  ) then
    create policy subscriptions_delete_own
      on public.subscriptions
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;

-- Service role policies (belt-and-suspenders)
  -- Important: your Supabase admin connection might not map to a role literally named `service_role`.
  -- Add the same allow-all policies for common service-key role aliases as well.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'subscriptions'
        and policyname = 'subscriptions_service_role_all'
    ) then
      create policy subscriptions_service_role_all
        on public.subscriptions
        for all
        to service_role
        using (true)
        with check (true);
    end if;
  end if;

  if exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'subscriptions'
        and policyname = 'subscriptions_supabase_admin_all'
    ) then
      create policy subscriptions_supabase_admin_all
        on public.subscriptions
        for all
        to supabase_admin
        using (true)
        with check (true);
    end if;
  end if;

  -- postgres superuser connections (some setups may map service key differently)
  if exists (select 1 from pg_roles where rolname = 'postgres') then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'subscriptions'
        and policyname = 'subscriptions_postgres_all'
    ) then
      create policy subscriptions_postgres_all
        on public.subscriptions
        for all
        to postgres
        using (true)
        with check (true);
    end if;
  end if;

  -- Some projects map the service key to `authenticated`.
  -- Ensure it can do full CRUD even if RLS is enabled.
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'subscriptions'
        and policyname = 'subscriptions_authenticated_full'
    ) then
      create policy subscriptions_authenticated_full
        on public.subscriptions
        for all
        to authenticated
        using (true)
        with check (true);
    end if;
  end if;
end $$;

