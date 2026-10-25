# Brand identity 01 — decision d15

Replace the d7 visual identity in the existing shared theme. Dashboard/Integrations and copy fixes are already complete; preserve those results. Preview only, no publishing.

## 1. Shared theme and typography
- Set exact canvas, paper, white, Ink, brand-green, brand-bright, line and brand-deep tokens supplied in the brief.
- Keep original muted as a palette reference; use **#62746E** for readable muted text. Along the proposed muted color family, this is the lightest integer shade passing both surfaces: **4.503:1 on canvas; 4.804:1 on paper**. A one-step lighter shade fails canvas. Use Ink instead on bright fills and other surfaces where muted would fail.
- Use DM Sans 400/500/600 everywhere; remove Manrope, DM Mono, Georgia and violet treatments. Preserve existing font sizes, line heights, layout, spacing and ActionRow/button dimensions. Headings use 500–600; large public headings get the requested tracking; labels/eyebrows use 600, uppercase, 12px and 0.12–0.14em tracking.
- Public framed hero/feature cards: 32px radius; app cards/dialogs: 20px; controls: 12px. Apply the specified shadow only to existing hero cards, without introducing new frames or changing the layout.
- Primary actions: bright/Ink with darker lime hover. Secondary: Ink outline. Tertiary: underlined brand-deep. Selected navigation: 22% bright tint with 3px Ink bar. Keep keyboard focus and reduced-motion rules.
- AI chips say **AI-written**, with bright tint and Ink. Warning/danger remain labeled, Ink on their tints. Brand green is restricted to logo, graphics, chart fills and decoration; no normal text or small information icons.

## 2. One logo and related assets
- Replace the shared Logo with the exact supplied primary paths and circles, supporting lockup/mark-only, default/inverse/ink tones and shared sizes. Use the requested wordmark font, tracking, proportions and gap.
- Apply it to sidebar, mobile navigation, sign-in, public header/footer and root 404/error shells. Preserve customer product images and initial fallbacks.
- Keep the exact living-infinity mark available but unused.
- Generate favicon.svg on a paper rounded square, 32px PNG, 180px apple-touch icon and a crisp 1200×630 social image containing the lockup and existing tagline. These use the actual SVG geometry, not AI-generated approximations.
- Add browser-icon links, absolute matching OG/Twitter image tags on content pages (not the root layout), and Organization.logo to the existing JSON-LD. Preserve canonical URLs and FAQ data. Sharing changes remain preview-only until a future publish.

## 3. Guardrails and verification
- Update existing theme/contrast, label and type-scale safeguards for d15. Add concrete scanner tests rejecting text-primary/brand-green text and hard-coded hex outside the shared theme source. Generated assets derive their colors from theme tokens; logo geometry has one source.
- Keep existing action alignment tests and run mocked tests serially, with database-write tests disabled. No model calls, connectors, test users or stored rows.
- Check sidebar, Overview, AI search visibility, Integrations, Admin, sign-in, landing and Features at desktop and 390px mobile; include screenshots, no-overflow checks, keyboard focus, target sizing and reduced-motion checks. Exercise signed-in screens with the available managed session, without triggering writes.
- Update AGENTS.md/design notes and roadmap; mark d7 superseded by d15.
- Report exact tokens and type roles, a full contrast table of every text/background pairing actually used, AA results, changed screens, tests and screenshot notes. If access to a signed-in screen is unavailable, name that verification limitation rather than claim it passed.

## Initial contrast verification
| Pair | Ratio | Normal-text AA |
|---|---:|---|
| Ink / paper | 12.883 | Pass |
| Ink / canvas | 12.077 | Pass |
| Ink / brand-bright | 8.538 | Pass |
| Brand green / paper | 2.898 | Fail; decorative only |
| White / brand green | 2.986 | Fail; no button/text pairing |
| Ink / brand green | 4.445 | Fail; no normal text on green |
| Brand-deep / paper | 5.113 | Pass |
| Brand-deep / canvas | 4.793 | Pass |
| White / brand-deep | 5.268 | Pass |
| Original muted / canvas | 4.140 | Fail; replaced for text |
| Derived muted / canvas | 4.503 | Pass |
| Derived muted / paper | 4.804 | Pass |

The final report will also cover hover, selected, input, dark-field, AI, warning and danger surfaces after implementation.

## Technical details
Use the current TanStack route/head structure, styles.css semantic tokens and shadcn variants. Update font loading in the root head. Keep type-scale sizes and ActionRow rules intact. Generate raster assets from the shared SVG and DM Sans through a local rendering workflow; retain assets in project paths. No live Figma connection is required because the exact colors and SVG paths were provided.

## Left alone
All product functionality, data/security rules, caps, provider availability, tracking, audits, invite-only authentication, waitlist, FAQ claims, public discovery policy and customer logos. No connectors, backend changes or publishing.