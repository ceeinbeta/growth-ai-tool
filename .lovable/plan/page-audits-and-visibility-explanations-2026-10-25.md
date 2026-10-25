# Page audits and visibility explanations

## Changes
- Make page audits start from the saved product URL or a same-site path, with “Audit this page”. Safely fetch and extract actual readable text; show a plain fallback message and the existing paste fields if fetching fails or fewer than 300 characters are readable.
- Keep audit limits, usage logging, findings and status controls unchanged. Save the fetched URL and time together with the audit; show them above its findings.
- Use proper AI engine names in share-of-voice notes, list only engines with usable answers, and explain failed/empty engines separately and within their tabs.
- Preserve shared theme tokens and keep everything preview-only.

## Fetch limit tradeoff
The backend has no standard rate-limiting primitive. Reuse the application's existing database-reservation pattern as an ad-hoc atomic limit of **10 page fetches per product per rolling hour**, separate from the five daily AI audits. Approving this plan confirms that tradeoff.

## Technical details
- Share the logo fetcher's HTTPS/public-host/same-site validation, three revalidated redirects, eight-second timeout, 1 MB read cap and cookie-free requests.
- Parse HTML with an edge-compatible parser; drop scripts, styles, navigation and hidden noise. Extract title, description, headings, body and action labels; bound AI input to 12,000 characters.
- Add nullable audit provenance and a service-only reservation function. Save provenance atomically with findings; caller-scoped product access precedes privileged operations.
- Mock fetch and AI for blocked hosts, redirects, size limits, thin pages, success and persistence. Run all safe tests serially without real network, provider calls or retained fixtures.