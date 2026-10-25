# Technical audit slice
- [ ] Compact visibility summary, chart, questions, fixes and history; verify mocked interactions and desktop/mobile heights without writes or provider calls.
- [x] Add rule-based technical audit page, tables, reservation/save functions, sidebar link and next-step entry.
- [x] Mocked serial tests passed; real-site run not exercised (would write rows to the founder's product); not published.

# Page fetching and visibility copy
- [x] Add bounded same-site page extraction, ten hourly fetch reservations, provenance and paste fallback.
- [x] Explain usable-only visibility engines and individual failures.
- [x] 202 mocked tests passed serially; 50 integration tests skipped. Signed-in desktop/mobile preview checked without submitting audits; schema/grants verified and fetch rows remain zero. No publication or real-data changes.

# Review fixes
- [x] Repair robots and add regression checks; discovery origin is centralized with a static refresh command.
- [x] (superseded) Change sidebar Soon to Coming next; outline public header, expanded-profile confirmation and check opener while confirming; budget-stop and one connection label already correct.
- [x] 180 mocked tests passed serially; 50 integration tests skipped; public/signed-in read-only desktop and mobile navigation checks passed with no runtime errors, data writes or publishing.

# Founder d7 re-theme
- [x] Superseded by decision d15 Brand identity 01; layout, type scale and CTA alignment retained.
- [x] Finish d7 token audit and add shared action alignment across public and app screens.
- [x] 204 tests passed serially; 50 integration checks disabled for no-write safety. Measured contrast and captured all six requested screens on desktop/mobile, with loaded real read-only data and no provider calls.
- [x] Replace global tokens, typography, controls and logo/favicon; audit all visual usages without behavior changes.
- [x] Apply labeled source chips, chart colors and AI teaching treatments.
- [x] Run mocked serial tests and browser/contrast/focus checks without writes; document contrast exceptions; do not publish.

# Public redesign B2
- [x] Rebuild home, add Features, update shared public navigation/footer.
- [x] Add public sitemap and preserve robots exclusions.
- [x] Run mocked serialized tests and verify desktop/mobile without database writes; do not publish.

# Slice 7
- [x] Fix raw OpenAI text parsing and fail empty answers while preserving spend.
- [x] Show usable per-engine counts, calibrate estimates, and untick previously failed engines by default.
- [x] Run tests serialized and verify unchanged public-table/auth-user counts; unsafe legacy/global waitlist tests and unavailable rollback-setting tests skipped; no existing rows touched and no publication.
- [x] Fix recorded-cost budget stop and add mocked regression coverage.
- [x] Show session-only test results and remembered per-product engine choices, validated server-side.
- [x] Rerun all tests serially and do not publish; 176 passed, four shared-settings checks safely skipped because transaction execution permissions are unavailable.
- [x] Add visibility tables, budget setting, atomic check reservation, and admin summary fields.
- [x] Add engine price file, provider calls, extraction/fix generation, and check orchestration.
- [x] Add visibility page, nav item, Overview line, Admin budget card, and scheduled checks.
- [x] Run all tests with temporary-data cleanup; do not publish.

# Slice 6
- [x] Add founder-only admin tables, settings, and admin-checked invitation RPCs.
- [x] Add Admin sidebar item and page with summary, waitlist, invites, and invite message dialog.
- [x] Make the shared AI run cap read from settings with a 100 fallback.
- [x] Run all tests with temporary-data cleanup; do not publish.

# Slice 5
- [x] Add public home and privacy pages, current-host metadata, and crawler rules.
- [x] Add private consented waitlist with same-origin validation and atomic rate limits.
- [x] Run all tests and public/signed-in checks; remove temporary data; do not publish.

# Slice 4
- [x] Add ordered measured funnels, customization, and benchmarks.
- [x] Add copy audits, status-only leaks, and shared AI reservations.
- [x] Add Overview link and indexing restrictions.
- [x] Run all tests and signed-in verification with temporary-row cleanup; do not publish.

# Invite-only signup
- [x] Restrict new accounts with a private email allow-list; preserve existing sign-in and workspace creation.
- [x] Add atomic platform-wide profiling limit and friendly error messages.
- [x] Run all 55 tests including database signup, access, and rolling-limit tests; remove temporary data.
- [x] Verify blocked signup and signed-in views; explain adding invitations; do not publish.

# Slice 3 tracking fixes
- [x] Enforce Origin precedence and cover hostname cases with unit tests.
- [x] Revoke authenticated writes to tracking tables and verify signed-in reads.
- [x] Show private-address warning only on preview addresses.
- [x] Rerun all tests; keep app unpublished.

# Slice 3
- [x] Add privacy-respecting snippet, public collection, real events and atomic limits.
- [x] Add Integrations and measured seven-day Overview totals.
- [x] Harden grants and test collection, snippet size, and existing behavior.

# Slice 2
- [x] Add secure profiling, validated AI output, usage logging, and database limits.
- [x] Add editable profile and automatic post-create profiling.
- [x] Fix logo and saved active choice; safe membership cleanup instead of the prohibited direct auth foreign key.
- [x] Test limits, edit preservation, access, and the signed-in flow.
# UX part A
- [x] Overview redesign with next action, setup checklist, numbers, collapsed profile.
- [x] Shared skeleton, empty and error states; Saved toasts.
- [x] Product logos (auto fetch, upload, remove) with private storage and hourly limit.
- [x] Edit and owner-only delete; tests run serially, no rows left; not published.

- [x] Type scale + landing rewrite (d9): shared --text-* scale in styles.css, landing reordered for SEO/GEO with JSON-LD + llms.txt, 243 tests pass, preview-only.
- [x] Overview polish + Integrations as a feature: KPI row with 7/30/90 periods, funnel + recent activity, collapsible checklist, Coming-next integration list with mailto requests. 255 tests pass, preview-only.
- [x] Landing review: corrected shared FAQ claims and beta engine availability; generated dated absolute llms links and feature inventory through discovery refresh. 29 tests passed, 3 skipped; all 10 visible FAQ answers match JSON-LD in preview. No data writes or publishing.

# Brand identity 01 — d15
- [x] Replace shared visual theme, font families, radii and labels while preserving layout, type scale and actions.
- [x] Replace shared logo and browser/social assets; update leaf metadata and Organization.logo.
- [x] Update theme/type safeguards and design rules; 267 mocked tests passed serially, 53 database tests skipped for no-write safety. Preview build OK; requested eight screens captured at 1280px and 390px, no overflow/page errors. Contrast, keyboard focus and reduced motion checked; existing 40px/44px button sizing retained. No data writes, AI calls or publishing.

- [x] Type scale 1px smaller (shared tokens, 11px floor); "Coming next" label renamed to "Soon" everywhere. Rule: unbuilt features carry a visible "Soon" pill.
- [x] Overview compacted to four sections (header+next step, KPIs, funnel|activity+setup, collapsible profile); 1280 height 1648→808.
- [x] Homepage hero redesign: centered beta pill, two-line H1 with lime highlight, pill waitlist form (same behavior), honest line, trust chips, sample illustration.
