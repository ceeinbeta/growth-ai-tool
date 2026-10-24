import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function profileQuery(productId: string) {
  return queryOptions({
    queryKey: ["product-profile", productId],
    queryFn: async () => {
      const [competitors, questions] = await Promise.all([
        supabase.from("competitors").select("id,name,source").eq("product_id", productId).order("created_at"),
        supabase.from("sov_questions").select("id,question,source,active").eq("product_id", productId).order("created_at"),
      ]);
      if (competitors.error) throw competitors.error;
      if (questions.error) throw questions.error;
      return { competitors: competitors.data, questions: questions.data };
    },
  });
}