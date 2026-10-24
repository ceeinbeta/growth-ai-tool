import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Private logo through a short-lived signed address; initial-letter tile as fallback. */
export function ProductLogo({ name, path, size = 32 }: { name: string; path: string | null; size?: 32 | 56 }) {
  const { data: url } = useQuery({
    queryKey: ["logo-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => (await supabase.storage.from("product-logos").createSignedUrl(path!, 3600)).data?.signedUrl ?? null,
  });
  const [broken, setBroken] = useState<string | null>(null);
  const box = size === 56 ? "h-14 w-14 rounded-lg text-2xl" : "h-8 w-8 rounded-sm text-sm";
  if (path && url && broken !== url) {
    return <img src={url} alt="" width={size} height={size} onError={() => setBroken(url)} className={`${box} shrink-0 border bg-card object-contain`} />;
  }
  return <span aria-hidden className={`${box} flex shrink-0 items-center justify-center bg-primary font-display font-bold text-primary-foreground`}>{name.charAt(0).toUpperCase()}</span>;
}
