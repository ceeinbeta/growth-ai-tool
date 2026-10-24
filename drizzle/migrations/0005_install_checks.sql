CREATE TABLE public.install_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.install_checks TO service_role;
REVOKE ALL ON public.install_checks FROM PUBLIC, anon, authenticated;
ALTER TABLE public.install_checks ENABLE ROW LEVEL SECURITY;
CREATE INDEX install_checks_product_created_idx ON public.install_checks(product_id, created_at);

CREATE OR REPLACE FUNCTION public.reserve_install_check(pid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM public.products WHERE id = pid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
  IF (SELECT count(*) FROM public.install_checks WHERE product_id = pid AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'install_check_limit_reached';
  END IF;
  INSERT INTO public.install_checks(product_id) VALUES (pid);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_install_check(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_install_check(uuid) TO service_role;