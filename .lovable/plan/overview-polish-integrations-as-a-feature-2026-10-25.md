# Overview polish + Integrations as a feature

Preview only, no publishing. Real data only; measured/sample/benchmark labels kept. No connectors are built or wired — Coming next items stay non-clickable.

## A. Overview polish

- **Layout:** widen to a 12-column grid at max width ~1200px (`grid-cols-1 lg:grid-cols-12`, cards spanning 4/6/8/12), same card padding (p-5/p-6) and gaps (gap-6) everywhere. No card taller than its content.
- **Header:** existing product header (logo, name, URL, stage chip, edit) gains a "last updated" line from the latest real record (last event/audit/check — whichever is newest), nothing invented.
- **KPI row:** 4 tiles — Visitors, Signups (or Waitlist joins for pre-launch), Conversion rate, Biggest leak step. Each: DM Mono label, tabular value, change vs the previous equal period when both periods have data (else "Not enough data yet" + reason), and a source chip (Measured / Benchmark / Sample). A 7/30/90 segmented control (URL search param, keyboard-navigable) drives all tiles.
  - Needs `tracking_summary(pid, days)` to accept a period and return current + previous-period totals: small migration extending the existing security-invoker RPC (default keeps current behavior). Conversion rate = signups or joins ÷ visitors, measured; benchmark label only on default funnels per existing rules. Biggest leak step comes from `funnel_summary`, flagged only after 100 visitors at step 1 (existing rule).
  - No fake charts; no trend lines (needs 2+ real periods — change percentages only).
- **Middle:** funnel summary card (steps with drop-off from `funnel_summary`, worst-step flag per the 100-visitor rule, link to Conversion leaks) beside a "Recent activity" list built from real records: last page audit, last technical audit, last AI visibility check, snippet last seen — each with timestamp and a link. Empty states get one clear action each.
- **Bottom:** setup checklist (collapsed to a summary line with an expand control when all done), the Find/Fix/Prove strip moves out of the Next-step card to sit here, and the profile summary stays. Remove duplicated info: the AI-visibility and open-leaks tiles are replaced by the KPI row; the loop strip appears once.
- **Polish:** skeletons shaped like the final cards (no layout jump), one toast pattern via sonner (`<Toaster />` mounted once in `__root.tsx`) for save/error feedback on this page, consistent lucide icons at size-5, tabular-nums on all numbers, hover/focus states already global. Mobile stacks to one column.

## B. Integrations as a feature (presentation only)

- **Integrations page:** two sections. "Live now": Website tracking, OpenAI, Perplexity, Claude (existing cards unchanged). "Coming next", in this order, none clickable, one-line benefit each: Google Search Console (which searches bring visitors), Google Analytics, PostHog, Stripe (revenue per channel), Bing Webmaster Tools, Slack (weekly summary and alerts you approve), Notion/CSV export (take your reports with you). List lives in `src/lib/integrations.ts`.
- **Request an integration:** tertiary mailto link to hello@mcads.co with the integration name prefilled in the subject. No form, nothing stored.
- **/features:** short "Integrations" section with the same list and Coming next pills.
- **Landing:** the "Get discovered" block mentions these as Coming next without implying they work.

## Tests and checks

- Mocked serial tests: KPI period/change math (enough-data rules), tracking_summary days parameter, integrations list order and non-clickability, mailto subject, checklist collapse, sidebar/integration tests updated. Zero rows left behind; no AI calls.
- Browser pass at 1280/390 on Overview and Integrations: no overflow, skeletons match, segmented control works, toasts fire on save/error.

## Left alone

Tracking snippet and collection, funnel editor, audit/visibility logic and limits, waitlist, admin, auth, public page SEO metadata.
