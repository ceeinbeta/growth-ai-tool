CREATE OR REPLACE FUNCTION public.update_conversation(pid uuid, oid uuid, new_status text DEFAULT NULL, new_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF new_status IS NOT NULL AND new_status NOT IN ('new','saved','drafted','replied','dismissed') THEN RAISE EXCEPTION 'invalid_status'; END IF;
 UPDATE public.opportunities SET status=coalesce(new_status,status),notes=coalesce(new_notes,notes),updated_at=now() WHERE id=oid AND product_id=pid;
 IF NOT FOUND THEN RAISE EXCEPTION 'opportunity_not_found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.update_conversation(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_conversation(uuid,uuid,text,text) TO service_role;