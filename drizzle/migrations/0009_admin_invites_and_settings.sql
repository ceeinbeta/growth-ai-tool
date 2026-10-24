CREATE TABLE public.app_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_admins TO service_role;
REVOKE ALL ON public.app_admins FROM PUBLIC, anon, authenticated;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_admins(user_id)
SELECT id FROM auth.users WHERE lower(email) = 'mcileneveloria@gmail.com'
ON CONFLICT DO NOTHING;

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
REVOKE ALL ON public.app_settings FROM PUBLIC, anon, authenticated;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings(key, value) VALUES ('beta_seat_limit', 20), ('platform_ai_runs_per_day', 100);

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = auth.uid()) $$;
REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reserve_ai_run(pid uuid, feature text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE rid uuid; cap int;
BEGIN
  IF feature NOT IN ('profile-product', 'audit-page') THEN RAISE EXCEPTION 'invalid_feature'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('growloop:profile-reservation', 0));
  PERFORM 1 FROM public.products WHERE id = pid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
  IF feature = 'profile-product' AND (SELECT count(*) FROM public.profile_runs WHERE product_id = pid AND created_at > now() - interval '24 hours') >= 5 THEN RAISE EXCEPTION 'profile_run_limit_reached'; END IF;
  IF feature = 'audit-page' AND (SELECT count(*) FROM public.audit_runs WHERE product_id = pid AND created_at > now() - interval '24 hours') >= 5 THEN RAISE EXCEPTION 'audit_run_limit_reached'; END IF;
  SELECT value INTO cap FROM public.app_settings WHERE key = 'platform_ai_runs_per_day';
  IF cap IS NULL THEN cap := 100; END IF;
  IF (SELECT count(*) FROM public.profile_runs WHERE created_at > now() - interval '24 hours') + (SELECT count(*) FROM public.audit_runs WHERE created_at > now() - interval '24 hours') >= cap THEN RAISE EXCEPTION 'platform_profile_run_limit_reached'; END IF;
  IF feature = 'profile-product' THEN INSERT INTO public.profile_runs(product_id) VALUES (pid) RETURNING id INTO rid;
  ELSE INSERT INTO public.audit_runs(product_id) VALUES (pid) RETURNING id INTO rid; END IF;
  RETURN rid;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_setting(setting_key text, val int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF setting_key NOT IN ('beta_seat_limit', 'platform_ai_runs_per_day') THEN RAISE EXCEPTION 'unknown_setting'; END IF;
  IF setting_key = 'beta_seat_limit' AND val NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_setting_value'; END IF;
  IF setting_key = 'platform_ai_runs_per_day' AND val NOT BETWEEN 10 AND 1000 THEN RAISE EXCEPTION 'invalid_setting_value'; END IF;
  INSERT INTO public.app_settings(key, value, updated_at) VALUES (setting_key, val, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_setting(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_setting(text, int) TO authenticated, service_role;

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
    'platform_ai_runs_per_day', coalesce((SELECT value FROM public.app_settings WHERE key = 'platform_ai_runs_per_day'), 100)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_summary() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_waitlist()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM (
      SELECT w.id, w.email, w.website, w.stage, w.utm_source, w.utm_medium, w.utm_campaign, w.created_at, w.invited_at,
        EXISTS(SELECT 1 FROM public.allowed_emails ae WHERE ae.email = w.email) AS on_allow_list,
        EXISTS(SELECT 1 FROM auth.users u WHERE lower(u.email) = w.email) AS has_account
      FROM public.waitlist_signups w
    ) t
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_waitlist() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_waitlist() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_invites()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE admin_emails text[];
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT coalesce(array_agg(lower(u.email)), '{}') INTO admin_emails
  FROM public.app_admins a JOIN auth.users u ON u.id = a.user_id;
  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM (
      SELECT ae.email, ae.note, ae.created_at,
        (u.id IS NOT NULL) AS has_account, u.last_sign_in_at
      FROM public.allowed_emails ae
      LEFT JOIN auth.users u ON lower(u.email) = ae.email
      WHERE NOT (ae.email = ANY(admin_emails))
    ) t
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_invites() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_invite_email(addr text, note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_email text; v_note text; v_limit int;
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_email := lower(btrim(coalesce(addr, '')));
  IF length(v_email) > 255 OR v_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
  v_note := nullif(btrim(coalesce(note, '')), '');
  IF NOT EXISTS(SELECT 1 FROM public.allowed_emails ae WHERE ae.email = v_email) THEN
    SELECT coalesce((SELECT value FROM public.app_settings WHERE key = 'beta_seat_limit'), 20) INTO v_limit;
    IF (SELECT count(*) FROM public.allowed_emails ae WHERE NOT EXISTS(SELECT 1 FROM public.app_admins ad JOIN auth.users u ON u.id = ad.user_id WHERE lower(u.email) = ae.email)) >= v_limit THEN
      RAISE EXCEPTION 'beta_seat_limit_reached';
    END IF;
  END IF;
  INSERT INTO public.allowed_emails(email, note) VALUES (v_email, v_note)
  ON CONFLICT (email) DO UPDATE SET note = coalesce(EXCLUDED.note, public.allowed_emails.note);
  UPDATE public.waitlist_signups SET invited_at = now() WHERE email = v_email;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_invite_email(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_invite_email(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_uninvite_email(addr text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_email text;
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_email := lower(btrim(coalesce(addr, '')));
  IF EXISTS(SELECT 1 FROM public.app_admins ad JOIN auth.users u ON u.id = ad.user_id WHERE lower(u.email) = v_email) THEN RAISE EXCEPTION 'cannot_remove_admin'; END IF;
  IF EXISTS(SELECT 1 FROM auth.users u WHERE lower(u.email) = v_email) THEN RAISE EXCEPTION 'already_has_account'; END IF;
  DELETE FROM public.allowed_emails WHERE email = v_email;
  UPDATE public.waitlist_signups SET invited_at = NULL WHERE email = v_email;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_uninvite_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_uninvite_email(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_waitlist_entry(entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.waitlist_signups WHERE id = entry_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_waitlist_entry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_waitlist_entry(uuid) TO authenticated, service_role;