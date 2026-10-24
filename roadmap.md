# Slice 6
- [ ] Add founder-only admin tables, settings, and admin-checked invitation RPCs.
- [ ] Add Admin sidebar item and page with summary, waitlist, invites, and invite message dialog.
- [ ] Make the shared AI run cap read from settings with a 100 fallback.
- [ ] Run all tests with temporary-data cleanup; do not publish.

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