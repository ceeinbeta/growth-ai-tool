# Slice 2: editable AI product profiles

## Build
- Generate a real profile automatically after adding a product, with product-specific loading and useful errors.
- Add editable summaries, competitor chips, and buyer questions above “What happens next”; save edits on blur and confirm reruns.
- Preserve each founder-edited field and founder-added/edited item when rerunning. Replace only AI-owned content.
- Keep sign-in, workspace permissions, and the three-product limit unchanged.
- Enlarge the amber logo dot and restore the saved product before displaying a product.

## Technical details
- One authenticated `profile-product` server function using Lovable AI, server-held secrets, streamed structured JSON, and Zod validation. Retry malformed output once, not access denials.
- Add protected competitors, questions, and usage records, with database-enforced item caps and atomic five-run reservations over a rolling 24 hours.
- Store edit ownership per field so changes survive reruns. Save profile replacement atomically.
- Usage records contain actual token counts; cost remains unknown unless an authoritative USD cost is available, rather than inventing a number.
- Platform rules prohibit a direct `members.user_id` foreign key to the managed auth table. Use an auth lifecycle cleanup trigger for equivalent deletion cleanup instead.
- Verify real signed-in creation, profiling, editing, reruns, and focused rule tests.