CREATE TABLE public.allowed_emails (
  email text PRIMARY KEY,
  note text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT allowed_emails_lowercase CHECK (email = lower(email))
);
GRANT ALL ON public.allowed_emails TO service_role;
REVOKE ALL ON public.allowed_emails FROM PUBLIC, anon, authenticated;
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enforce_signup_allowlist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.allowed_emails WHERE email = lower(NEW.email)
  ) THEN
    RAISE EXCEPTION 'signup_not_allowed';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_signup_allowlist() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER growloop_signup_allowlist
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_signup_allowlist();

CREATE INDEX profile_runs_created_at_idx ON public.profile_runs(created_at);
CREATE OR REPLACE FUNCTION public.reserve_profile_run(pid uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE rid uuid;
BEGIN
  -- One lock shared by all products; held until the reservation commits.
  PERFORM pg_advisory_xact_lock(hashtextextended('growloop:profile-reservation', 0));
  PERFORM 1 FROM public.products WHERE id = pid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
  IF (SELECT count(*) FROM public.profile_runs WHERE product_id = pid AND created_at > now() - interval '24 hours') >= 5 THEN
    RAISE EXCEPTION 'profile_run_limit_reached';
  END IF;
  IF (SELECT count(*) FROM public.profile_runs WHERE created_at > now() - interval '24 hours') >= 100 THEN
    RAISE EXCEPTION 'platform_profile_run_limit_reached';
  END IF;
  INSERT INTO public.profile_runs(product_id) VALUES(pid) RETURNING id INTO rid;
  RETURN rid;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_profile_run(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_profile_run(uuid) TO service_role;