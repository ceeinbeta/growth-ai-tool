# App redesign B1 (preview only, no publishing)

Visual and layout changes only. No changes to database rules, limits, provider calls, routes or saved data. Uses the existing playbook colors and type, shared buttons, `ActionRow` and `ActionHeader`, plus the shared status chips.

## 1. Sidebar
- The product switcher stays at the top and the email + Sign out stay at the bottom.
- Groups appear in this order, each with a small DM Mono uppercase label:
  - **HOME**: Overview
  - **GROWTH AUDIT**: Conversion leaks, Technical audit [Coming next]
  - **DISTRIBUTION**: AI search visibility, Google search growth, Listing optimization, Finding conversations (the last three are Coming next)
  - **ANALYTICS**: Results, Competitor gaps, Experiments (all Coming next)
  - **FOUNDATION**: Product profile goes to the profile section on Overview, Website tracking goes to the tracking section on Integrations, then Integrations, then Admin (founders only, same check as today)
- The current "Opportunities" placeholder is replaced by "Finding conversations".
- "Coming next" items are plain text, not links. They carry `aria-disabled`, have no pointer or hover change, and show the visible label.
- The active item uses the lime tint with an Ink bar, as it does today.
- On mobile, the sidebar becomes a top bar with a menu button. The button opens a drawer that holds the same groups, switcher and account. The drawer closes after you pick an item.

## 2. Overview
- A **"Next best step"** card sits at the top. It checks real data in this order and stops at the first gap:
  1. Profile missing or not confirmed
  2. No tracking events received
  3. No custom funnel steps
  4. No page audit
  5. No usable AI visibility check
  6. Otherwise: "Review your biggest leak"
- The card has one plain sentence and one primary button pointing to the existing screen or section.
- Below it, a three-step strip: **Find the leak → Fix it → Prove it worked**.
  - Find = tracking installed and an audit or funnel exists.
  - Fix = at least one leak is marked in progress or fixed.
  - Prove = shown as Coming next until results tracking exists.
- Each step shows a text status: Done, Current, Not started or Coming next.
- The existing number tiles, source labels, honest empty states, profile and plan count stay as they are. The old checklist "next action" line is folded into the new card, so there is still only one primary button.

## 3. Integrations
A responsive grid of cards. Each card has a status chip with text, one line on what it gives you, and one action.
- **Live cards:**
  - Website tracking: Installed or Not installed. Opens the existing snippet and install check, unchanged, as the expanded body of the card.
  - OpenAI, Perplexity, Claude: Connected or Not connected. Action: the existing Test connection link and the current-session result, unchanged.
- **Coming next cards** (no link, `aria-disabled`): PostHog, Google Analytics, Stripe, Google Search Console.

## 4. Admin
- A summary strip at the top: seats used / seats available, AI spend this month (labeled estimated where it is an estimate), waitlist count. All values come from the existing admin data.
- Three sections, each with its own heading: **Beta seats and invites**, **AI spending and limits**, **Waitlist**.
- Existing tables and controls are moved, not changed. Row actions use the shared `ActionRow`.
- The founder-only check and the non-admin message are untouched.

## 5. Shared page header
- Overview, Conversion leaks, AI search visibility, Integrations and Admin use one header: title, one-line purpose, and the primary action top-right (it moves under the title on mobile).
- Plain copy, no jargon.

## Left alone
- Database, permissions, limits, AI and provider calls, tracking, audits, waitlist, public pages, routes and URLs.

## Technical details
- New `src/lib/nav.ts` holds the group config (label, route or hash, coming-next flag) as the single source for the desktop sidebar and the mobile drawer. Hash targets: `/overview#profile` and `/integrations#tracking`.
- New `src/lib/next-step.ts` is a pure picker for the next step and the loop strip, built from the existing setup-checklist inputs, with unit tests for each branch and its order.
- A shared `PageHeader` wraps `ActionHeader`. The mobile drawer uses the existing shadcn Sheet. No new color tokens; any new element reuses existing tokens, with contrast noted in the reply.
- Tests:
  - nav: group order, Coming next items are not links and have `aria-disabled`, Admin only for admins
  - next-step: the order above
  - Integrations: Coming next cards are not links
  - all existing tests run serially with providers mocked
- After the tests, a check that no new rows were left in the database.
- Desktop (1280) and mobile (390) screenshots of the sidebar, Overview, Integrations and Admin, taken signed in.
