# Landing review fixes

- Update the shared FAQ with the requested comparison, engine-availability and paid-plan wording; keep page answers and FAQPage data identical.
- Qualify beta engine availability in Home, Features and llms.txt without changing connections or app behavior.
- Generate llms.txt through the existing discovery refresh, using the shared origin, public page paths, live/coming feature inventory and a last-updated date.
- Add focused tests for inventory parity, discovery synchronization and prohibited public claims; run public-page tests serially and check the preview.

## Unchanged
Dashboard, integrations behavior, waitlist, privacy, authentication, limits, providers and stored data. No publishing.

## Technical details
Keep FAQ data in public-faq.ts. Extend the static discovery generator, not server logic. Permit “ranking” only within a sentence that explicitly says “not”; remove “guarantee” even from disclaimers.