-- Creates the runtime application role. Run as a superuser via
-- `pnpm db:setup-rls` after migrations. Idempotent.
-- The app's DATABASE_URL should authenticate as app_user in production;
-- migrations keep using the superuser (DIRECT_URL).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    EXECUTE format('CREATE ROLE app_user LOGIN PASSWORD %L', current_setting('app.bootstrap_password', true));
  END IF;
END
$$;

GRANT CONNECT ON DATABASE CURRENT_DATABASE TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
