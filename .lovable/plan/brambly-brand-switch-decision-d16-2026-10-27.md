# Brambly brand switch — decision d16

## Result
Replace Growloop’s visible identity with Brambly throughout the preview. Keep existing pages, compact layouts, actions, “Soon” labels, honest claims, and all product behavior. Do not publish.

## 1. Shared Brambly foundation
- Replace d15 colors and the old smaller type scale in one canonical theme file. Remove obsolete bright/deep/green tokens and their styling rules, updating all consumers together.
- Apply the exact Forest, cream, Ink, white, field, border, status and sidebar roles. Secondary text uses muted only on white and muted-strong on cream; warning is never text-colored amber.
- Load only Manrope and DM Sans with `display=swap`. Apply 16px/26px minimum reading, form, table and list text; 12–13px metadata; 14–15px buttons; the specified public and app heading/number scales.
- Apply shared spacing, radii, elevations, 200ms motion, reduced-motion support and visible two-pixel focus rings. Retain the efficient grids and ActionRow alignment rather than compensating with page-specific font reductions.

## 2. Assets and controls
- Preserve the three uploaded SVG files byte-for-byte under the library’s logo assets. Replace the shared Logo with typed lockup/symbol and default/inverse options; update headers, footer, sidebar, sign-in and fallback screens.
- Use the supplied favicon SVG exactly, generating 32px and 180px PNGs from it. Replace the social image with a 1200×630 cream composition containing the real green lockup and “Find your way to growth.” in Manrope.
- Replace old mark geometry and assets after removing their consumers. Connect the new assets to route-specific OG/Twitter tags and Organization.logo without changing the site address.
- Restyle shared buttons, inputs, chips, cards, KPI tiles and sidebar. Use Forest primary pills, outlined secondary pills, underlined tertiary links and labeled statuses. Document default, hover, focus and disabled states.
- Reuse a shared globe-and-pill URL-field presentation for the product website field and the hero’s combined input/action treatment, while retaining their existing submissions, validation and consent behavior.

## 3. Name and voice
- Rename user-visible Growloop references to Brambly: pages, accessible names, notices, FAQs, privacy, manual invitation copy, metadata, discovery documents and outbound User-Agent identification.
- Set the exact hero and definition sentence, “Untangle your growth.” product line and “Diagnose. Improve. Grow.” steps. Diagnose and Improve describe built functionality; Grow retains a visible “Soon” label until change attribution is built.
- Preserve truthful feature qualifications, measured/estimated/sample labels, manual posting reminders, contact links and consent text requirements. Refresh FAQ structured data from the same FAQ source.
- Keep database/function names, environment names, tracking API and key prefixes, `t.js`, routes, repository/project identifiers, current lovable.app addresses and mcads.co links unchanged.
- Do not edit the sign-in email template or auth configuration. Inspect available read-only settings if supported and report whether the email itself still mentions Growloop; source code alone cannot establish that.

## 4. Save the reusable design system
- Preserve all existing product pages as the preview, while organizing reusable components, the canonical theme and their shared helpers into a self-contained library subtree.
- Maintain the local export barrel, required library classification/source files and author-owned guidance so an attached consumer receives working components and tokens. Keep app-only business flows out of that export.
- Include a permanent preview-only foundation/control showcase for visual states; do not replace or remove existing routes.
- Record d16 architecture in AGENTS.md and supersede d15 knowledge. Update roadmap status as each part is verified; generated reference files remain publish-generated, not hand-authored.

## 5. Verification and report
- Capture baseline and final heights at 1440px and 390px for Overview, Conversion leaks, AI search visibility, Technical audit, Integrations, Admin and Conversations, using the same read-only state for each comparison.
- Inspect screenshots at both widths for sidebar, Overview, AI visibility, Integrations, Admin, Conversations, landing, Features and sign-in. Check full-width layouts, wrapping, focus, internal table scrolling, labels and loading/fallback screens. Larger body text may increase heights; no new compact-font exceptions.
- Update and run mocked tests serially for brand assets, exact tokens, contrast, type scale, copy honesty, internal-name allowances, discovery, hero, sidebar and logos; run relevant existing behavior regressions. No real AI calls or network calls in tests and no database fixture writes.
- Check preview diagnostics and central UI interactions without submitting scans, audits, emails or data changes.
- Deliver a verification report with all actual text/background contrast pairs and thresholds, every retained Growloop occurrence with its reason, before/after heights, screenshot observations, test totals and credits used if available from a reliable usage read. Report anything unavailable rather than inventing it.

## Assumptions and explicit exceptions
- The supplied symbol is green; there is no uploaded white symbol. On Forest, use the supplied white lockup. Do not recolor the symbol to manufacture an inverse asset.
- Use your explicit typography tracking/clamp values. The 12px floor supersedes the earlier 10.5px Soon pill rule; pills stay single-line and disabled items stay non-links.
- The general spacing scale governs layouts. Your explicit button padding, focus offsets, one-pixel borders/hover lift and specified sidebar/frame radii remain intentional component exceptions.
- Asset SVG fills and the exact supplied favicon are immutable artwork exceptions to “no hex outside the theme.” Application styles still use tokens. New error tint, if needed, will be derived from danger and white rather than inventing another palette color.
- Existing founder-owned product data and historical records are not renamed. Old-brand internal identifiers, domain names and historical migration content are preserved and accounted for in the report.
- No hosted sign-in email will be sent for verification. If read-only template inspection is unavailable, its branding will be reported as unverified and its configuration left untouched.

## Technical details
- Keep TanStack routing and SSR behavior unchanged. Public and private content routes receive their own Brambly metadata; social-image tags remain leaf-only and absolute.
- Keep the existing scratch library stack value if one exists; otherwise add the required TanStack design-library classification without altering runtime behavior. Configure local component/token extraction explicitly and exclude preview-only additions from attach.
- Use shared typed, ref-forwarding components with fixed variants, semantic elements, merged class names and token-backed styling. Fill consumer-facing usage/examples/antipatterns for added or changed public APIs.
- Any server-side copy adjustment, including HN identification, changes strings only; authentication, reservations, provider selection, limits and tracking interfaces remain intact.