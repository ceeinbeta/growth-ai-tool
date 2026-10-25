CREATE TABLE public.technical_audits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 fetched_url text NOT NULL,
 fetched_at timestamptz NOT NULL,
 attention_count integer NOT NULL DEFAULT 0,
 unknown_count integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.technical_audits TO authenticated;
GRANT ALL ON public.technical_audits TO service_role;
ALTER TABLE public.technical_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read technical audits" ON public.technical_audits FOR SELECT TO authenticated USING (public.can_access_product(product_id));
CREATE TABLE public.technical_audit_findings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 audit_id uuid NOT NULL REFERENCES public.technical_audits(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 check_key text NOT NULL,
 status text NOT NULL,
 title text NOT NULL,
 detail text NOT NULL,
 why text NOT NULL,
 fix text NOT NULL,
 position integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.technical_audit_findings TO authenticated;
GRANT ALL ON public.technical_audit_findings TO service_role;
ALTER TABLE public.technical_audit_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read technical audit findings" ON public.technical_audit_findings FOR SELECT TO authenticated USING (public.can_access_product(product_id));
CREATE TABLE public.technical_audit_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.technical_audit_runs TO service_role;
REVOKE ALL ON public.technical_audit_runs FROM anon, authenticated;
ALTER TABLE public.technical_audit_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX technical_audit_runs_product_time ON public.technical_audit_runs(product_id,created_at);
CREATE FUNCTION public.reserve_technical_audit(pid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.products WHERE id=pid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
 IF (SELECT count(*) FROM public.technical_audit_runs WHERE product_id=pid AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'technical_audit_limit_reached'; END IF;
 INSERT INTO public.technical_audit_runs(product_id) VALUES(pid);
END; $$;
REVOKE ALL ON FUNCTION public.reserve_technical_audit(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_technical_audit(uuid) TO service_role;
CREATE FUNCTION public.save_technical_audit(pid uuid, page_url text, fetch_time timestamptz, findings jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE aid uuid; attn int; unk int;
BEGIN
 attn := (SELECT count(*) FROM jsonb_array_elements(findings) f WHERE f->>'status'='attention');
 unk := (SELECT count(*) FROM jsonb_array_elements(findings) f WHERE f->>'status'='unknown');
 INSERT INTO public.technical_audits(product_id,fetched_url,fetched_at,attention_count,unknown_count) VALUES(pid,page_url,fetch_time,attn,unk) RETURNING id INTO aid;
 INSERT INTO public.technical_audit_findings(audit_id,product_id,check_key,status,title,detail,why,fix,position)
 SELECT aid,pid,f->>'key',f->>'status',f->>'title',f->>'detail',f->>'why',f->>'fix',(ord-1)::int
 FROM jsonb_array_elements(findings) WITH ORDINALITY AS t(f,ord);
 RETURN aid;
END; $$;
REVOKE ALL ON FUNCTION public.save_technical_audit(uuid,text,timestamptz,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_technical_audit(uuid,text,timestamptz,jsonb) TO service_role;