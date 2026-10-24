CREATE TABLE public.funnel_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 position int NOT NULL CHECK(position BETWEEN 1 AND 6), label text NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 120),
 kind text NOT NULL CHECK(kind IN ('page','event')), match text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(product_id,position),
 CHECK((kind='event' AND match ~ '^[a-z][a-z0-9_]{0,31}$') OR (kind='page' AND (match='*' OR (match ~ '^/[^?#]*$' AND match !~ '\*.' AND length(match)<=500))))
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.funnel_steps TO authenticated;
GRANT ALL ON public.funnel_steps TO service_role;
ALTER TABLE public.funnel_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage funnel steps" ON public.funnel_steps FOR ALL TO authenticated USING(public.can_access_product(product_id)) WITH CHECK(public.can_access_product(product_id));
CREATE FUNCTION public.validate_funnel_steps() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.products WHERE id=NEW.product_id FOR UPDATE;
 IF TG_OP='INSERT' OR NEW.product_id<>OLD.product_id THEN
  IF (SELECT count(*) FROM public.funnel_steps WHERE product_id=NEW.product_id)>=6 THEN RAISE EXCEPTION 'funnel_step_limit_reached'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_funnel_steps BEFORE INSERT OR UPDATE ON public.funnel_steps FOR EACH ROW EXECUTE FUNCTION public.validate_funnel_steps();
CREATE FUNCTION public.replace_funnel_steps(pid uuid, steps jsonb) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT public.can_access_product(pid) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF jsonb_typeof(steps)<>'array' OR jsonb_array_length(steps)>6 THEN RAISE EXCEPTION 'funnel_step_limit_reached'; END IF;
 PERFORM 1 FROM public.products WHERE id=pid FOR UPDATE;
 DELETE FROM public.funnel_steps WHERE product_id=pid;
 INSERT INTO public.funnel_steps(product_id,position,label,kind,match)
 SELECT pid, ordinality::int, value->>'label', value->>'kind', value->>'match' FROM jsonb_array_elements(steps) WITH ORDINALITY;
