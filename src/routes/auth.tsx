import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInLinkErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Growloop" },
      { name: "description", content: "Sign in to Growloop with a one-time link sent to your email." },
      { property: "og:title", content: "Sign in — Growloop" },
      { property: "og:description", content: "Find the leak. Fix it. Prove it worked." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/overview" });
  },
  component: AuthPage,
});

const emailSchema = z.string().trim().email().max(255);

function AuthPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError("Enter a valid email address.");
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: `${window.location.origin}/overview` },
    });
    setBusy(false);
    if (error) return setError(signInLinkErrorMessage(error));
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Logo />
        <h1 className="mt-10 text-4xl font-extrabold leading-tight">Find the leak. Fix it. Prove it worked.</h1>
        <div className="mt-8 rounded-xl border bg-card p-6">
          {sent ? (
            <div role="status">
              <h2 className="text-xl">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a sign-in link to <span className="font-medium text-foreground">{email.trim()}</span>. Open it on this device to sign in.
              </p>
              <button className="mt-4 text-sm font-medium text-foreground hover:underline" onClick={() => setSent(false)}>
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="mt-2 h-11 bg-card"
                placeholder="you@yourapp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
              />
              {error && <p className="mt-2 rounded-sm bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" className="mt-4 h-11 w-full" disabled={busy}>
                {busy ? "Sending…" : "Email me a sign-in link"}
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">No password. We'll email you a one-time link.</p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
