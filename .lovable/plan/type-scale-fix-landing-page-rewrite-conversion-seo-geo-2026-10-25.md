# Type scale fix + landing page rewrite (conversion/SEO/GEO)

Preview only, no publishing. Playbook tokens only; no new heavy libraries.

## A. One shared type and spacing scale

Today sizes are scattered (`text-4xl/5xl/6xl`, `text-2xl/3xl`, ad-hoc padding). Fix at the source:

- **New scale tokens/classes in `src/styles.css`** (the single place sizes live):
  - App: page title 27px/800 Manrope; card/section title 19px; body 15px/1.5; meta 13px; DM Mono labels 11–12px; buttons stay 40px with 14–15px text; card padding 20–24px; section gaps 24–32px; sidebar items 14px.
  - Public: `.public-h1` clamp(34px,5vw,52px); `.public-h2` clamp(26px,3.4vw,36px); h3 20px; body 16–17px (cap 18px); public buttons 48px/16px (existing `size="lg"`); `.public-section` 64–96px desktop / 48px mobile; `.public-container` max-width 1120px; reading text max 68ch.
- **Sweep components/routes** to use the scale instead of raw `text-*` sizes: PageHeader, Overview, AI search visibility, Conversion leaks, Technical audit, Integrations, Admin, sign-in, landing, Features, AppShell sidebar, cards. No per-page overrides.
- **Extend the lint-style test** (`src/test/action-alignment.test.ts` / theme test) so raw font-size or height utilities outside the scale in components/routes fail, with concrete positive/negative cases.
- **Verify** Overview, AI search visibility, Conversion leaks, Technical audit, Integrations, Admin, sign-in, landing, Features at 1280 and 390: no overflow, no wrapped button labels, mobile tap targets ≥ 44px.

## B. Landing rewrite + SEO/GEO

- **New section order** in `src/routes/index.tsx`: (1) Hero — one-sentence definition first, H1 "Find the leak. Fix it. Prove it worked.", primary "Join the beta waitlist", tertiary "See what's included", labeled sample illustration; (2) Problem in 3 short points; (3) How it works — Find/Fix/Prove with Prove marked Coming next; (4) What you can use today — conversion leak finder, page audit by address, technical audit, AI search visibility (ChatGPT, Perplexity, Claude), website tracking, product profile, each 1–2 plain sentences linking to its Features anchor; (5) "Get discovered. Grow organically." with Google search growth and listing optimization as Coming next; (6) Who it's for; (7) FAQ 8–10 answer-first questions; (8) waitlist form (behavior unchanged) + footer.
- **Shared FAQ data** in `src/lib/public-faq.ts` feeding both the accordion and FAQPage JSON-LD so they cannot drift. JSON-LD also: Organization, WebSite, SoftwareApplication (applicationCategory BusinessApplication, offers price 0 with "Free while in beta"). No aggregateRating/reviews.
- **Head**: unique title <60 chars, description <155, canonical, OG/Twitter via existing `publicHead`. One H1, logical H2/H3, landmarks, descriptive links, alt text on the illustration.
- **`public/llms.txt`**: plain-text summary — what Growloop is, what is live, what is Coming next, contact hello@mcads.co, links to home/features/privacy.
- **Features page**: add Technical audit and update Page audit (by address) as live in `src/lib/public-features.ts`; keep honest labels.
- **robots/sitemap**: unchanged; `/technical-audit` is already in the private list (verify).
- Honesty rules kept: Coming next pills on unbuilt features, "Sample data" on the illustration, no fake testimonials/logos/counts/ratings/prices, "Free while we're in beta", invite-only.

## Checks and tests

- Mocked serial tests only; no AI calls; zero rows left behind. Existing waitlist tests (consent, honeypot, success/error) re-run; add a test that JSON-LD FAQ matches the shared FAQ data.
- Browser pass at 1280/390 on all listed screens: anchors and nav (desktop + mobile drawer), keyboard order, no console errors, JSON-LD parses, heading order, image alts, no horizontal scroll at 390px.

## Left alone

Database rules, limits, provider calls, waitlist behavior, auth redirect, tracking, all signed-in features and their logic. Visual/copy changes only.
