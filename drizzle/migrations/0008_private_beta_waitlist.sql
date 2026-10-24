CREATE TABLE public.waitlist_signups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL CHECK (email = lower(email)),
 website text,
 stage text CHECK (stage IN ('live','prelaunch','idea')),
 utm_source text CHECK (length(utm_source) <= 80),
 utm_medium text CHECK (length(utm_medium) <= 80),
 utm_campaign text CHECK (length(utm_campaign) <= 80),
 consent_at timestamptz NOT NULL,
 consent_text text NOT NULL,
 invited_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.waitlist_signups TO service_role;
REVOKE ALL ON public.waitlist_signups FROM anon, authenticated;
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX waitlist_email_lower_unique ON public.waitlist_signups (lower(email));
CREATE TABLE public.waitlist_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.waitlist_submissions TO service_role;
REVOKE ALL ON public.waitlist_submissions FROM anon, authenticated;
ALTER TABLE public.waitlist_submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX waitlist_submissions_created ON public.waitlist_submissions(created_at);
CREATE OR REPLACE FUNCTION public.submit_waitlist(entry jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(713590241);
 IF (SELECT count(*) FROM public.waitlist_submissions WHERE created_at > now() - interval '1 minute') >= 20
 OR (SELECT count(*) FROM public.waitlist_submissions WHERE created_at > now() - interval '1 hour') >= 200 THEN
  RETURN false;
 END IF;
 INSERT INTO public.waitlist_submissions DEFAULT VALUES;
 DELETE FROM public.waitlist_submissions WHERE created_at < now() - interval '1 hour';
 INSERT INTO public.waitlist_signups(email,website,stage,utm_source,utm_medium,utm_campaign,consent_at,consent_text)
 VALUES(lower(entry->>'email'), nullif(entry->>'website',''), nullif(entry->>'stage',''), nullif(entry->>'utm_source',''), nullif(entry->>'utm_medium',''), nullif(entry->>'utm_campaign',''), now(), entry->>'consent_text')
 ON CONFLICT (lower(email)) DO NOTHING;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.submit_waitlist(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_waitlist(jsonb) TO service_role;