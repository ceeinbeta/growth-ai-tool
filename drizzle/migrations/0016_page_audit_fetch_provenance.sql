ALTER TABLE public.audits ADD COLUMN audited_url text;
ALTER TABLE public.audits ADD COLUMN fetched_at timestamptz;
CREATE TABLE public.audit_fetches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.audit_fetches TO service_role;
REVOKE ALL ON public.audit_fetches FROM anon, authenticated;
ALTER TABLE public.audit_fetches ENABLE ROW LEVEL SECURITY;
CREATE INDEX audit_fetches_product_time ON public.audit_fetches(product_id,created_at);
CREATE FUNCTION public.reserve_audit_fetch(pid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.products WHERE id=pid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
 IF (SELECT count(*) FROM public.audit_fetches WHERE product_id=pid AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'audit_fetch_limit_reached'; END IF;
 INSERT INTO public.audit_fetches(product_id) VALUES(pid);
END; $$;
REVOKE ALL ON FUNCTION public.reserve_audit_fetch(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_audit_fetch(uuid) TO service_role;
CREATE FUNCTION public.save_fetched_page_audit(pid uuid, copy jsonb, funnel jsonb, model_name text, findings jsonb, page_url text, fetch_time timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE aid uuid;
BEGIN
 aid := public.save_page_audit(pid,copy,funnel,model_name,findings);
 UPDATE public.audits SET audited_url=page_url,fetched_at=fetch_time WHERE id=aid;
 RETURN aid;
END; $$;
REVOKE ALL ON FUNCTION public.save_fetched_page_audit(uuid,jsonb,jsonb,text,jsonb,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_fetched_page_audit(uuid,jsonb,jsonb,text,jsonb,text,timestamptz) TO service_role;