ALTER TABLE public.products ADD COLUMN IF NOT EXISTS logo_path text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS profile_confirmed_at timestamptz;

CREATE TABLE public.logo_fetches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX logo_fetches_product_time ON public.logo_fetches(product_id, created_at);
GRANT ALL ON public.logo_fetches TO service_role;
ALTER TABLE public.logo_fetches ENABLE ROW LEVEL SECURITY;

-- Member-callable: checks access, locks the product, enforces 10 per hour.
CREATE OR REPLACE FUNCTION public.reserve_logo_fetch(pid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.can_access_product(pid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM 1 FROM public.products WHERE id = pid FOR UPDATE;
  IF (SELECT count(*) FROM public.logo_fetches WHERE product_id = pid AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'logo_fetch_limit_reached';
  END IF;
  INSERT INTO public.logo_fetches(product_id) VALUES (pid);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_logo_fetch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_logo_fetch(uuid) TO authenticated, service_role;

-- Only workspace owners can delete; cascades remove every dependent row.
CREATE OR REPLACE FUNCTION public.delete_product_as_owner(pid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.products p JOIN public.members m ON m.workspace_id = p.workspace_id
    WHERE p.id = pid AND m.user_id = auth.uid() AND m.role = 'owner'
  ) THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.products WHERE id = pid;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_product_as_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_product_as_owner(uuid) TO authenticated;

-- Unique visitors over N days, as the caller (RLS applies).
CREATE OR REPLACE FUNCTION public.unique_visitors(pid uuid, days integer)
RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT count(DISTINCT visitor_id)::int FROM public.events
  WHERE product_id = pid AND name = 'pageview' AND created_at > now() - make_interval(days => greatest(1, least(days, 365)));
$$;
REVOKE ALL ON FUNCTION public.unique_visitors(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unique_visitors(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_logo_object(object_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE folder text := split_part(object_name, '/', 1);
BEGIN
  IF folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN false; END IF;
  RETURN public.can_access_product(folder::uuid);
END;
$$;
REVOKE ALL ON FUNCTION public.can_access_logo_object(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_logo_object(text) TO authenticated;

CREATE POLICY "members read product logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-logos' AND public.can_access_logo_object(name));
CREATE POLICY "members add product logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-logos' AND public.can_access_logo_object(name));
CREATE POLICY "members update product logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-logos' AND public.can_access_logo_object(name))
  WITH CHECK (bucket_id = 'product-logos' AND public.can_access_logo_object(name));
CREATE POLICY "members delete product logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-logos' AND public.can_access_logo_object(name));