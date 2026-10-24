-- Resumable visibility checks: tasks are claimed as 'pending' rows.
ALTER TABLE public.sov_runs DROP CONSTRAINT sov_runs_status_check;
ALTER TABLE public.sov_runs ADD CONSTRAINT sov_runs_status_check CHECK (status IN ('pending', 'done', 'failed'));
CREATE UNIQUE INDEX sov_runs_task_unique ON public.sov_runs(check_id, engine, question, run_index);
CREATE UNIQUE INDEX sov_fixes_one_per_check ON public.sov_fixes(check_id);

-- Month-to-date visibility spend for the platform, optionally excluding one
-- check's own reserved estimate (used for the mid-run budget stop so a check
-- is not counted against itself twice). Service role only.
CREATE OR REPLACE FUNCTION public.sov_month_spend(p_exclude_check uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE budget numeric; spent numeric;
BEGIN
  SELECT value INTO budget FROM public.app_settings WHERE key = 'visibility_monthly_budget_usd';
  IF budget IS NULL THEN budget := 20; END IF;
  SELECT coalesce(sum(estimated_cost_usd), 0) INTO spent
  FROM public.sov_checks
  WHERE started_at >= date_trunc('month', now())
    AND (p_exclude_check IS NULL OR id <> p_exclude_check);
  RETURN json_build_object('budget_usd', budget, 'spent_usd', spent);
END;
$$;
REVOKE ALL ON FUNCTION public.sov_month_spend(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sov_month_spend(uuid) TO service_role;

-- Budget info scoped by caller: admins (and server calls) see platform totals;
-- other signed-in users see only their own product's estimated spend and a
-- plain status.
CREATE OR REPLACE FUNCTION public.sov_budget_info(p_product_id uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE budget numeric; spent numeric; own numeric;
BEGIN
  SELECT value INTO budget FROM public.app_settings WHERE key = 'visibility_monthly_budget_usd';
  IF budget IS NULL THEN budget := 20; END IF;
  SELECT coalesce(sum(estimated_cost_usd), 0) INTO spent FROM public.sov_checks WHERE started_at >= date_trunc('month', now());
  IF auth.uid() IS NULL OR public.is_app_admin() THEN
    RETURN json_build_object('scope', 'platform', 'budget_usd', budget, 'spent_usd', spent);
  END IF;
  SELECT coalesce(sum(c.estimated_cost_usd), 0) INTO own
  FROM public.sov_checks c
  WHERE c.started_at >= date_trunc('month', now())
    AND public.can_access_product(c.product_id)
    AND (p_product_id IS NULL OR c.product_id = p_product_id);
  RETURN json_build_object(
    'scope', 'product',
    'own_spend_usd', own,
    'status', CASE WHEN spent >= budget THEN 'Paused for this month' ELSE 'Within budget' END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sov_budget_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sov_budget_info(uuid) TO authenticated, service_role;

-- Admin summary gains the count of Lovable AI reading calls for visibility.
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
    'visibility_spend_this_month', coalesce((SELECT sum(estimated_cost_usd) FROM public.sov_checks WHERE started_at >= date_trunc('month', now())), 0),
    'visibility_reading_calls_24h', (SELECT count(*) FROM public.ai_usage WHERE feature IN ('sov-extract', 'sov-fixes') AND created_at > now() - interval '24 hours')
  );
END;
$$;

-- Harden grants: no TRUNCATE, REFERENCES or TRIGGER for client roles on any
-- public table, and future tables get no implicit grants at all (each
-- migration grants exactly what the app needs).
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;