import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Growloop — Find the leak. Fix it. Prove it worked." },
      { name: "description", content: "Growloop helps solo founders find where they lose users, fix it, and prove it worked." },
      { property: "og:title", content: "Growloop" },
      { property: "og:description", content: "Find the leak. Fix it. Prove it worked." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/overview" : "/auth" });
  },
  component: () => null,
});
