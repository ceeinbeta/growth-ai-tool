# Public pages and beta waitlist

- Replace the home redirect with a calm, mobile-friendly landing page using the supplied copy and existing branding. Show Sign in or Open Growloop based on the session.
- Add the privacy page, unset contact/tracking configuration, current-host canonical links, and the requested crawler rules. Preserve indexing restrictions on private pages.
- Add the consented waitlist form and private storage. Return identical success for duplicate emails and honeypots; send no emails.
- Keep signup invite-only and all existing app features unchanged. Do not publish.

## Technical details
- Use a same-origin public endpoint with strict input validation and a 2 KB body limit.
- Enforce the final requested platform-wide limits (20/minute, 200/hour) atomically in the database, including duplicate submissions.
- Run all tests, add rollback-safe database coverage, and verify public pages and waitlist submission on desktop/mobile. Use no founder product rows.
- Use October 24, 2026 as the privacy update date. Contact and landing tracking remain unset.