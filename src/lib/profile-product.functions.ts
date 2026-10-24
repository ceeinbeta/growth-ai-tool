import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateProductProfile } from "./profile-product.server";

export const profileProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: product, error } = await context.supabase.from("products")
      .select("id,name,url,description,stage").eq("id", data.productId).maybeSingle();
    if (error || !product) return { ok: false, error: "This product isn't available in your workspace." };
    return generateProductProfile(product);
  });