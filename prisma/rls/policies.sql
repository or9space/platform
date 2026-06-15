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

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON inventory_items;
CREATE POLICY tenant_isolation ON inventory_items
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE inventory_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_holdings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON inventory_holdings;
CREATE POLICY tenant_isolation ON inventory_holdings
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE fleet_ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_ships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON fleet_ships;
CREATE POLICY tenant_isolation ON fleet_ships
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tournaments;
CREATE POLICY tenant_isolation ON tournaments
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_entries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tournament_entries;
CREATE POLICY tenant_isolation ON tournament_entries
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON events;
CREATE POLICY tenant_isolation ON events
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON event_rsvps;
CREATE POLICY tenant_isolation ON event_rsvps
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_posts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON news_posts;
CREATE POLICY tenant_isolation ON news_posts
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON operations;
CREATE POLICY tenant_isolation ON operations
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE operation_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_signups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON operation_signups;
CREATE POLICY tenant_isolation ON operation_signups
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON resources;
CREATE POLICY tenant_isolation ON resources
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE lfg_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lfg_posts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON lfg_posts;
CREATE POLICY tenant_isolation ON lfg_posts
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON alliances;
CREATE POLICY tenant_isolation ON alliances
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON awards;
CREATE POLICY tenant_isolation ON awards
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE member_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_awards FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON member_awards;
CREATE POLICY tenant_isolation ON member_awards
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON contracts;
CREATE POLICY tenant_isolation ON contracts
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON gallery_items;
CREATE POLICY tenant_isolation ON gallery_items
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON squads;
CREATE POLICY tenant_isolation ON squads
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON squad_members;
CREATE POLICY tenant_isolation ON squad_members
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON projects;
CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tickets;
CREATE POLICY tenant_isolation ON tickets
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON applications;
CREATE POLICY tenant_isolation ON applications
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON conversations;
CREATE POLICY tenant_isolation ON conversations
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON conversation_participants;
CREATE POLICY tenant_isolation ON conversation_participants
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON messages;
CREATE POLICY tenant_isolation ON messages
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
