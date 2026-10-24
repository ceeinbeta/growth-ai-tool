CREATE TABLE public.sov_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed', 'stopped')),
  runs_per_question int NOT NULL,
  engines text[] NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  estimated_cost_usd numeric,
  note text
);
GRANT SELECT ON public.sov_checks TO authenticated;
GRANT ALL ON public.sov_checks TO service_role;
ALTER TABLE public.sov_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read checks" ON public.sov_checks FOR SELECT TO authenticated USING (public.can_access_product(product_id));

CREATE TABLE public.sov_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id uuid NOT NULL REFERENCES public.sov_checks(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  engine text NOT NULL,
  question text NOT NULL,
  run_index int NOT NULL,
  status text NOT NULL DEFAULT 'done' CHECK (status IN ('done', 'failed')),
  answer_excerpt text,
  cited_hosts text[],
  input_tokens int,
  output_tokens int,
  search_calls int,
  cost_usd numeric,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sov_runs TO authenticated;
GRANT ALL ON public.sov_runs TO service_role;
ALTER TABLE public.sov_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read runs" ON public.sov_runs FOR SELECT TO authenticated USING (public.can_access_product(product_id));

CREATE TABLE public.sov_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.sov_runs(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  rank int NOT NULL,
  kind text NOT NULL CHECK (kind IN ('you', 'competitor', 'other'))
);
GRANT SELECT ON public.sov_mentions TO authenticated;
GRANT ALL ON public.sov_mentions TO service_role;
ALTER TABLE public.sov_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read mentions" ON public.sov_mentions FOR SELECT TO authenticated USING (public.can_access_product(product_id));

CREATE TABLE public.sov_fixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id uuid NOT NULL REFERENCES public.sov_checks(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  text jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sov_fixes TO authenticated;
GRANT ALL ON public.sov_fixes TO service_role;
ALTER TABLE public.sov_fixes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read fixes" ON public.sov_fixes FOR SELECT TO authenticated USING (public.can_access_product(product_id));

CREATE TABLE public.sov_schedule (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  per_week int NOT NULL DEFAULT 2 CHECK (per_week BETWEEN 1 AND 3),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sov_schedule TO authenticated;
GRANT ALL ON public.sov_schedule TO service_role;
ALTER TABLE public.sov_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read schedule" ON public.sov_schedule FOR SELECT TO authenticated USING (public.can_access_product(product_id));

CREATE UNIQUE INDEX sov_one_running_check ON public.sov_checks(product_id) WHERE status = 'running';
CREATE INDEX sov_checks_product_started ON public.sov_checks(product_id, started_at DESC);
CREATE INDEX sov_runs_check ON public.sov_runs(check_id);
CREATE INDEX sov_mentions_run ON public.sov_mentions(run_id);

INSERT INTO public.app_settings(key, value) VALUES ('visibility_monthly_budget_usd', 20);

CREATE OR REPLACE FUNCTION public.reserve_sov_check(pid uuid, p_runs_per_question int, p_engines text[], p_estimated_cost numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE rid uuid; budget numeric; spent numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('growloop:sov-reservation', 0));
  PERFORM 1 FROM public.products WHERE id = pid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
  IF p_runs_per_question IS NULL OR p_runs_per_question NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'invalid_runs_per_question'; END IF;
  IF p_engines IS NULL OR cardinality(p_engines) = 0 THEN RAISE EXCEPTION 'no_engines'; END IF;
  IF EXISTS (SELECT 1 FROM public.sov_checks WHERE product_id = pid AND status = 'running') THEN RAISE EXCEPTION 'sov_check_running'; END IF;
  IF (SELECT count(*) FROM public.sov_checks WHERE product_id = pid AND started_at > now() - interval '1 hour') >= 1 THEN RAISE EXCEPTION 'sov_check_hour_limit_reached'; END IF;
  IF (SELECT count(*) FROM public.sov_checks WHERE product_id = pid AND started_at > now() - interval '7 days') >= 10 THEN RAISE EXCEPTION 'sov_check_week_limit_reached'; END IF;
  SELECT value INTO budget FROM public.app_settings WHERE key = 'visibility_monthly_budget_usd';
  IF budget IS NULL THEN budget := 20; END IF;
  SELECT coalesce(sum(estimated_cost_usd), 0) INTO spent FROM public.sov_checks WHERE started_at >= date_trunc('month', now());
  IF spent + coalesce(p_estimated_cost, 0) > budget THEN RAISE EXCEPTION 'sov_budget_exceeded'; END IF;
  INSERT INTO public.sov_checks(product_id, runs_per_question, engines, estimated_cost_usd)
  VALUES (pid, p_runs_per_question, p_engines, p_estimated_cost) RETURNING id INTO rid;
  RETURN rid;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_sov_check(uuid, int, text[], numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_sov_check(uuid, int, text[], numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.finish_sov_check(check_id uuid, new_status text, final_cost numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF new_status NOT IN ('done', 'failed', 'stopped') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  UPDATE public.sov_checks
  SET status = new_status, finished_at = now(), estimated_cost_usd = coalesce(final_cost, estimated_cost_usd)
  WHERE id = check_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'check_not_found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_sov_check(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_sov_check(uuid, text, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.sov_budget_info()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE budget numeric; spent numeric;
BEGIN
  SELECT value INTO budget FROM public.app_settings WHERE key = 'visibility_monthly_budget_usd';
  IF budget IS NULL THEN budget := 20; END IF;
  SELECT coalesce(sum(estimated_cost_usd), 0) INTO spent FROM public.sov_checks WHERE started_at >= date_trunc('month', now());
  RETURN json_build_object('budget_usd', budget, 'spent_usd', spent);
END;
$$;
REVOKE ALL ON FUNCTION public.sov_budget_info() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sov_budget_info() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_setting(setting_key text, val int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF setting_key NOT IN ('beta_seat_limit', 'platform_ai_runs_per_day', 'visibility_monthly_budget_usd') THEN RAISE EXCEPTION 'unknown_setting'; END IF;
  IF setting_key = 'beta_seat_limit' AND val NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_setting_value'; END IF;
  IF setting_key = 'platform_ai_runs_per_day' AND val NOT BETWEEN 10 AND 1000 THEN RAISE EXCEPTION 'invalid_setting_value'; END IF;
  IF setting_key = 'visibility_monthly_budget_usd' AND val NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid_setting_value'; END IF;
  INSERT INTO public.app_settings(key, value, updated_at) VALUES (setting_key, val, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE admin_emails text[];
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT coalesce(array_agg(lower(u.email)), '{}') INTO admin_emails
  FROM public.app_admins a JOIN auth.users u ON u.id = a.user_id;
  RETURN jsonb_build_object(
    'waitlist_count', (SELECT count(*) FROM public.waitlist_signups),
    'invited_count', (SELECT count(*) FROM public.allowed_emails ae WHERE NOT (ae.email = ANY(admin_emails))),
    'accounts_count', (SELECT count(*) FROM auth.users u WHERE lower(u.email) IN (SELECT email FROM public.allowed_emails) AND NOT (lower(u.email) = ANY(admin_emails))),
    'beta_seat_limit', coalesce((SELECT value FROM public.app_settings WHERE key = 'beta_seat_limit'), 20),
    'ai_runs_last_24h', (SELECT count(*) FROM public.profile_runs WHERE created_at > now() - interval '24 hours') + (SELECT count(*) FROM public.audit_runs WHERE created_at > now() - interval '24 hours'),
    'platform_ai_runs_per_day', coalesce((SELECT value FROM public.app_settings WHERE key = 'platform_ai_runs_per_day'), 100),
    'visibility_monthly_budget_usd', coalesce((SELECT value FROM public.app_settings WHERE key = 'visibility_monthly_budget_usd'), 20),
    'visibility_spend_this_month', coalesce((SELECT sum(estimated_cost_usd) FROM public.sov_checks WHERE started_at >= date_trunc('month', now())), 0)
  );
END;
$$;