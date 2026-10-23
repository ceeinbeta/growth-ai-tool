CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  max_products int NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX members_user_idx ON public.members(user_id);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  url text NOT NULL CHECK (char_length(url) BETWEEN 3 AND 255),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 1000),
  stage text NOT NULL CHECK (stage IN ('live','prelaunch')),
  one_liner text,
  audience text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_ws_idx ON public.products(workspace_id);

GRANT SELECT ON public.workspaces TO authenticated;
GRANT SELECT ON public.members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.workspaces, public.members, public.products TO service_role;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.members WHERE workspace_id = ws AND user_id = auth.uid())
$$;

CREATE POLICY "members read workspaces" ON public.workspaces FOR SELECT TO authenticated USING (public.is_workspace_member(id));
CREATE POLICY "members read members" ON public.members FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "members read products" ON public.products FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "members insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "members update products" ON public.products FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "members delete products" ON public.products FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id));

CREATE OR REPLACE FUNCTION public.enforce_product_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim int; cnt int;
BEGIN
  SELECT max_products INTO lim FROM public.workspaces WHERE id = NEW.workspace_id FOR UPDATE;
  SELECT count(*) INTO cnt FROM public.products WHERE workspace_id = NEW.workspace_id;
  IF cnt >= lim THEN
    RAISE EXCEPTION 'product_limit_reached';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER products_limit BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.enforce_product_limit();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  INSERT INTO public.workspaces(name) VALUES (coalesce(nullif(split_part(NEW.email, '@', 1), ''), 'My workspace')) RETURNING id INTO ws;
  INSERT INTO public.members(workspace_id, user_id, role) VALUES (ws, NEW.id, 'owner');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_product_limit() FROM PUBLIC, anon, authenticated;