# Tracking fixes

- Make an existing Origin header authoritative; use the body hostname only when the header is absent. Preserve silent 204 responses for rejected events.
- Add tests for matching, mismatching, absent, invalid, subdomain, www, localhost and lookalike origins.
- Remove signed-in users’ write permissions for events and tracking event names, preserving member-scoped reads and server collection.
- Show the requested private-address warning under the install code only on addresses containing `id-preview--`.
- Rerun the full test suite and verify Integrations and Overview while signed in. Do not publish.

## Technical details
Update the shared tracking validator and WebsiteTracking presentation only; apply a grants-only database change. Keep existing collection endpoints, policies, attribution and limits unchanged.