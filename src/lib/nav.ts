// Single source for the signed-in sidebar and mobile drawer.
// Items with `soon` are visible "Soon" labels, never links.
export type NavItem =
  | { label: string; to: "/overview" | "/conversion-leaks" | "/technical-audit" | "/ai-search-visibility" | "/integrations" | "/admin"; hash?: string; soon?: false; adminOnly?: boolean }
  | { label: string; soon: true };

export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { label: "Home", items: [{ label: "Overview", to: "/overview" }] },
  { label: "Growth audit", items: [{ label: "Conversion leaks", to: "/conversion-leaks" }, { label: "Technical audit", to: "/technical-audit" }] },
  {
    label: "Distribution",
    items: [
      { label: "AI search visibility", to: "/ai-search-visibility" },
      { label: "Google search growth", soon: true },
      { label: "Listing optimization", soon: true },
      { label: "Finding conversations", soon: true },
    ],
  },
  { label: "Analytics", items: [{ label: "Results", soon: true }, { label: "Competitor gaps", soon: true }, { label: "Experiments", soon: true }] },
  {
    label: "Foundation",
    items: [
      { label: "Product profile", to: "/overview", hash: "profile" },
      { label: "Website tracking", to: "/integrations", hash: "tracking" },
      { label: "Integrations", to: "/integrations" },
      { label: "Admin", to: "/admin", adminOnly: true },
    ],
  },
];

export function visibleNav(isAdmin: boolean): NavGroup[] {
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.soon || !i.adminOnly || isAdmin) }));
}
