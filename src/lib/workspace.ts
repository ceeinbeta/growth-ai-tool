import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  tracking_key: string;
  workspace_id: string;
  name: string;
  url: string;
  description: string;
  stage: "live" | "prelaunch";
  created_at: string;
  one_liner: string | null;
  audience: string | null;
  category: string | null;
  profiled_at: string | null;
  profile_source: string | null;
  profile_edited_fields: string[];
};

export type WorkspaceData = {
  workspace: { id: string; name: string; max_products: number } | null;
  products: Product[];
};

export const workspaceQuery = queryOptions({
  queryKey: ["workspace"],
  queryFn: async (): Promise<WorkspaceData> => {
    const { data: ws, error } = await supabase
      .from("workspaces")
      .select("id, name, max_products")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!ws) return { workspace: null, products: [] };
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id, tracking_key, workspace_id, name, url, description, stage, created_at, one_liner, audience, category, profiled_at, profile_source, profile_edited_fields")
      .eq("workspace_id", ws.id)
      .order("created_at");
    if (pErr) throw pErr;
    return { workspace: ws, products: (products ?? []) as Product[] };
  },
});

const ACTIVE_KEY = "growloop.activeProduct";
export const getStoredActive = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(ACTIVE_KEY);
export const setStoredActive = (id: string) => window.localStorage.setItem(ACTIVE_KEY, id);
