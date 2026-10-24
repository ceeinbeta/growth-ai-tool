# Growloop Mcads

Build slice 1 (the platform) of "Growloop", a growth app for solo founders. Tagline: "Find the leak. Fix it. Prove it worked." Build ONLY what is listed here; no AI features, no fake data.

## Screens
1. Sign-in page: email only, one-time sign-in link (Supabase magic link), no passwords. Headline is the tagline. Show "Check your email" after sending.
2. App shell (signed-in): left sidebar with the Growloop logo, a product switcher, main nav, email + Sign out at the bottom.
   - Product switcher: list of the user's products (initial letter tile, name, "Live" or "Pre-launch"), the active one highlighted, and an "Add product" row. Remember the active product per browser. When the user has 3 products, replace "Add product" with "Standard includes 3 products."
   - Nav: Overview (works). Conversion leaks, AI search visibility, Opportunities, Integrations show a small "Soon" pill and are not clickable.
3. Overview: no products -> "Add your first product" with a button. With a product -> product name, website, stage, description, then a card "What happens next" listing 4 upcoming steps (Profile your product; Find your biggest leak; Check AI search visibility; Find people asking for your kind of product; add "You post the reply yourself. Growloop never posts for you."). State plainly that no numbers show yet because no data is connected. Also show "X of 3 products used on the Standard plan".
4. Add product form: name (required, max 80), website (required, accept https://www.Example.com/ and store as www.example.com; reject non-websites with "Enter a website like yourapp.com"), "What does it do, and for whom?" (required, max 1000), Stage radio: "Live product" / "Pre-launch, collecting a waitlist". Inline readable errors.

## Data (Supabase, row level security ON for every table)
- workspaces(id, name, max_products int default 3, created_at)
- members(workspace_id, user_id, role 'owner'|'member', created_at), primary key (workspace_id, user_id)
- products(id, workspace_id, name, url, description, stage 'live'|'prelaunch', one_liner, audience, category [last three nullable, filled later by an AI profiler], created_at)
Rules:
- A database trigger on new auth users creates a workspace (named from the email's first part) plus an owner membership.
- A SECURITY DEFINER function is_workspace_member(ws uuid) is used by all policies.
- Users can select workspaces and members only for workspaces they belong to; products: select/insert/update/delete only for workspaces they belong to.
- No client-side update on workspaces and no client-side writes to members. max_products must not be editable by users.
- A BEFORE INSERT trigger on products raises 'product_limit_reached' when the workspace already has max_products products. Show the friendly message "Your plan includes 3 products. Remove one to add another."
- Every product belongs to a workspace; a workspace can hold several products.

## Brand (use exactly)
- Fonts: Plus Jakarta Sans (headings, weights 600-800) and Inter (body).
- Colors: page background #F4F7F6, surface white, text #0E1B1A, muted text #5B7370, borders #D5E0DE, sunken #E8EFEE. Primary green #0B7A55 for buttons and links (white text), soft green #D8F5EA for selected states, signal amber #F5A524 for small accents, danger #C23B30 on #FBE0DD, info blue #2F6FED. Radius 6/10/16px.
- Logo: a green (#0B7A55) open circle with a gap at the top right, round line caps, and a small amber (#F5A524) dot sitting in the gap; lowercase wordmark "growloop" in Plus Jakarta Sans ExtraBold.
- Copy: plain and specific, no hype or jargon.

Rules for the whole product: people approve anything that goes out; label sample, estimated and benchmark numbers on screen; API keys only in secrets.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://growloop-mcads.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/40278135-0613-44a0-b9e0-00e627dada0d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
