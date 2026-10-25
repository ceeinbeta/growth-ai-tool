import { allowedFetchUrl } from './install-check';

export const AUDIT_FETCH_LIMIT = 10;
export const MIN_AUDIT_TEXT = 300;
export const MAX_AUDIT_TEXT = 12000;
export function withinAuditFetchLimit(count: number) { return count < AUDIT_FETCH_LIMIT; }
export function auditPageUrl(website: string, path = ''): URL | null {
  try {
    const base = new URL(`https://${website}`);
    // A path or the saved address only; no protocol-relative, absolute or backslash escapes.
    if (path && (!path.startsWith('/') || path.startsWith('//') || /[\\?#]/.test(path))) return null;
    const url = path ? new URL(path, base) : base;
    return allowedFetchUrl(url.href, website);
  } catch { return null; }
}