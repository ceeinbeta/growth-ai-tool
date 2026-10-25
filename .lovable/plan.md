# Public site redesign

- Rebuild home with the requested copy and section order, clearly labeled sample funnel/AI visibility illustration, honest Live/Coming next labels, unchanged waitlist form, and expanded FAQ.
- Add an indexable Features page with detailed live features, quieter upcoming features, desktop contents navigation, number-label explanations and a closing waitlist link.
- Update the shared public header/footer with sticky navigation, accessible mobile drawer, session-aware account links and home-section links. Preserve privacy content and sign-in callback handling.
- Add the requested static public sitemap for home, Features and Privacy using the published origin, and preserve all robots exclusions while allowing Features.
- Verify mocked tests serially without real provider calls or database writes, plus desktop/mobile navigation, form submission with a mocked response and metadata.

## Technical details
- Reuse brand tokens, shadcn buttons/dialog primitives and the existing public-origin metadata helper.
- Use UI elements for the sample illustration, not a photo. No changes to application or waitlist logic.
- Static sitemap is the scoped fallback: absolute published URLs, no invented last-modified dates. Do not publish.