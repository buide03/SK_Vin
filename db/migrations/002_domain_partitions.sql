-- Shared envelope columns and physical domain tables, without a second copy of sensitive data.
ALTER TABLE records RENAME TO records_legacy;
CREATE TABLE records (
 id text NOT NULL, organization_id text NOT NULL, student_id text NOT NULL,
 kind text NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 data jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(id,kind)
) PARTITION BY LIST(kind);
CREATE TABLE organizations PARTITION OF records FOR VALUES IN ('organization');
CREATE TABLE users PARTITION OF records FOR VALUES IN ('user');
CREATE TABLE memberships PARTITION OF records FOR VALUES IN ('membership');
CREATE TABLE counselor_assignments PARTITION OF records FOR VALUES IN ('assignment');
CREATE TABLE consent_records PARTITION OF records FOR VALUES IN ('consent');
CREATE TABLE group_definitions PARTITION OF records FOR VALUES IN ('group_definition');
CREATE TABLE indicators PARTITION OF records FOR VALUES IN ('indicator');
CREATE TABLE question_bank PARTITION OF records FOR VALUES IN ('question');
CREATE TABLE sources PARTITION OF records FOR VALUES IN ('source');
CREATE TABLE knowledge_entries PARTITION OF records FOR VALUES IN ('knowledge','content_draft');
CREATE TABLE strategy_templates PARTITION OF records FOR VALUES IN ('strategy');
CREATE TABLE conversation_sessions PARTITION OF records FOR VALUES IN ('session');
CREATE TABLE observation_proposals PARTITION OF records FOR VALUES IN ('proposal');
CREATE TABLE observations PARTITION OF records FOR VALUES IN ('observation');
CREATE TABLE assessment_snapshots PARTITION OF records FOR VALUES IN ('snapshot');
CREATE TABLE action_plans PARTITION OF records FOR VALUES IN ('plan','plan_history');
CREATE TABLE action_items PARTITION OF records FOR VALUES IN ('action_item');
CREATE TABLE check_ins PARTITION OF records FOR VALUES IN ('checkin');
CREATE TABLE support_requests PARTITION OF records FOR VALUES IN ('support_request');
CREATE TABLE review_notes PARTITION OF records FOR VALUES IN ('review_note');
CREATE TABLE audit_events PARTITION OF records FOR VALUES IN ('audit');
CREATE TABLE record_metadata PARTITION OF records DEFAULT;
INSERT INTO records SELECT * FROM records_legacy;
DROP TABLE records_legacy;
CREATE INDEX records_scope ON records(organization_id,student_id,kind);
CREATE UNIQUE INDEX observation_current_period ON observations(organization_id,student_id,(data->>'indicator_id'),(data->>'period_end')) WHERE data->>'current'='true';
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE records FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON records TO app_reader;
CREATE POLICY scope_records ON records FOR ALL TO app_reader
 USING (organization_id=current_setting('app.organization_id',true) AND student_id=current_setting('app.student_id',true))
 WITH CHECK (organization_id=current_setting('app.organization_id',true) AND student_id=current_setting('app.student_id',true));
DO $$ DECLARE part record; BEGIN
 FOR part IN SELECT inhrelid::regclass AS name FROM pg_inherits WHERE inhparent='records'::regclass LOOP
 EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',part.name);
 EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY',part.name);
 -- Direct access to child tables is intentionally not granted to app_reader.
 END LOOP;
END $$;
