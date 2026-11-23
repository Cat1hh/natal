-- Executado pelo inicializador como proprietário do banco.
\getenv api_password NATAL_API_PASSWORD
BEGIN;
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='natal_service') THEN CREATE ROLE natal_service NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='natal_gateway') THEN CREATE ROLE natal_gateway LOGIN NOINHERIT; END IF;
END $roles$;
SELECT format('ALTER ROLE natal_gateway PASSWORD %L', :'api_password') \gexec
GRANT natal_service TO natal_gateway;
GRANT USAGE ON SCHEMA public TO natal_service;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO natal_service;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO natal_service;
GRANT EXECUTE ON FUNCTION public.admin_moderate_item(text,bigint,text,text,text,integer[]) TO natal_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO natal_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO natal_service;
DO $policies$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['community_staff','community_events','admin_audit_log'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS backend_access ON public.%I',t);
    EXECUTE format('CREATE POLICY backend_access ON public.%I TO natal_service USING (true) WITH CHECK (true)',t);
  END LOOP;
END $policies$;
NOTIFY pgrst, 'reload schema';
COMMIT;
