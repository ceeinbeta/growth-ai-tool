# Review fixes — preview only

- Replace robots with one wildcard block, allow public pages, and disallow the listed private paths plus existing auth/API exclusions. Add missing-agent, duplicate-line and admin-exclusion checks.
- Keep the discovery origin easy to change without altering current-host page metadata.
- Label every upcoming-feature mention “Coming next”, with no destination suggesting it is available.
- Remove competing primary buttons in each action area using shared outlined/text variants.
- Verify the existing actual-cost budget-stop regression and one Connected label per engine; leave correct logic unchanged.
- Run mocked tests serially and preview checks without provider calls or database writes. Do not publish.

## Technical details
- Preserve shared theme tokens, feature behavior, security, limits, and public sitemap implementation.
- Use one discovery-origin configuration and an explicit static-file refresh command if practical; do not introduce a server sitemap.