CREATE TABLE public.opportunities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 source text NOT NULL DEFAULT 'hn' CHECK(source='hn'), external_id text NOT NULL CHECK(external_id ~ '^[0-9]+$'),
 url text NOT NULL CHECK(url = 'https://news.ycombinator.com/item?id=' || external_id), title text NOT NULL CHECK(length(title) BETWEEN 1 AND 300), excerpt text NOT NULL CHECK(length(excerpt)<=500), author_handle text NOT NULL DEFAULT '', posted_at timestamptz NOT NULL,
 points integer NOT NULL DEFAULT 0 CHECK(points>=0), comments integer NOT NULL DEFAULT 0 CHECK(comments>=0), score integer NOT NULL CHECK(score BETWEEN 0 AND 100), score_parts jsonb NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','saved','drafted','replied','dismissed')), notes text NOT NULL DEFAULT '' CHECK(length(notes)<=2000), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(product_id,source,external_id), UNIQUE(id,product_id)
);
GRANT SELECT ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY opportunities_member_read ON public.opportunities FOR SELECT TO authenticated USING(public.can_access_product(product_id));
CREATE TABLE public.reply_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), opportunity_id uuid NOT NULL, product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 text text NOT NULL CHECK(length(text) BETWEEN 1 AND 4000), model text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), edited_text text CHECK(length(edited_text)<=4000),
 FOREIGN KEY(opportunity_id,product_id) REFERENCES public.opportunities(id,product_id) ON DELETE CASCADE
);
GRANT SELECT ON public.reply_drafts TO authenticated;
GRANT ALL ON public.reply_drafts TO service_role;
ALTER TABLE public.reply_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY reply_drafts_member_read ON public.reply_drafts FOR SELECT TO authenticated USING(public.can_access_product(product_id));
CREATE TABLE public.scan_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, source text NOT NULL DEFAULT 'hn' CHECK(source='hn'), terms text[] NOT NULL CHECK(cardinality(terms) BETWEEN 1 AND 10), found integer NOT NULL DEFAULT 0 CHECK(found>=0), new_count integer NOT NULL DEFAULT 0 CHECK(new_count>=0), created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
 status text NOT NULL DEFAULT 'running' CHECK(status IN ('running','done','partial','failed')), note text
);
GRANT SELECT ON public.scan_runs TO authenticated;
GRANT ALL ON public.scan_runs TO service_role;
ALTER TABLE public.scan_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY scan_runs_member_read ON public.scan_runs FOR SELECT TO authenticated USING(public.can_access_product(product_id));
CREATE TABLE public.conversation_terms (
 product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE, terms text[] NOT NULL CHECK(cardinality(terms) BETWEEN 1 AND 10), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.conversation_terms TO authenticated;
GRANT ALL ON public.conversation_terms TO service_role;
ALTER TABLE public.conversation_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversation_terms_member_read ON public.conversation_terms FOR SELECT TO authenticated USING(public.can_access_product(product_id));
CREATE TABLE public.reply_draft_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reply_draft_runs TO service_role;
ALTER TABLE public.reply_draft_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX scan_runs_product_time ON public.scan_runs(product_id,created_at);
CREATE INDEX reply_draft_runs_product_time ON public.reply_draft_runs(product_id,created_at);
CREATE INDEX opportunities_product_score ON public.opportunities(product_id,score DESC);
CREATE OR REPLACE FUNCTION public.reserve_conversation_scan(pid uuid, query_terms text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid;
BEGIN
 IF cardinality(query_terms) NOT BETWEEN 1 AND 10 OR EXISTS(SELECT 1 FROM unnest(query_terms) t WHERE length(btrim(t)) NOT BETWEEN 1 AND 120 OR t ~ '[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_terms'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('growloop:conversation-scan:' || pid::text,0));
 PERFORM 1 FROM public.products WHERE id=pid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
 IF (SELECT count(*) FROM public.scan_runs WHERE product_id=pid AND created_at>now()-interval '1 hour')>=6 THEN RAISE EXCEPTION 'scan_hour_limit_reached'; END IF;
 IF (SELECT count(*) FROM public.scan_runs WHERE product_id=pid AND created_at>now()-interval '24 hours')>=30 THEN RAISE EXCEPTION 'scan_day_limit_reached'; END IF;
 INSERT INTO public.scan_runs(product_id,terms) VALUES(pid,query_terms) RETURNING id INTO rid;
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.reserve_conversation_scan(uuid,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_conversation_scan(uuid,text[]) TO service_role;
CREATE OR REPLACE FUNCTION public.save_conversation_scan(rid uuid, hits jsonb, outcome text, safe_note text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid; item jsonb; added integer:=0; affected integer;
BEGIN
 SELECT product_id INTO pid FROM public.scan_runs WHERE id=rid AND status='running' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'scan_not_running'; END IF;
 IF outcome NOT IN ('done','partial','failed') OR jsonb_typeof(hits)<>'array' OR jsonb_array_length(hits)>500 THEN RAISE EXCEPTION 'invalid_scan'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(hits) LOOP
  INSERT INTO public.opportunities(product_id,external_id,url,title,excerpt,author_handle,posted_at,points,comments,score,score_parts)
  VALUES(pid,item->>'external_id',item->>'url',item->>'title',item->>'excerpt',coalesce(item->>'author_handle',''),(item->>'posted_at')::timestamptz,(item->>'points')::integer,(item->>'comments')::integer,(item->>'score')::integer,item->'score_parts')
  ON CONFLICT(product_id,source,external_id) DO NOTHING;
  GET DIAGNOSTICS affected = ROW_COUNT; added:=added+affected;
  UPDATE public.opportunities SET title=item->>'title',excerpt=item->>'excerpt',points=(item->>'points')::integer,comments=(item->>'comments')::integer,score=(item->>'score')::integer,score_parts=item->'score_parts',updated_at=now() WHERE product_id=pid AND source='hn' AND external_id=item->>'external_id';
 END LOOP;
 UPDATE public.scan_runs SET found=jsonb_array_length(hits),new_count=added,status=outcome,note=left(safe_note,500),finished_at=now() WHERE id=rid;
 RETURN added;
END $$;
REVOKE ALL ON FUNCTION public.save_conversation_scan(uuid,jsonb,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_conversation_scan(uuid,jsonb,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.save_conversation_terms(pid uuid, query_terms text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF cardinality(query_terms) NOT BETWEEN 1 AND 10 OR EXISTS(SELECT 1 FROM unnest(query_terms) t WHERE length(btrim(t)) NOT BETWEEN 1 AND 120 OR t ~ '[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_terms'; END IF;
 INSERT INTO public.conversation_terms(product_id,terms) VALUES(pid,query_terms) ON CONFLICT(product_id) DO UPDATE SET terms=excluded.terms,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.save_conversation_terms(uuid,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_conversation_terms(uuid,text[]) TO service_role;
CREATE OR REPLACE FUNCTION public.update_conversation(pid uuid, oid uuid, new_status text, new_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF new_status IS NOT NULL AND new_status NOT IN ('new','saved','drafted','replied','dismissed') THEN RAISE EXCEPTION 'invalid_status'; END IF;
 UPDATE public.opportunities SET status=coalesce(new_status,status),notes=coalesce(new_notes,notes),updated_at=now() WHERE id=oid AND product_id=pid;
 IF NOT FOUND THEN RAISE EXCEPTION 'opportunity_not_found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.update_conversation(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_conversation(uuid,uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.save_reply_draft(pid uuid, oid uuid, draft_text text, model_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE did uuid;
BEGIN
 PERFORM 1 FROM public.opportunities WHERE id=oid AND product_id=pid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'opportunity_not_found'; END IF;
 INSERT INTO public.reply_drafts(opportunity_id,product_id,text,model) VALUES(oid,pid,draft_text,model_name) RETURNING id INTO did;
 UPDATE public.opportunities SET status=CASE WHEN status IN ('replied','dismissed') THEN status ELSE 'drafted' END,updated_at=now() WHERE id=oid AND product_id=pid;
 RETURN did;
END $$;
REVOKE ALL ON FUNCTION public.save_reply_draft(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_reply_draft(uuid,uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.edit_reply_draft(pid uuid, did uuid, draft_text text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.reply_drafts SET edited_text=draft_text WHERE id=did AND product_id=pid;
 IF NOT FOUND THEN RAISE EXCEPTION 'draft_not_found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.edit_reply_draft(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.edit_reply_draft(uuid,uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.reserve_ai_run(pid uuid, feature text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid; cap integer;
BEGIN
 IF feature NOT IN ('profile-product','audit-page','reply-draft') THEN RAISE EXCEPTION 'invalid_feature'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('growloop:profile-reservation',0));
 PERFORM 1 FROM public.products WHERE id=pid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
 IF feature='profile-product' AND (SELECT count(*) FROM public.profile_runs WHERE product_id=pid AND created_at>now()-interval '24 hours')>=5 THEN RAISE EXCEPTION 'profile_run_limit_reached'; END IF;
 IF feature='audit-page' AND (SELECT count(*) FROM public.audit_runs WHERE product_id=pid AND created_at>now()-interval '24 hours')>=5 THEN RAISE EXCEPTION 'audit_run_limit_reached'; END IF;
 IF feature='reply-draft' AND (SELECT count(*) FROM public.reply_draft_runs WHERE product_id=pid AND created_at>now()-interval '24 hours')>=5 THEN RAISE EXCEPTION 'reply_draft_limit_reached'; END IF;
 SELECT value INTO cap FROM public.app_settings WHERE key='platform_ai_runs_per_day'; cap:=coalesce(cap,100);
 IF (SELECT count(*) FROM public.profile_runs WHERE created_at>now()-interval '24 hours')+(SELECT count(*) FROM public.audit_runs WHERE created_at>now()-interval '24 hours')+(SELECT count(*) FROM public.reply_draft_runs WHERE created_at>now()-interval '24 hours')>=cap THEN RAISE EXCEPTION 'platform_profile_run_limit_reached'; END IF;
 IF feature='profile-product' THEN INSERT INTO public.profile_runs(product_id) VALUES(pid) RETURNING id INTO rid;
 ELSIF feature='audit-page' THEN INSERT INTO public.audit_runs(product_id) VALUES(pid) RETURNING id INTO rid;
 ELSE INSERT INTO public.reply_draft_runs(product_id) VALUES(pid) RETURNING id INTO rid; END IF;
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.reserve_ai_run(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_run(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.admin_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE admin_emails text[];
BEGIN
 IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT coalesce(array_agg(lower(u.email)),'{}') INTO admin_emails FROM public.app_admins a JOIN auth.users u ON u.id=a.user_id;
 RETURN jsonb_build_object(
 'waitlist_count',(SELECT count(*) FROM public.waitlist_signups),
 'invited_count',(SELECT count(*) FROM public.allowed_emails ae WHERE NOT(ae.email=ANY(admin_emails))),
 'accounts_count',(SELECT count(*) FROM auth.users u WHERE lower(u.email) IN(SELECT email FROM public.allowed_emails) AND NOT(lower(u.email)=ANY(admin_emails))),
 'beta_seat_limit',coalesce((SELECT value FROM public.app_settings WHERE key='beta_seat_limit'),20),
 'ai_runs_last_24h',(SELECT count(*) FROM public.profile_runs WHERE created_at>now()-interval '24 hours')+(SELECT count(*) FROM public.audit_runs WHERE created_at>now()-interval '24 hours')+(SELECT count(*) FROM public.reply_draft_runs WHERE created_at>now()-interval '24 hours'),
 'platform_ai_runs_per_day',coalesce((SELECT value FROM public.app_settings WHERE key='platform_ai_runs_per_day'),100),
 'visibility_monthly_budget_usd',coalesce((SELECT value FROM public.app_settings WHERE key='visibility_monthly_budget_usd'),20),
 'visibility_spend_this_month',coalesce((SELECT sum(estimated_cost_usd) FROM public.sov_checks WHERE started_at>=date_trunc('month',now())),0),
 'visibility_reading_calls_24h',(SELECT count(*) FROM public.ai_usage WHERE feature IN('sov-extract','sov-fixes') AND created_at>now()-interval '24 hours'));
END $$;