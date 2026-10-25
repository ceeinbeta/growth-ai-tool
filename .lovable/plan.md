# Finding conversations — Hacker News first

## Scope
Build a working signed-in `/conversations` page in preview only. Hacker News is the only live source; Reddit and X remain **Soon**. Keep d15 colors, the current type scale, shared PageShell/PageGrid and ActionRow, and existing features. No publishing, scheduled scans, automatic replies, emails or submissions.

## Page and founder workflow
- Replace the Distribution sidebar’s disabled Finding conversations item with a real link.
- Compact header: **Finding conversations**, “Hacker News, public posts”, last scanned time, and **Scan Hacker News**.
- Summary: actual New, Saved and Replied counts. Status and minimum-score filters above a score-sorted list.
- Main column (8/12): each opportunity shows its title, excerpt, age, points/comments, **Rule-based score**, and four labeled score bars. Open on Hacker News opens a safe new tab. Save, Dismiss, Draft a reply and I replied are explicit manual actions; notes can be edited.
- Context column (4/12): editable search terms, sources (HN live; Reddit Soon; X Soon), last five scans, limits and **“You post it yourself. Growloop never posts for you.”**
- Reply editor expands inline with Copy, saved edits, **“AI-written. Edit before you post.”**, and a reminder to read community rules. Copying never marks an opportunity replied; only I replied does.
- Single-column mobile stacking, compact matching loading states, readable error/empty states, keyboard-accessible controls and existing focus conventions.

## Search and score
Default terms come from category, competitors and buyer questions. The founder can save up to ten plain-text terms per product. First use derives defaults without silently writing them; saved terms take precedence.

A scan makes one request for each distinct nonempty term, up to ten requests, without pagination, automatic retries or redirects. Deduplicate hits across terms and rescans by product + source + HN item ID. Preserve statuses, notes and edited drafts when refreshing post details. Store only a plain-text excerpt of up to 500 characters, never a full thread.

**Scoring assumptions:** each part is normalized to 0–100, then the total is rounded from `intent × .4 + fit × .3 + reach × .2 + ease × .1`.
- **Intent:** bounded points for question language, looking for / alternative to / recommend / how do I / any tool, saved competitor mentions and Ask HN.
- **Fit:** normalized meaningful-word overlap with category, audience and saved buyer questions; exclude common stop words.
- **Reach:** logarithmic points/comment counts with documented saturation values, not an audience estimate.
- **Ease:** recency plus fewer comments; dead/deleted/known-locked posts are excluded. Missing lock information is not presented as a confirmed unlocked state.

Show the component scores and plain explanations; never label them measured conversions or promise signups. Exact scoring thresholds will live in one tested rule module.

## Safe storage and limits
- Add the requested opportunities, reply_drafts and scan_runs tables, plus small private per-product search-term and reservation storage needed for saved terms and failed-attempt limits.
- Explicit authenticated SELECT grants and `can_access_product` policies; no anonymous grants or direct member writes. Enforce product/opportunity consistency, allowed statuses, score bounds and uniqueness in storage.
- All changes pass through authenticated server actions that verify product access before calling service-only write functions. Atomic reservations prevent concurrent scans/drafts bypassing caps.
- **Scans:** six per rolling hour and thirty per rolling 24 hours per product. Failed scans also consume a reservation; history distinguishes failures/partial scans from successful zero results. Found counts unique matching items; new_count counts only newly inserted opportunities.
- **Drafts:** five per rolling 24 hours per product, also counted in the existing configurable combined daily AI cap. Extend shared reservation counting and Admin totals without changing the current cap or profile/audit limits. Log actual known usage; unknown costs remain blank.

## Reply safeguards
Generate only after a Draft a reply click, through the existing server-held AI gateway. Use the current default model for this new call; existing models and settings stay unchanged.

The prompt treats the saved title/excerpt and product details as untrusted data. It asks for a helpful, specific, non-promotional answer first; a product mention only when genuinely relevant and at most once, with **“I'm the maker of …”** disclosure; no links unless the post asks, and no pressure language. Validate the result before saving. Never generate during scans or use any posting tool. Preserve the gateway’s safe errors, persistent denial/pause handling and explicit cancellation rules.

## Integration and honest discovery
- After a usable visibility check, Overview can suggest **Scan for conversations** when no successful conversation scan exists. Use recorded scan data, not invented completion. Link the existing conversations checklist item to the page without changing Find / Fix / Prove.
- Once the end-to-end mocked workflow works, move Finding conversations into the shared live feature inventory with explicit Hacker News-only coverage and manual reply drafting. Keep Reddit/X labeled Soon wherever mentioned.
- Give the page unique noindex metadata; add `/conversations` to private crawler exclusions and regenerate discovery files. Do not add it to the public sitemap.

## Checks and reporting
- Run mocked tests serially for HN parsing, fixed-host HTTPS allow-list, redirect refusal, eight-second timeout, 1 MB streamed-response cap, request count, score weights/parts, rescan deduplication, limits, status/notes edits and draft preservation.
- Test authenticated isolation and service-only writes using the existing mocked access pattern plus migration-policy assertions; optional real-database isolation tests use temporary fixtures with finally cleanup only, never founder rows.
- Test prompt guards/disclosure, no automatic posting, shared draft reservations/usage, safe gateway failures, UI filters/actions/draft editing/copy and truthful live/Soon copy.
- Verify the central workflow with mocked HN and AI responses, without real external calls or test rows. Check authenticated real-data reads separately without scanning or drafting against the founder’s product.
- Capture and **view** desktop (1440) and mobile (390) screenshots, including opportunity detail and reply editor. Check overflow, keyboard focus, loading/error states and preview logs.
- Report what changed, what stayed untouched, tests passed/skipped, zero-row cleanup, screenshot observations and any live-service behavior not exercised. No publishing.

## Technical implementation
Use client-safe `*.functions.ts` wrappers with authentication middleware and server-only HN/scoring/drafting helpers; fixed-host Web fetch with cookie omission, manual redirects, an 8-second abort deadline, capped stream reader, and the requested User-Agent. This public HN API is not an Algolia connector and needs no key. Apply schema changes through the migration tool, preserving existing grant and reservation-lock conventions. Keep scoring/term derivation testable without network calls and UI pieces small enough to test independently.