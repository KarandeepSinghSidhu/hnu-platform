// State-changing HTTP methods that a cross-site page could forge against a
// cookie-authenticated admin. Safe methods (GET/HEAD/OPTIONS) are never CSRF
// vectors for mutations and always pass.
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * Defence-in-depth CSRF check for the admin surface. The PRIMARY protection is
 * the SameSite=Strict session cookie; this adds a server-side origin assertion
 * so we don't rely solely on the browser honouring SameSite.
 *
 * Returns true when a request is allowed to proceed:
 *   - safe methods (GET/HEAD/OPTIONS/...) always pass;
 *   - for unsafe methods, if an Origin (or, as a fallback, Referer) header is
 *     present, its host must equal the request host;
 *   - if neither is present, it passes — a genuine cross-site browser request
 *     always sends Origin on unsafe methods, so absence implies a non-browser
 *     client, which carries no victim cookies and therefore can't be CSRF'd.
 *
 * Returns false only when a cross-origin (or malformed) Origin/Referer is seen
 * on a state-changing request.
 */
export function isSameOriginOrSafe(request: Request): boolean {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase())) {
    return true;
  }

  // Read the source once. `||` treats an empty Origin as missing so a valid
  // Referer can still serve as the fallback.
  const rawSource =
    request.headers.get("origin") || request.headers.get("referer") || null;
  const sourceHost = hostOf(rawSource);
  if (sourceHost === null) {
    // No usable source header → non-browser client (no victim cookies) → allow.
    // A present-but-malformed source → block.
    return rawSource === null;
  }

  // Hostnames are case-insensitive; new URL() already lowercased sourceHost, so
  // lowercase the raw Host header before comparing.
  const rawTarget = request.headers.get("host") || hostOf(request.url);
  const targetHost = rawTarget ? rawTarget.toLowerCase() : null;
  return targetHost !== null && sourceHost === targetHost;
}
