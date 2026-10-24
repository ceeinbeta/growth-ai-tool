ALTER TABLE public.products ADD COLUMN profiled_at timestamptz, ADD COLUMN profile_source text DEFAULT 'ai' CHECK (profile_source IN ('ai','edited')), ADD COLUMN profile_edited_fields text[] NOT NULL DEFAULT '{}';
CREATE TABLE public.competitors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120), source text NOT NULL DEFAULT 'user' CHECK (source IN ('ai','user')), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.competitors TO authenticated; GRANT ALL ON public.competitors TO service_role;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX competitors_name_unique ON public.competitors(product_id,lower(name));
CREATE TABLE public.sov_questions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, question text NOT NULL CHECK (length(trim(question)) BETWEEN 1 AND 500), source text NOT NULL DEFAULT 'user' CHECK (source IN ('ai','user')), active bool NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.sov_questions TO authenticated; GRANT ALL ON public.sov_questions TO service_role;
ALTER TABLE public.sov_questions ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.ai_usage (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, feature text NOT NULL, model text NOT NULL, input_tokens int, output_tokens int, cost_usd numeric, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.ai_usage TO authenticated; GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.profile_runs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.profile_runs TO service_role;
ALTER TABLE public.profile_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX profile_runs_window ON public.profile_runs(product_id,created_at);
CREATE TABLE public.profile_ai_state (model text PRIMARY KEY, blocked bool NOT NULL DEFAULT false, message text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.profile_ai_state TO service_role;
ALTER TABLE public.profile_ai_state ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_access_product(pid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.products WHERE id=pid AND public.is_workspace_member(workspace_id)) $$;
REVOKE ALL ON FUNCTION public.can_access_product(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.can_access_product(uuid) TO authenticated,service_role;
CREATE POLICY "members manage competitors" ON public.competitors FOR ALL TO authenticated USING(public.can_access_product(product_id)) WITH CHECK(public.can_access_product(product_id));
CREATE POLICY "members manage questions" ON public.sov_questions FOR ALL TO authenticated USING(public.can_access_product(product_id)) WITH CHECK(public.can_access_product(product_id));
CREATE POLICY "members read usage" ON public.ai_usage FOR SELECT TO authenticated USING(public.can_access_product(product_id));
CREATE OR REPLACE FUNCTION public.enforce_profile_item_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n int; cap int; BEGIN
IF TG_OP='UPDATE' AND NEW.product_id<>OLD.product_id THEN RAISE EXCEPTION 'product_cannot_change'; END IF;
PERFORM 1 FROM public.products WHERE id=NEW.product_id FOR UPDATE;
IF TG_TABLE_NAME='competitors' THEN SELECT count(*) INTO n FROM public.competitors WHERE product_id=NEW.product_id AND id<>NEW.id; cap:=8; NEW.name:=trim(NEW.name); ELSE SELECT count(*) INTO n FROM public.sov_questions WHERE product_id=NEW.product_id AND id<>NEW.id; cap:=10; NEW.question:=trim(NEW.question); END IF;
IF n>=cap THEN RAISE EXCEPTION 'profile_item_limit_reached'; END IF;
IF auth.role()='authenticated' THEN NEW.source:='user'; END IF; RETURN NEW; END $$;
CREATE TRIGGER competitors_limits BEFORE INSERT OR UPDATE ON public.competitors FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_item_limit();
CREATE TRIGGER questions_limits BEFORE INSERT OR UPDATE ON public.sov_questions FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_item_limit();
CREATE OR REPLACE FUNCTION public.track_profile_edits() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
IF auth.role()='authenticated' THEN
NEW.profile_edited_fields:=OLD.profile_edited_fields;
IF NEW.one_liner IS DISTINCT FROM OLD.one_liner THEN NEW.profile_edited_fields:=array_append(NEW.profile_edited_fields,'one_liner'); END IF;
IF NEW.audience IS DISTINCT FROM OLD.audience THEN NEW.profile_edited_fields:=array_append(NEW.profile_edited_fields,'audience'); END IF;
IF NEW.category IS DISTINCT FROM OLD.category THEN NEW.profile_edited_fields:=array_append(NEW.profile_edited_fields,'category'); END IF;
NEW.profiled_at:=OLD.profiled_at; NEW.profile_source:=CASE WHEN cardinality(NEW.profile_edited_fields)>0 THEN 'edited' ELSE OLD.profile_source END;
END IF; RETURN NEW; END $$;
CREATE TRIGGER product_profile_edits BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.track_profile_edits();
CREATE OR REPLACE FUNCTION public.reserve_profile_run(pid uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE rid uuid; BEGIN
PERFORM 1 FROM public.products WHERE id=pid FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
IF (SELECT count(*) FROM public.profile_runs WHERE product_id=pid AND created_at>now()-interval '24 hours')>=5 THEN RAISE EXCEPTION 'profile_run_limit_reached'; END IF;
INSERT INTO public.profile_runs(product_id) VALUES(pid) RETURNING id INTO rid; RETURN rid; END $$;
REVOKE ALL ON FUNCTION public.reserve_profile_run(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.reserve_profile_run(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.apply_product_profile(pid uuid, profile jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v text; room int; BEGIN
PERFORM 1 FROM public.products WHERE id=pid FOR UPDATE;
UPDATE public.products SET one_liner=CASE WHEN 'one_liner'=ANY(profile_edited_fields) THEN one_liner ELSE profile->>'one_liner' END, audience=CASE WHEN 'audience'=ANY(profile_edited_fields) THEN audience ELSE profile->>'audience' END, category=CASE WHEN 'category'=ANY(profile_edited_fields) THEN category ELSE profile->>'category' END, profiled_at=now(), profile_source=CASE WHEN cardinality(profile_edited_fields)>0 THEN 'edited' ELSE 'ai' END WHERE id=pid;
DELETE FROM public.competitors WHERE product_id=pid AND source='ai';
SELECT 8-count(*) INTO room FROM public.competitors WHERE product_id=pid;
FOR v IN SELECT jsonb_array_elements_text(profile->'competitors') LOOP IF room<=0 THEN EXIT; END IF; IF NOT EXISTS(SELECT 1 FROM public.competitors WHERE product_id=pid AND lower(name)=lower(trim(v))) THEN INSERT INTO public.competitors(product_id,name,source) VALUES(pid,v,'ai'); room:=room-1; END IF; END LOOP;
DELETE FROM public.sov_questions WHERE product_id=pid AND source='ai';
SELECT 10-count(*) INTO room FROM public.sov_questions WHERE product_id=pid;
FOR v IN SELECT jsonb_array_elements_text(profile->'questions') LOOP IF room<=0 THEN EXIT; END IF; IF NOT EXISTS(SELECT 1 FROM public.sov_questions WHERE product_id=pid AND lower(question)=lower(trim(v))) THEN INSERT INTO public.sov_questions(product_id,question,source) VALUES(pid,v,'ai'); room:=room-1; END IF; END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.apply_product_profile(uuid,jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.apply_product_profile(uuid,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.cleanup_deleted_member() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN DELETE FROM public.members WHERE user_id=OLD.id; RETURN OLD; END $$;
CREATE TRIGGER growloop_member_cleanup AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_member();
COMMENT ON COLUMN public.ai_usage.cost_usd IS 'NULL when no authoritative USD cost is supplied; gateway billing uses workspace credits.';