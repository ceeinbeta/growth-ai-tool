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
- Managed auth deletion uses an application lifecycle cleanup trigger for memberships instead of a disallowed direct auth foreign key.
- Active product storage is initialized only in the client-only authenticated shell to avoid a first-product flash.


## Growloop architecture
- Website collection uses one server-only handler at /api/collect and a /api/public/collect alias used by the static snippet because published-site authentication only bypasses the public prefix.
- Database collection locks visitor and product before inserting events to enforce rolling limits and distinct custom names atomically across workers.
- Tracking reads use member-scoped RLS and a security-invoker aggregate RPC so measured totals cannot bypass workspace access.
- Signed-in pages live under src/routes/_authenticated (client-only gate, redirects to /auth); / just redirects. Why: session is in localStorage.
- Product limits are enforced by a DB trigger raising 'product_limit_reached'; the UI maps it to a friendly message. Why: users must not bypass plan limits.
- Workspace/membership rows are only created by the auth.users trigger; clients get SELECT only. Why: users must not edit plan limits or memberships.
- Website input normalization lives in src/lib/website.ts with tests. Why: one rule for storage format.
