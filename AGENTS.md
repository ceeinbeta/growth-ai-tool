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
- Profile reservations acquire one shared transaction advisory lock before product locks and enforce both rolling limits in the same RPC; concurrent workers cannot bypass the shared cost safeguard.
- Invite-only signup uses a private service-role-only allow-list and an app-owned BEFORE INSERT auth lifecycle trigger; existing sign-in and the AFTER INSERT workspace trigger remain independent.
- Invitation and shared-limit database tests create auth fixtures through the admin API and explicitly clean temporary users, invitations, workspaces, and reservations in finally blocks; tests must never send real emails or call AI.
- Managed auth deletion uses an application lifecycle cleanup trigger for memberships instead of a disallowed direct auth foreign key.
- Active product storage is initialized only in the client-only authenticated shell to avoid a first-product flash.


## Growloop architecture
- Website collection uses one server-only handler at /api/collect and a /api/public/collect alias used by the static snippet because published-site authentication only bypasses the public prefix.
- Collection checks the Origin header when present and only falls back to the body hostname when absent; this prevents a copied tracking key from bypassing origin checks through a forged body.
- Authenticated tracking-table access is read-only; collection writes stay privileged so clients cannot forge events through the Data API.
- Database collection locks visitor and product before inserting events to enforce rolling limits and distinct custom names atomically across workers.
- Tracking reads use member-scoped RLS and a security-invoker aggregate RPC so measured totals cannot bypass workspace access.
- Signed-in pages live under src/routes/_authenticated (client-only gate, redirects to /auth); / just redirects. Why: session is in localStorage.
- Product limits are enforced by a DB trigger raising 'product_limit_reached'; the UI maps it to a friendly message. Why: users must not bypass plan limits.
- Workspace/membership rows are only created by the auth.users trigger; clients get SELECT only. Why: users must not edit plan limits or memberships.
- Website input normalization lives in src/lib/website.ts with tests. Why: one rule for storage format.
- Install checks fetch only the saved website host over https with per-hop redirect re-validation (src/lib/install-check.ts) and a server-only reserve_install_check RPC for the hourly cap. Why: prevents the server fetch from reaching internal addresses or being abused.
