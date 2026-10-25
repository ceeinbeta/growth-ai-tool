import { Logo } from "@/components/Logo";

/** Visible branded placeholder while a browser-only page loads, so the screen is never blank. */
export function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" role="status" aria-live="polite">
      <div className="text-center">
        <Logo size="lg" />
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
