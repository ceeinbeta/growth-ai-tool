ALTER TABLE public.products ADD COLUMN tracking_key text NOT NULL DEFAULT ('gl_' || encode(gen_random_bytes(18),'hex'));
CREATE UNIQUE INDEX products_tracking_key_unique ON public.products(tracking_key);
CREATE TABLE public.events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, visitor_id text NOT NULL, name text NOT NULL, path text NOT NULL, referrer_host text, utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text, first_touch_source text, first_touch_medium text, first_touch_campaign text, first_touch_referrer_host text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read events" ON public.events FOR SELECT TO authenticated USING(public.can_access_product(product_id));
CREATE INDEX events_product_created ON public.events(product_id,created_at);
CREATE INDEX events_visitor_created ON public.events(visitor_id,created_at);
CREATE TABLE public.tracking_event_names(product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,name text NOT NULL,PRIMARY KEY(product_id,name));
GRANT ALL ON public.tracking_event_names TO service_role;
ALTER TABLE public.tracking_event_names ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.collect_tracking_event(pid uuid, payload jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v text:=payload->>'visitor_id'; n text:=payload->>'name';
BEGIN
PERFORM pg_advisory_xact_lock(hashtextextended(v,0));
PERFORM 1 FROM public.products WHERE id=pid FOR UPDATE;
IF NOT FOUND THEN RETURN false; END IF;
IF (SELECT count(*) FROM public.events WHERE visitor_id=v AND created_at>now()-interval '1 minute')>=60 OR (SELECT count(*) FROM public.events WHERE product_id=pid AND created_at>now()-interval '1 hour')>=5000 THEN RETURN false; END IF;
IF n<>'pageview' THEN
 IF NOT EXISTS(SELECT 1 FROM public.tracking_event_names WHERE product_id=pid AND name=n) THEN
  IF (SELECT count(*) FROM public.tracking_event_names WHERE product_id=pid)>=20 THEN RETURN false; END IF;
  INSERT INTO public.tracking_event_names(product_id,name) VALUES(pid,n);
 END IF;
END IF;
INSERT INTO public.events(product_id,visitor_id,name,path,referrer_host,utm_source,utm_medium,utm_campaign,utm_term,utm_content,first_touch_source,first_touch_medium,first_touch_campaign,first_touch_referrer_host) VALUES(pid,v,n,payload->>'path',payload->>'referrer_host',payload->>'utm_source',payload->>'utm_medium',payload->>'utm_campaign',payload->>'utm_term',payload->>'utm_content',payload->>'first_touch_source',payload->>'first_touch_medium',payload->>'first_touch_campaign',payload->>'first_touch_referrer_host');
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.collect_tracking_event(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.collect_tracking_event(uuid,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.tracking_summary(pid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
WITH recent AS (SELECT * FROM public.events WHERE product_id=pid AND created_at>=now()-interval '7 days'), sources AS (SELECT coalesce(nullif(first_touch_source,''),nullif(first_touch_referrer_host,''),'Direct / unknown') source,count(*) count FROM recent WHERE name='pageview' GROUP BY 1 ORDER BY 2 DESC,1 LIMIT 5)
SELECT jsonb_build_object('visits',(SELECT count(*) FROM recent WHERE name='pageview'),'visitors',(SELECT count(DISTINCT visitor_id) FROM recent),'signups',(SELECT count(*) FROM recent WHERE name='signup'),'waitlist',(SELECT count(*) FROM recent WHERE name='joined_waitlist'),'sources',coalesce((SELECT jsonb_agg(sources) FROM sources),'[]'::jsonb)); $$;
REVOKE ALL ON FUNCTION public.tracking_summary(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tracking_summary(uuid) TO authenticated;
DO $$ DECLARE t record; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM anon, authenticated',t.tablename); EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon',t.tablename); END LOOP; END $$;
REVOKE INSERT,UPDATE,DELETE ON public.ai_usage,public.profile_runs,public.profile_ai_state FROM authenticated;