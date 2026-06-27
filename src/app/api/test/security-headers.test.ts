import { describe, expect, it } from "vitest";

import {
  buildSecurityHeaders,
  contentSecurityPolicy,
} from "@/lib/security-headers";

function toMap(isProd: boolean) {
  return new Map(buildSecurityHeaders(isProd).map((h) => [h.key, h.value]));
}

describe("security headers (B18)", () => {
  it("always sets the safe baseline headers", () => {
    const h = toMap(false);
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("Permissions-Policy")).toContain("camera=()");
  });

  it("omits CSP and HSTS outside production (keeps dev HMR working)", () => {
    const h = toMap(false);
    expect(h.has("Content-Security-Policy")).toBe(false);
    expect(h.has("Strict-Transport-Security")).toBe(false);
  });

  it("adds CSP and HSTS in production", () => {
    const h = toMap(true);
    expect(h.get("Strict-Transport-Security")).toContain("max-age=");
    expect(h.get("Content-Security-Policy")).toBe(contentSecurityPolicy);
  });

  it("CSP locks down dangerous directives and admits only the needed embeds", () => {
    expect(contentSecurityPolicy).toContain("default-src 'self'");
    expect(contentSecurityPolicy).toContain("object-src 'none'");
    expect(contentSecurityPolicy).toContain("base-uri 'self'");
    expect(contentSecurityPolicy).toContain("form-action 'self'");
    // clickjacking: same-origin framing only
    expect(contentSecurityPolicy).toContain("frame-ancestors 'self'");
    // the two legitimate third-party embeds
    expect(contentSecurityPolicy).toContain("https://www.youtube.com");
    expect(contentSecurityPolicy).toContain("https://www.google.com");
  });
});
