DROP FUNCTION public.tracking_summary(uuid);
CREATE OR REPLACE FUNCTION public.tracking_summary(pid uuid, days int DEFAULT 7) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
WITH recent AS (SELECT * FROM public.events WHERE product_id=pid AND created_at>=now()-(days||' days')::interval),
previous AS (SELECT * FROM public.events WHERE product_id=pid AND created_at>=now()-(2*days||' days')::interval AND created_at<now()-(days||' days')::interval),
sources AS (SELECT coalesce(nullif(first_touch_source,''),nullif(first_touch_referrer_host,''),'Direct / unknown') source,count(*) count FROM recent WHERE name='pageview' GROUP BY 1 ORDER BY 2 DESC,1 LIMIT 5)
SELECT jsonb_build_object(
 'visits',(SELECT count(*) FROM recent WHERE name='pageview'),
 'visitors',(SELECT count(DISTINCT visitor_id) FROM recent),
 'signups',(SELECT count(*) FROM recent WHERE name='signup'),
 'waitlist',(SELECT count(*) FROM recent WHERE name='joined_waitlist'),
 'prev_visits',(SELECT count(*) FROM previous WHERE name='pageview'),
 'prev_visitors',(SELECT count(DISTINCT visitor_id) FROM previous),
 'prev_signups',(SELECT count(*) FROM previous WHERE name='signup'),
 'prev_waitlist',(SELECT count(*) FROM previous WHERE name='joined_waitlist'),
 'sources',coalesce((SELECT jsonb_agg(sources) FROM sources),'[]'::jsonb)); $$;
REVOKE ALL ON FUNCTION public.tracking_summary(uuid,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tracking_summary(uuid,int) TO authenticated;