-- Tenant-isolation RLS. Applied to every tenant-scoped table.
-- FORCE means even the table owner obeys (only superuser/BYPASSRLS skips).
-- app.tenant_id is set per-operation by lib/rls.ts via set_config(..., true)
-- (transaction-local). An unset/empty setting matches no rows.

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON memberships;
CREATE POLICY tenant_isolation ON memberships
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
CREATE POLICY tenant_isolation ON audit_logs
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Controlled cross-tenant read. The Q13 "one membership per account" guard is
-- inherently cross-tenant (it asks: does this account belong to ANY org?), which
-- RLS would otherwise hide. This SECURITY DEFINER function runs as the owner
-- (bypassing RLS) and exposes ONLY a single integer keyed by account_id — no row
-- data, no tenant enumeration. EXECUTE is granted to app_user only.
CREATE OR REPLACE FUNCTION account_membership_count(p_account_id text)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM memberships WHERE account_id = p_account_id;
$$;

REVOKE ALL ON FUNCTION account_membership_count(text) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT EXECUTE ON FUNCTION account_membership_count(text) TO app_user;
  END IF;
END
$$;

ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON forum_categories;
CREATE POLICY tenant_isolation ON forum_categories
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON forum_threads;
CREATE POLICY tenant_isolation ON forum_threads
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON forum_posts;
CREATE POLICY tenant_isolation ON forum_posts
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE treasury_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_entries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON treasury_entries;
CREATE POLICY tenant_isolation ON treasury_entries
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE loot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loot_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON loot_members;
CREATE POLICY tenant_isolation ON loot_members
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE loot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loot_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON loot_sessions;
CREATE POLICY tenant_isolation ON loot_sessions
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE loot_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE loot_attendance FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON loot_attendance;
CREATE POLICY tenant_isolation ON loot_attendance
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE loot_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loot_transactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON loot_transactions;
CREATE POLICY tenant_isolation ON loot_transactions
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE handbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE handbooks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON handbooks;
CREATE POLICY tenant_isolation ON handbooks
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE handbook_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE handbook_sections FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON handbook_sections;
CREATE POLICY tenant_isolation ON handbook_sections
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE handbook_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE handbook_acknowledgements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON handbook_acknowledgements;
CREATE POLICY tenant_isolation ON handbook_acknowledgements
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
