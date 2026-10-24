REVOKE UPDATE ON public.leaks FROM authenticated;
GRANT UPDATE(status) ON public.leaks TO authenticated;
CREATE FUNCTION public.enforce_leak_status_only() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user IN ('authenticated','anon') AND (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN
  RAISE EXCEPTION 'Only leak status can be changed' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER enforce_leak_status_only BEFORE UPDATE ON public.leaks FOR EACH ROW EXECUTE FUNCTION public.enforce_leak_status_only();