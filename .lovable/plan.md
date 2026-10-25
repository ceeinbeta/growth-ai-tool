# Homepage hero redesign (preview only, no publishing)

Copies the reference's layout idea only. No wording, logos, colors, ratings, refund promise or claims from it. Keeps the d15 brand, the shared type scale and the d9 honesty rules.

## What the hero becomes (centered, one action)
1. **Announcement pill** links to `#features-today`: a small "Beta" tag, "Free while we're in invite-only beta" and a chevron.
2. **One H1 on two lines:** "Find the leak. Fix it." in ink, then "Prove it worked." in ink on a lime highlight bar. No lime text on light, so contrast stays AA. The definition sentence sits below as a muted subheading, about 60ch wide.
3. **Pill form**, max 640px: mail icon, email field ("you@yourcompany.com") and a lime "Join the beta waitlist →" button. The consent checkbox sits in a small line below. Website and stage (both optional, already part of the waitlist) show in a compact second row that opens once the email field is focused. Errors and success show in the same place. On mobile the button drops under the field at full width.
4. **Honest line** with a shield icon: "Free while we're in beta. No card needed. You always post from your own account."
5. **Trust strip** of three chips with icons: "Numbers labeled measured, estimated or sample", "No tracking cookies", "Works before you launch".
6. **Quiet text line** "Checks how ChatGPT, Perplexity and Claude recommend you" (no logos). Below it sits the existing sample illustration, still labeled "Sample data", with the 2rem radius and the hero shadow.
7. **Decorative background:** faint brand-line circles and a grid of tiny rounded squares at about 5% ink. It is hidden from screen readers and has no animation.
8. **Header:** sticky. Logo, then Features, FAQ and Privacy links, then "Sign in" as a plain link and "Join the waitlist" as an outline button. The mobile drawer stays unchanged.

## Stays the same
- The rest of the page order: problem, how it works, what you can use today, discovery with "Soon" pills, who it's for, FAQ, bottom waitlist, footer.
- The bottom waitlist uses the same form component in its current full layout.
- The waitlist's sending, validation, honeypot, rate limits and consent requirement. Nothing changes on the server.
- SEO/GEO: a single H1, meta tags, JSON-LD from the FAQ source, llms.txt, anchors and alt text.

## Technical details
- `WaitlistForm` gets a `variant="hero" | "full"` option. Both share the same state, schema and submit code, so the behavior can't drift. Field ids get a per-form prefix, so two forms on one page don't collide.
- The "What you can use today" section gets `id="features-today"`, unless an equivalent anchor already exists.
- New CSS utilities (`hero-highlight`, `hero-backdrop`) in styles.css use tokens only.
- PublicShell header: sticky, with the Sign in and Join the waitlist actions.
- Tests:
  - Only one `<h1>` on the page.
  - The hero form needs consent before sending.
  - A mocked error response and a mocked success response both show their message in place.
  - The pill links to `#features-today`.
  - No rating, refund or "guarantee" words appear on the page.
  - Existing public tests get updated where they change.
- Checks:
  - Playwright at 1280x800: the hero form is fully above the fold.
  - Playwright at 390: no sideways scroll.
  - Keyboard tab order: pill, form, consent, then the rest.
  - No console errors.
  - A contrast table for the new color pairs.
  - Every test file run one at a time with mocked network calls, leaving zero rows behind.
