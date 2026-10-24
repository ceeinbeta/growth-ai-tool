# Slice 4: Conversion leaks

## Build
- Add a Conversion leaks page with measured, ordered visitor funnels, 7/30/90-day windows, default stage-aware steps, and a six-step editor.
- Show the supplied default benchmarks, require 100 first-step visitors before flagging a problem, and distinguish custom biggest drop-offs from benchmark warnings.
- Add a pasted-copy audit form, saved latest values, validated AI-written leaks, copy actions, and status-only editing.
- Add the open-leak link to Overview; preserve all existing tracking and profile screens.
- Block indexing on sign-in and signed-in pages and disallow all crawlers. Do not publish.

## Technical details
- Use member-scoped RLS and a security-invoker funnel aggregate; use atomic step replacement for reordering.
- Reserve audit/profile runs under the existing shared lock, with separate five-per-product limits and a combined rolling 100-run cap.
- Keep AI and privileged writes server-only; preserve existing profile behavior except the requested shared-cap copy.
- Store each audit and its leaks atomically; clients can only update leak status.

## Validation
- Run existing and new unit/database tests, including ordering, matching, permissions, caps, and output validation.
- All write tests use temporary products/workspaces with finally cleanup or rolled-back transactions, never pdfeye.net rows.
- Verify the signed-in funnel editor and a real pasted-copy audit end to end; remove verification rows afterward.

## Assumptions
- Funnel rates are fractions displayed as percentages; defaults use page match `*` for any pageview.
- An open leak means status Open; Doing, Done, and Dismissed are excluded from the Overview count.