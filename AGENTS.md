<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Profile architecture
- AI profiling uses one authenticated RPC with RLS product reads and privileged usage/reservation writes; keys and providers stay in server-only modules.
- Database triggers preserve field edit ownership and serialize item caps; atomic profile replacement preserves founder-owned content under concurrent edits.
- Rolling profile-run reservations are separate from per-call usage so a malformed-output retry counts as one run.
- Profile, audit and reply-draft reservations share one transaction advisory lock before product locks, preserving separate per-product caps and one combined rolling cap; retries count as one reservation.
- Invite-only signup uses a private service-role-only allow-list and an app-owned BEFORE INSERT auth lifecycle trigger; existing sign-in and the AFTER INSERT workspace trigger remain independent.
- Invitation and shared-limit database tests create auth fixtures through the admin API and explicitly clean temporary users, invitations, workspaces, and reservations in finally blocks; tests must never send real emails or call AI.
- Managed auth deletion uses an application lifecycle cleanup trigger for memberships instead of a disallowed direct auth foreign key.
- Active product storage is initialized only in the client-only authenticated shell to avoid a first-product flash.


## Brambly architecture
- Brambly d16 lives in a self-contained design-system subtree with theme, components and helpers; legacy imports re-export it. Supplied logos are immutable; src/index.ts exports only attach-safe code. Why: faithful assets and working consumer snapshots. Button owns sizing; ActionRow placement; PageShell/PageGrid layout.
- Manual visibility engine choices use a per-product browser preference and server-side connected-engine validation; why: remembered choices must not bypass key availability.
- Visibility reads classify legacy empty excerpts as unusable without database writes; why: sample math must exclude empty answers while preserving historical rows and spend.
- Funnel aggregation uses security-invoker ordered first-match chains and computed defaults; step edits use an atomic member-scoped replacement RPC to avoid reorder collisions.
- Page audits read products and measured funnels as the caller, fetch through the shared logo safety helpers with service-only atomic hourly reservations, and save provenance with findings atomically; clients have only column-level leak-status update rights.
- Website collection uses one server-only handler at /api/collect and a /api/public/collect alias used by the static snippet.
- Collection checks the Origin header when present and only falls back to the body hostname when absent; a forged body must not bypass origin checks.
- Authenticated tracking-table access is read-only; collection writes stay privileged so clients cannot forge events through the Data API.
- Database collection locks visitor and product before inserting events to enforce rolling limits and distinct custom names atomically across workers.
- Tracking reads use member-scoped RLS and a security-invoker aggregate RPC so measured totals cannot bypass workspace access.
- Signed-in pages live under src/routes/_authenticated (client-only gate, redirects to /auth); home and privacy are public SSR pages.
- Product limits are enforced by a DB trigger raising 'product_limit_reached'; the UI maps it to a friendly message. Why: users must not bypass plan limits.
- Workspace/membership rows are only created by the auth.users trigger; clients get SELECT only. Why: users must not edit plan limits or memberships.
- Website input normalization lives in src/lib/website.ts with tests. Why: one rule for storage format.
- Install checks fetch only the saved website host over https with per-hop redirect re-validation (src/lib/install-check.ts) and a server-only reserve_install_check RPC for the hourly cap.
- Waitlist submissions use a bounded same-origin handler and service-only atomic save/reservation RPC; public roles have no storage access.
- Public pages derive canonical URLs from the current request origin; contact and optional landing tracking are centralized in public-config.
- Product logos live in a private bucket under a product-id folder, readable only by workspace members through signed URLs; site icons are fetched with the install-check URL validator, identified by file bytes, and capped by a member-callable reserve_logo_fetch RPC. Why: no public files, no unsafe fetches, no svg.
- Product deletion goes through an owner-checked SQL function relying on foreign-key cascades; edits use the shared product-form validator. Why: one validation rule and no orphaned data.
- Overview setup progress is computed from real rows in src/lib/setup-checklist.ts with tests. Why: completion must never be invented.
- Technical audits are rule-based: bounded safe fetches, service-only reservations and saves; no AI or invented claims.

- Public feature facts are shared by home and Features; public navigation uses router links with home hashes for section jumps. Why: one honest feature inventory and consistent navigation.
- Public discovery stays static: `src/lib/public-discovery.ts` owns the origin, public/private paths and llms update date; run `bun run refresh:discovery` after changes to refresh robots, sitemap without lastmod and llms.txt derived from public-features. Why: one domain and feature inventory, no private URLs or stale discovery copy.
- Signed-in navigation lives in src/lib/nav.ts for sidebar and mobile drawer; unbuilt features carry a visible "Soon" pill and are never links.
- Overview has at most four top-level sections; visibility uses filtered compact results and inline details. Why: keep key data scannable.

- Conversations use fixed-host server-only HN searches, atomic service-only scan/draft reservations and member-read storage; rescans preserve manual status/notes and replies are never submitted. Why: private founder workflow and bounded read-only collection.
