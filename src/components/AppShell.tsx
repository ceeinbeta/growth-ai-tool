import { Link, Outlet, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";
import { Check, ChevronsUpDown, Plus, LogOut, Menu } from "lucide-react";
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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getStoredActive, setStoredActive, workspaceQuery, type Product, type WorkspaceData } from "@/lib/workspace";
import { isAdminQuery } from "@/lib/admin";
import { visibleNav } from "@/lib/nav";
import { Button } from '@/components/ui/button';

type ActiveCtx = { data: WorkspaceData | undefined; active: Product | null; setActive: (id: string) => void };
const Ctx = createContext<ActiveCtx>({ data: undefined, active: null, setActive: () => {} });
export const useActiveProduct = () => useContext(Ctx);

export const stageLabel = (s: Product["stage"]) => (s === "live" ? "Live" : "Pre-launch");

const itemClass = "flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-sunken";
const activeClass = "bg-selected text-foreground selected-state";

export function SidebarNav({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-4 px-3 py-5" aria-label="Main">
      {visibleNav(isAdmin).map((group) => (
        <div key={group.label}>
          <p className="nav-group-label px-3 pb-1">{group.label}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.label}>
                {item.soon ? (
                  <span aria-disabled="true" className="flex cursor-default items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
                    <span className="flex-1">{item.label}</span>
                    <span className="status-chip status-coming">Coming next</span>
                  </span>
                ) : (
                  <Link
                    to={item.to}
                    {...(item.hash ? { hash: item.hash } : {})}
                    onClick={onNavigate}
                    className={itemClass}
                    activeOptions={item.hash ? { includeHash: true } : { exact: true, includeHash: false }}
                    activeProps={{ className: activeClass }}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { data } = useQuery(workspaceQuery);
  const { data: isAdmin } = useQuery(isAdminQuery);
  const [activeId, setActiveId] = useState<string | null>(() => getStoredActive());
  const [drawer, setDrawer] = useState(false);
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

  const switcher = (
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
              className={`gap-3 ${p.id === active?.id ? "bg-selected selected-state" : ""}`}
            >
              <ProductLogo name={p.name} path={p.logo_path} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.name}</span>
                <span className="block text-xs text-muted-foreground">{stageLabel(p.stage)}</span>
              </span>
              {p.id === active?.id && <Check className="h-4 w-4 text-foreground" />}
            </DropdownMenuItem>
          ))}
          {products.length > 0 && <DropdownMenuSeparator />}
          {products.length >= max ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">Standard includes {max} products.</div>
          ) : (
            <DropdownMenuItem onSelect={() => { setDrawer(false); navigate({ to: "/products/new" }); }} className="gap-3 text-foreground">
              <Plus className="h-4 w-4" /> Add product
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const account = (
    <div className="mt-auto border-t px-5 py-4">
      <p className="truncate text-sm text-muted-foreground" title={user.email}>{user.email}</p>
      <Button variant="link" onClick={signOut}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );

  return (
    <Ctx.Provider value={{ data, active, setActive }}>
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-4 py-3 md:hidden">
          <Link to="/overview"><Logo /></Link>
          <Sheet open={drawer} onOpenChange={setDrawer}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col overflow-y-auto bg-sidebar p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="px-5 pt-5"><Logo /></div>
              {switcher}
              <SidebarNav isAdmin={!!isAdmin} onNavigate={() => setDrawer(false)} />
              {account}
            </SheetContent>
          </Sheet>
        </header>

        <aside className="hidden shrink-0 flex-col overflow-y-auto border-r bg-sidebar md:sticky md:top-0 md:flex md:h-screen md:w-64">
          <div className="px-5 pt-5">
            <Link to="/overview"><Logo /></Link>
          </div>
          {switcher}
          <SidebarNav isAdmin={!!isAdmin} />
          {account}
        </aside>

        <main className="min-w-0 flex-1 px-5 py-8 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </Ctx.Provider>
  );
}
