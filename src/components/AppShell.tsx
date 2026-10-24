import { Link, Outlet, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";
import { Check, ChevronsUpDown, LayoutGrid, Droplets, Search, Lightbulb, Plug, Plus, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ProductLogo } from "@/components/ProductLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStoredActive, setStoredActive, workspaceQuery, type Product, type WorkspaceData } from "@/lib/workspace";
import { isAdminQuery } from "@/lib/admin";

type ActiveCtx = { data: WorkspaceData | undefined; active: Product | null; setActive: (id: string) => void };
const Ctx = createContext<ActiveCtx>({ data: undefined, active: null, setActive: () => {} });
export const useActiveProduct = () => useContext(Ctx);

export const stageLabel = (s: Product["stage"]) => (s === "live" ? "Live" : "Pre-launch");

export function AppShell() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { data } = useQuery(workspaceQuery);
  const { data: isAdmin } = useQuery(isAdminQuery);
  const [activeId, setActiveId] = useState<string | null>(() => getStoredActive());
  const navigate = useNavigate();
  const qc = useQueryClient();

  const products = data?.products ?? [];
  const active = products.find((p) => p.id === activeId) ?? products[0] ?? null;
  const setActive = (id: string) => {
    setStoredActive(id);
    setActiveId(id);
  };
  const max = data?.workspace?.max_products ?? 3;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const soon = [
    { label: "Opportunities", icon: Lightbulb },
  ];

  return (
    <Ctx.Provider value={{ data, active, setActive }}>
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b bg-sidebar md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
          <div className="px-5 pt-5">
            <Link to="/overview"><Logo /></Link>
          </div>

          <div className="px-3 pt-5">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {active ? <ProductLogo name={active.name} path={active.logo_path} /> : <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-sunken text-muted-foreground"><Plus className="h-4 w-4" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{active?.name ?? "No product yet"}</span>
                  <span className="block text-xs text-muted-foreground">{active ? stageLabel(active.stage) : "Add one to start"}</span>
                </span>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                {products.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onSelect={() => setActive(p.id)}
                    className={`gap-3 ${p.id === active?.id ? "bg-selected" : ""}`}
                  >
                    <ProductLogo name={p.name} path={p.logo_path} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">{stageLabel(p.stage)}</span>
                    </span>
                    {p.id === active?.id && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
                {products.length > 0 && <DropdownMenuSeparator />}
                {products.length >= max ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Standard includes {max} products.</div>
                ) : (
                  <DropdownMenuItem onSelect={() => navigate({ to: "/products/new" })} className="gap-3 text-primary">
                    <Plus className="h-4 w-4" /> Add product
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <nav className="flex flex-col gap-1 px-3 py-5" aria-label="Main">
            <Link
              to="/overview"
              className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-sunken"
              activeProps={{ className: "bg-selected" }}
            >
              <LayoutGrid className="h-4 w-4" /> Overview
            </Link>
            <Link to="/conversion-leaks" className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-sunken" activeProps={{ className: "bg-selected" }}><Droplets className="h-4 w-4" /> Conversion leaks</Link>
            <Link to="/ai-search-visibility" className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-sunken" activeProps={{ className: "bg-selected" }}><Search className="h-4 w-4" /> AI search visibility</Link>
            {soon.map(({ label, icon: Icon }) => (
              <span key={label} aria-disabled="true" className="flex cursor-default items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" /> <span className="flex-1">{label}</span>
                <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-semibold">Soon</span>
              </span>
            ))}
            <Link to="/integrations" className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-sunken" activeProps={{ className: "bg-selected" }}><Plug className="h-4 w-4" /> Integrations</Link>
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-sunken" activeProps={{ className: "bg-selected" }}><ShieldCheck className="h-4 w-4" /> Admin</Link>
            )}
          </nav>

          <div className="mt-auto border-t px-5 py-4">
            <p className="truncate text-sm text-muted-foreground" title={user.email}>{user.email}</p>
            <button onClick={signOut} className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-8 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </Ctx.Provider>
  );
}
