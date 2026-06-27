// Security response headers, extracted from next.config.ts so they can be unit
// tested via the `@` alias (next.config.ts lives at the repo root, outside the
// app tsconfig paths). Pure module — no imports — so it is safe to pull into
// next.config.ts, which loads before the app.

type Header = { key: string; value: string };

// Static (no-nonce) Content-Security-Policy. App Router + Tailwind inject inline
// bootstrap/styles with no nonce, so script-src/style-src allow 'unsafe-inline';
// acceptable here because the security audit found no XSS sink (sanitize.ts
// strips script/img/iframe before any dangerouslySetInnerHTML, React escapes
// elsewhere). frame-src admits the YouTube (DiscoverVideo) and Google Maps
// (ContactMap) embeds; 'self' covers the admin PreviewPane iframe. img-src
// allows data: (inline SVGs) and https: (remote media).
export const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "frame-src 'self' https://www.youtube.com https://www.google.com",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Baseline security headers applied to every response. CSP and HSTS are added
 * only in production: `next dev` HMR/Fast-Refresh needs eval/inline that must
 * not be in the deployed policy, and HSTS is meaningless over local HTTP.
 */
export function buildSecurityHeaders(
  isProd: boolean = process.env.NODE_ENV === "production",
): Header[] {
  const headers: Header[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    // SAMEORIGIN (not DENY) so the admin PreviewPane can frame same-origin
    // content while cross-origin clickjacking stays blocked.
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
  ];

  if (isProd) {
    headers.push(
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      },
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
    );
  }

  return headers;
}
