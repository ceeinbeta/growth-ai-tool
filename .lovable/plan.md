# Technical audit slice

A new signed-in page "Technical audit" (Growth audit group) that checks whether Google and AI assistants can find, read and understand the founder's site. Rule-based checks only — no AI model calls, no cost per run. All "how to fix" text is hand-written. Preview only, no publishing.

## Page and navigation

- New route `/technical-audit` under `_authenticated`, noindex, with `PageHeader` (title + one-line purpose) and a primary "Run technical audit" button top-right.
- `src/lib/nav.ts`: replace the "Technical audit" Coming next item with a real link to `/technical-audit`. Sidebar test updated for the new link.
- Overview next-step: add a "Run a technical audit" step after the page-audit step and before the visibility step, keyed off whether a technical audit exists. Existing order tests updated to include the new step; earlier steps keep their order.

## Checks (each: Pass / Needs attention / Could not check, text label always, one plain "why it matters" sentence plus hand-written how-to-fix)

1. **Reachability** — HTTPS fetch of the product URL: final status, redirect count, measured response time in ms (labeled "Measured").
2. **Basic tags** — title tag and meta description present with sensible lengths, exactly one h1, canonical link, viewport tag, html language attribute.
3. **Social preview** — og:title, og:description, og:image present.
4. **Structured data** — JSON-LD blocks parsed; list which types were found (Organization, Product, SoftwareApplication, FAQPage, ...). Missing types are named; no markup is fabricated.
5. **robots.txt** — fetched from the product's own host; reports whether it blocks Googlebot or the common AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot) site-wide, listing which; checks whether a sitemap is referenced and reachable.
6. **llms.txt** — present or not, labeled "an emerging convention, not a Google requirement".
7. **Pricing page** — if the homepage links to /pricing (same site), fetch it and report whether readable text with prices exists in the raw HTML (not only via JavaScript). If no pricing link exists: "Could not check".
8. **Readable without JavaScript** — visible-text length of the raw homepage HTML; Needs attention under ~300 characters.

Copy rule: checks "remove common blockers" — never claim they improve rankings or AI recommendations.

## Fetching and limits

- Reuse `safeGet` / `readCapped` from `logo.server` and the validators from `install-check` / `audit-fetch`: https only, public host, same site as the saved product URL, ≤3 revalidated redirects, 8 s timeout, 1 MB cap, no cookies. Every hop revalidated; redirect to another host fails the check.
- At most 6 fetches per audit (homepage, robots.txt, sitemap, llms.txt, pricing page, plus redirect hops counted within each fetch), all on the product's own domain.
- Rate limit: 10 audits per product per rolling hour via a new service-only reservation function `reserve_technical_audit` (same shape as `reserve_audit_fetch`: product lock, count, insert, EXECUTE granted to service_role only).

## Data

- New tables `technical_audits` (id, product_id, fetched_url, fetched_at, summary counts, created_at) and `technical_audit_findings` (id, audit_id, check key, status, detail, why, fix, position), both with `product_id`-based RLS matching the existing tables: workspace members can read; writes only through service-role functions; no grants to anon.
- Save function `save_technical_audit` (SECURITY DEFINER, service_role only) writes one audit plus its findings atomically.
- The page shows the latest run with fetched URL and time, a top summary (counts of Needs attention, single most important fix first), and a history of the last 5 runs with a "Re-run" action.
- No raw error text or provider output is ever shown; failures map to plain messages.

## Server function

- `runTechnicalAudit` (POST, `requireSupabaseAuth`): loads the product through the caller's session (RLS), reserves via admin client, runs the checks server-side, saves via the service-only function, returns `{ ok }` or a plain error. A member-scoped query loads the latest run and history for the page.

## Tests (mocked fetch only, serial, zero rows left behind)

- Blocked/private host, redirect to another host, oversized body, JS-only thin page, robots.txt blocking AI crawlers, missing structured data, and a full success case.
- Rate-limit helper, reservation/save functions through the database test pattern with temporary rows cleaned in `finally`.
- Sidebar test updated for the real link; next-step tests updated for the new step without breaking the existing order.

## Left alone

- No changes to AI providers, page audits, funnels, tracking, visibility, waitlist, admin, public pages, database limits or existing RLS. No AI calls anywhere in this slice.
