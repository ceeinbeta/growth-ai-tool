import { z } from "zod";
import { normalizeWebsite, WEBSITE_ERROR } from "@/lib/website";

/** One rule for creating and editing a product. */
export const productSchema = z.object({
  name: z.string().trim().min(1, "Enter a product name.").max(80, "Keep the name under 80 characters."),
  url: z.string().transform((v, ctx) => {
    const n = normalizeWebsite(v);
    if (!n) { ctx.addIssue({ code: "custom", message: WEBSITE_ERROR }); return z.NEVER; }
    return n;
  }),
  description: z.string().trim().min(1, "Say what it does and who it's for.").max(1000, "Keep this under 1000 characters."),
  stage: z.enum(["live", "prelaunch"], { message: "Choose a stage." }),
});

export type ProductFormErrors = Partial<Record<"name" | "url" | "description" | "stage" | "form", string>>;

export function validateProduct(form: unknown) {
  const parsed = productSchema.safeParse(form);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  const errors: ProductFormErrors = {};
  for (const i of parsed.error.issues) { const k = i.path[0] as keyof ProductFormErrors; if (!errors[k]) errors[k] = i.message; }
  return { ok: false as const, errors };
}

/** Delete is confirmed only by typing the exact product name. */
export const deleteConfirmed = (typed: string, name: string) => typed.trim() === name;
