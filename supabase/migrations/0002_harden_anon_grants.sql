-- =====================================================================
-- 0002_harden_anon_grants.sql
-- Supabase grants anon/authenticated access to new objects in `public` by
-- default. Visitors who are not logged in (anon role) must not read anything.
--
-- Also: public_profiles is a plain view (owner rights, bypasses RLS) so it
-- must not be reachable by anon. Authenticated users may read it: it only
-- exposes id, full_name and avatar_path.
-- =====================================================================

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Functions are executable by PUBLIC by default in PostgreSQL.
revoke execute on all functions in schema public from public, anon;
grant  execute on all functions in schema public to authenticated, service_role;

-- Explicit read access for logged-in students to the public-safe view.
grant select on public_profiles to authenticated;
