export const WEBSITE_ERROR = "Enter a website like yourapp.com";

/**
 * Normalizes a website the user typed. Returns the stored form
 * (e.g. "https://www.Example.com/" -> "www.example.com") or null when it is not a website.
 */
export function normalizeWebsite(input: string): string | null {
  let s = input.trim();
  if (!s || /\s/.test(s) || s.length > 255) return null;
  s = s.replace(/^https?:\/\//i, "");
  if (s.includes("@") || s.includes("://")) return null;
  const slash = s.search(/[/?#]/);
  const host = (slash === -1 ? s : s.slice(0, slash)).toLowerCase();
  let rest = slash === -1 ? "" : s.slice(slash);
  if (host.includes(":")) return null;
  const label = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
  const hostRe = new RegExp(`^(?:${label}\\.)+[a-z]{2,24}$`);
  if (!hostRe.test(host)) return null;
  rest = rest.replace(/[?#].*$/, "").replace(/\/+$/, "");
  return host + rest;
}
