\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.users(id,username,email) VALUES (910001,'Validação','validation@example.invalid');
INSERT INTO public.sessions(id,user_id,expires_at) VALUES ('validation-session',910001,9999999999999);
INSERT INTO public.submissions(id,user_id,day,proof,community) VALUES
 (920001,910001,1,'Prova de validação','heaven'),
 (920002,910001,2,'Prova de validação','heaven');
SET LOCAL ROLE natal_service;
DO $test$
DECLARE r jsonb; n integer;
BEGIN
  SELECT public.admin_moderate_item('submissions',920001,'thekingdom','approve','test',ARRAY[10,20]) INTO r;
  IF r->>'ok' <> 'false' THEN RAISE EXCEPTION 'Cross-community moderation accepted'; END IF;
  SELECT public.admin_moderate_item('submissions',920001,'heaven','approve','test',ARRAY[10,20]) INTO r;
  IF r->>'ok' <> 'true' THEN RAISE EXCEPTION 'Valid moderation failed'; END IF;
  SELECT points INTO n FROM public.completions WHERE user_id=910001 AND day=1 AND community='heaven';
  IF n IS DISTINCT FROM 10 THEN RAISE EXCEPTION 'Wrong points'; END IF;
  SELECT public.admin_moderate_item('submissions',920001,'heaven','approve','test',ARRAY[10,20]) INTO r;
  IF r->>'ok' <> 'false' THEN RAISE EXCEPTION 'Duplicate moderation accepted'; END IF;
  SELECT count(*) INTO n FROM public.admin_audit_log WHERE entity_type='submissions' AND entity_id='920001';
  IF n <> 1 THEN RAISE EXCEPTION 'Wrong audit count'; END IF;
  BEGIN
    PERFORM public.admin_moderate_item('submissions',920002,'heaven','approve','test',ARRAY[]::integer[]);
    RAISE EXCEPTION 'Missing points accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Invalid mission points' THEN RAISE; END IF;
  END;
  IF (SELECT status FROM public.submissions WHERE id=920002) <> 'pending' THEN RAISE EXCEPTION 'Failed transaction was not rolled back'; END IF;
  INSERT INTO public.community_staff(community_slug,user_id,role,updated_by) VALUES ('heaven','910001','editor','test');
  IF NOT EXISTS (SELECT FROM public.admin_audit_log WHERE entity_type='community_staff' AND entity_id='910001') THEN RAISE EXCEPTION 'Team change was not audited'; END IF;
END $test$;
RESET ROLE;
DO $test$
BEGIN
  IF has_table_privilege('natal_gateway','public.users','SELECT') THEN RAISE EXCEPTION 'Gateway can read without assuming service role'; END IF;
  IF has_function_privilege('natal_gateway','public.admin_moderate_item(text,bigint,text,text,text,integer[])','EXECUTE') THEN RAISE EXCEPTION 'RPC accessible without service role'; END IF;
END $test$;
ROLLBACK;
SELECT 'database_checks_passed' AS status;