END; $$;
REVOKE ALL ON FUNCTION public.replace_funnel_steps(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_funnel_steps(uuid,jsonb) TO authenticated,service_role;
CREATE FUNCTION public.funnel_summary(pid uuid, days int DEFAULT 30) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH RECURSIVE saved AS (SELECT position,label,kind,match FROM public.funnel_steps WHERE product_id=pid),
 steps AS (
 SELECT position,label,kind,match FROM saved
 UNION ALL SELECT 1,'Visited your site','page','*' WHERE NOT EXISTS(SELECT 1 FROM saved)
 UNION ALL SELECT 2,CASE WHEN (SELECT stage FROM public.products WHERE id=pid)='prelaunch' THEN 'Joined the waitlist' ELSE 'Signed up' END,'event',CASE WHEN (SELECT stage FROM public.products WHERE id=pid)='prelaunch' THEN 'joined_waitlist' ELSE 'signup' END WHERE NOT EXISTS(SELECT 1 FROM saved)
 ), ordered AS (SELECT *,row_number() OVER(ORDER BY position) AS n FROM steps),
 first_matches AS (
 SELECT s.n,e.visitor_id,min(e.created_at) AS first_at FROM ordered s JOIN public.events e ON e.product_id=pid
 AND e.created_at>=now()-make_interval(days=>CASE WHEN days IN(7,30,90) THEN days ELSE 30 END) AND e.created_at<=now()
 AND ((s.kind='event' AND e.name=s.match) OR (s.kind='page' AND e.name='pageview' AND (s.match='*' OR (right(s.match,1)='*' AND left(e.path,length(s.match)-1)=left(s.match,length(s.match)-1)) OR e.path=s.match)))
 GROUP BY s.n,e.visitor_id
 ), chain AS (
 SELECT n,visitor_id,first_at FROM first_matches WHERE n=1
 UNION ALL SELECT f.n,f.visitor_id,f.first_at FROM first_matches f JOIN chain c ON f.visitor_id=c.visitor_id AND f.n=c.n+1 AND f.first_at>=c.first_at
 ), counts AS (SELECT s.*,count(c.visitor_id) AS visitors FROM ordered s LEFT JOIN chain c ON c.n=s.n GROUP BY s.position,s.label,s.kind,s.match,s.n),
 rates AS (SELECT *,lag(visitors) OVER(ORDER BY n) AS previous,first_value(visitors) OVER(ORDER BY n) AS first FROM counts)
 SELECT jsonb_build_object('total_visitors',coalesce((SELECT visitors FROM rates WHERE n=1),0),'is_default',NOT EXISTS(SELECT 1 FROM saved),'steps',coalesce(jsonb_agg(jsonb_build_object('position',position,'label',label,'visitors',visitors,'rate_from_previous',CASE WHEN n=1 THEN 1 WHEN previous>0 THEN visitors::numeric/previous ELSE 0 END,'rate_from_first',CASE WHEN first>0 THEN visitors::numeric/first ELSE 0 END) ORDER BY n),'[]'::jsonb)) FROM rates;
$$;
REVOKE ALL ON FUNCTION public.funnel_summary(uuid,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.funnel_summary(uuid,int) TO authenticated,service_role;
CREATE TABLE public.audits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 page_copy jsonb NOT NULL, funnel_context jsonb NOT NULL, model text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,product_id)
);
GRANT SELECT ON public.audits TO authenticated;
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read audits" ON public.audits FOR SELECT TO authenticated USING(public.can_access_product(product_id));
CREATE TABLE public.leaks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), audit_id uuid NOT NULL, product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 area text NOT NULL, impact text NOT NULL CHECK(impact IN('high','medium','low')), issue text NOT NULL, fix text NOT NULL, rewrite text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'open' CHECK(status IN('open','doing','done','dismissed')), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(audit_id,product_id) REFERENCES public.audits(id,product_id) ON DELETE CASCADE
);
GRANT SELECT ON public.leaks TO authenticated;
GRANT UPDATE(status) ON public.leaks TO authenticated;
GRANT ALL ON public.leaks TO service_role;
ALTER TABLE public.leaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read leaks" ON public.leaks FOR SELECT TO authenticated USING(public.can_access_product(product_id));
CREATE POLICY "members update leak status" ON public.leaks FOR UPDATE TO authenticated USING(public.can_access_product(product_id)) WITH CHECK(public.can_access_product(product_id));
CREATE INDEX audits_product_created_idx ON public.audits(product_id,created_at DESC);
CREATE INDEX leaks_product_status_idx ON public.leaks(product_id,status);
CREATE TABLE public.audit_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.audit_runs TO service_role;
ALTER TABLE public.audit_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX audit_runs_created_idx ON public.audit_runs(created_at);
CREATE FUNCTION public.reserve_ai_run(pid uuid, feature text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid;
BEGIN
 IF feature NOT IN('profile-product','audit-page') THEN RAISE EXCEPTION 'invalid_feature'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('growloop:profile-reservation',0));
 PERFORM 1 FROM public.products WHERE id=pid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
 IF feature='profile-product' AND (SELECT count(*) FROM public.profile_runs WHERE product_id=pid AND created_at>now()-interval '24 hours')>=5 THEN RAISE EXCEPTION 'profile_run_limit_reached'; END IF;
 IF feature='audit-page' AND (SELECT count(*) FROM public.audit_runs WHERE product_id=pid AND created_at>now()-interval '24 hours')>=5 THEN RAISE EXCEPTION 'audit_run_limit_reached'; END IF;
 IF (SELECT count(*) FROM public.profile_runs WHERE created_at>now()-interval '24 hours')+(SELECT count(*) FROM public.audit_runs WHERE created_at>now()-interval '24 hours')>=100 THEN RAISE EXCEPTION 'platform_profile_run_limit_reached'; END IF;
 IF feature='profile-product' THEN INSERT INTO public.profile_runs(product_id) VALUES(pid) RETURNING id INTO rid;
 ELSE INSERT INTO public.audit_runs(product_id) VALUES(pid) RETURNING id INTO rid; END IF;
 RETURN rid;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_ai_run(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_run(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.reserve_profile_run(pid uuid) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT public.reserve_ai_run(pid,'profile-product'); $$;
REVOKE ALL ON FUNCTION public.reserve_profile_run(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_profile_run(uuid) TO service_role;
CREATE FUNCTION public.save_page_audit(pid uuid, copy jsonb, funnel jsonb, model_name text, findings jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE aid uuid;
BEGIN
 IF jsonb_typeof(findings)<>'array' OR jsonb_array_length(findings) NOT BETWEEN 3 AND 5 THEN RAISE EXCEPTION 'invalid_findings'; END IF;
 INSERT INTO public.audits(product_id,page_copy,funnel_context,model) VALUES(pid,copy,funnel,model_name) RETURNING id INTO aid;
 INSERT INTO public.leaks(audit_id,product_id,area,impact,issue,fix,rewrite) SELECT aid,pid,value->>'area',value->>'impact',value->>'issue',value->>'fix',coalesce(value->>'rewrite','') FROM jsonb_array_elements(findings);
 RETURN aid;
END; $$;
REVOKE ALL ON FUNCTION public.save_page_audit(uuid,jsonb,jsonb,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_page_audit(uuid,jsonb,jsonb,text,jsonb) TO service_role;
REVOKE ALL ON public.funnel_steps,public.audits,public.leaks,public.audit_runs FROM anon;
REVOKE TRUNCATE,REFERENCES,TRIGGER ON public.funnel_steps,public.audits,public.leaks,public.audit_runs FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.audits,public.audit_runs FROM authenticated;
REVOKE INSERT,DELETE ON public.leaks FROM authenticated;