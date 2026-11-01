CREATE TABLE IF NOT EXISTS records (
 id text PRIMARY KEY, organization_id text NOT NULL, student_id text NOT NULL,
 kind text NOT NULL, version integer NOT NULL DEFAULT 1, data jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS records_scope ON records(organization_id,student_id,kind);
CREATE TABLE IF NOT EXISTS demo_sessions(token text PRIMARY KEY, identity jsonb NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS commands (key text PRIMARY KEY, organization_id text NOT NULL, student_id text NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL);
CREATE ROLE app_reader NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO app_reader;
GRANT SELECT,INSERT,UPDATE,DELETE ON records TO app_reader;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE records FORCE ROW LEVEL SECURITY;
CREATE POLICY scope_records ON records FOR ALL TO app_reader
 USING (organization_id=current_setting('app.organization_id',true) AND student_id=current_setting('app.student_id',true))
 WITH CHECK (organization_id=current_setting('app.organization_id',true) AND student_id=current_setting('app.student_id',true));
-- Demo uses transaction-scoped role switching. Live DB credentials, domain-specific
-- normalized tables, identity provider migrations and privileges require separate approval.
