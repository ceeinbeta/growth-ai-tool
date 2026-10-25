# Founder d7 theme and CTA alignment

Keep the completed d7 re-theme, existing copy, behavior, data and limits. Preview only; do not publish.

- Finish the token audit: remove any remaining lime-on-light text and keep violet restricted to teaching and AI-written content.
- Standardize buttons at 40px, with 48px large public buttons, consistent padding/radius/icon spacing.
- Add shared action rows for cards, forms, dialogs and public sections: right-aligned desktop actions, primary-first full-width mobile actions. Align page-header actions right on desktop and below titles on mobile.
- Align engine-card testing links in a grid. Remove one-off button heights and alignment margin hacks.
- Add source checks for shared sizing/alignment and preserve existing theme/status safeguards.
- Run the test suite serially with providers mocked and database-writing integration tests disabled. Verify read-only desktop/mobile screens, focus, labels and reduced motion; capture Overview, AI visibility, Integrations, Admin, home and Features when authentication is available.
- Report exact tokens/type roles, measured contrast, changed screens and test results. Danger/warning tinted labels retain Ink text because their specified colored text fails AA.

## Technical details
Use shared Button variants and a small ActionRow component with header/section layouts. Visual edits only; no server or database changes. Headline tracking remains zero to comply with the platform typography constraint.