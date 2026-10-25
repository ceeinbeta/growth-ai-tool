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
