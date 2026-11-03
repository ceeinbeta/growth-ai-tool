# Brambly design system — d16

Brambly is direct, perceptive and encouraging. Write short sentences with active verbs. Avoid hype, cute language and unnecessary technical terms. Never invent product results, testimonials, metrics or capabilities. AI-written content must remain labeled; unfinished features carry a visible Soon label and disabled navigation remains a non-link.

## Consumer setup

This is a locally authored React library styled with Tailwind v4. Import its canonical `design-system/theme.css` once in the consumer's stylesheet — the library barrel (`src/index.ts`) already imports it as a side effect, so importing any component brings the tokens with it. The theme registers its own component subtree for utility generation; register the consumer's own source separately. Import exported components from the attached library barrel. Keep theme and component code together: helpers use local imports, and logos are supplied assets under `assets/logos`.

Fonts are not bundled. The theme's `--font-sans`/`--font-label` resolve to DM Sans and `--font-display` to Manrope; the consumer must load them from Google Fonts with `display=swap` via a `<link>` in its document head (`https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Manrope:wght@500;600&display=swap`). Never `@import` the fonts URL from CSS — Tailwind v4's Lightning CSS resolves `@import` from the filesystem only.

Load Manrope weights 500/600 and DM Sans weights 400/500/600 through a document-head Google Fonts stylesheet with display=swap. Do not import a remote URL from CSS. Manrope is for display, headings and numerical emphasis; DM Sans is for body, UI and labels. No other font family belongs in Brambly.

## Tokens and readability

Use semantic token-backed utilities and the canonical theme. Do not write hex values, one-off spacing, colors, shadows or radii in screen code. Uploaded SVGs and the exact authored favicon are immutable artwork, not application styling; never recolor them.

Reading text, forms, tables and lists use the body scale with at least 16px and 26px line-height. Explicit metadata and eyebrows use the label scale with a 12px floor. Buttons use their named sizes rather than screen-specific type overrides. The app heading scale stops at 36px; public display and headings use the shared public classes. Do not shrink fonts to recover previous page heights.

Muted text is surface-aware: muted is only safe on white; cream uses muted-strong. Forest, Ink and White carry primary contrast. Warning is border/icon-only with Ink text, never amber reading text. Danger always has a readable label. Status must be conveyed by words, not color alone. Consult extracted token reference for roles; values stay in the theme, not this guide.

## Composition and interaction

Compose the existing Logo, Button, Input, DomainInput, ActionRow, ActionHeader, PageShell and PageGrid before inventing alternatives. Named variant/size options define appearances; className extends layout but must not become the way to select a look.

```tsx
import { Button, ActionRow, DomainInput } from '@/design-system/brambly';

<form onSubmit={submit}>
  <label htmlFor="website">Website</label>
  <DomainInput id="website" value={website} onChange={updateWebsite} />
  <ActionRow>
    <Button variant="outline" type="button" onClick={cancel}>Cancel</Button>
    <Button type="submit">Save product</Button>
  </ActionRow>
</form>
```

Primary actions use the Forest pill; secondary actions use the outline pill; tertiary actions are underlined. One primary action per area. Button owns sizes and touch targets; ActionRow owns placement. Never add page-specific button heights or margin alignment hacks. DomainInput can carry an existing action slot but must never silently start analysis. Behavior belongs to the consumer, not the visual library.

Use semantic buttons for actions and anchors for navigation. Every interaction is keyboard-reachable with a visible focus ring; icon-only controls have an accessible name and unfamiliar controls a tooltip. Focus changes on Forest backgrounds so it stays visible. Disabled states stay disabled semantically, not only visually. Respect reduced motion and never rely on hover to expose essential content.

## Layout and logos

Preserve the compact full-width page frame beside the sidebar, the maximum page-width token, the twelve-column main/context grid and its mobile source order. Related information sits side by side, not in tall decorative heroes. Tables scroll inside their own containers; no horizontal page overflow. Long prose retains a readable measure.

The Logo uses the supplied green lockup/symbol on light grounds and the supplied white lockup on Forest. No white symbol was supplied: inverse symbol deliberately falls back to the white lockup. Do not generate replacement geometry or rewrite SVG fills. Keep founder/product logos independent from the Brambly brand.

## Maintenance

Keep the local barrel and explicit extraction sources in sync. Added or changed public components need typed props, forwarded refs, merged class names and usage/example/antipattern enrichment. Preserve the author-owned system guidance; do not hand-edit publish-generated rule files. The permanent showcase is preview-only and must not enter the attached library snapshot. Existing product pages remain intact.