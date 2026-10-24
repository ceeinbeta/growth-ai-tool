// Sign-in links land on a URL carrying auth parameters (a `code` query
// parameter, or `access_token` / `error_description` in the hash). When the
// landing page receives those, a signed-in visitor belongs in the app.

export function hasSignInParams(search: string, hash: string): boolean {
  if (new URLSearchParams(search).has("code")) return true;
  return hash.includes("access_token=") || hash.includes("error_description=");
}

// Where the landing page should send the visitor, or null to stay.
// A signed-in visitor opening "/" without sign-in parameters stays put.
export function landingRedirectTarget(search: string, hash: string, hasSession: boolean): string | null {
  if (!hasSession) return null;
  return hasSignInParams(search, hash) ? "/overview" : null;
}
