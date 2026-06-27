import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

import {
  createAdminSessionToken,
  requireStrongSecret,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

const STRONG_SECRET = "x".repeat(40); // comfortably over the 32-char floor
const ISSUER = "hnu-admin";
const AUDIENCE = "hnu-admin-users";

function signWith(
  secret: string,
  claims: { issuer?: string; audience?: string; expSeconds?: number } = {},
) {
  const jwt = new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(claims.issuer ?? ISSUER)
    .setAudience(claims.audience ?? AUDIENCE)
    .setIssuedAt();
  jwt.setExpirationTime(claims.expSeconds ?? Math.floor(Date.now() / 1000) + 60);
  return jwt.sign(new TextEncoder().encode(secret));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireStrongSecret (B12)", () => {
  it("throws when the value is missing", () => {
    expect(() => requireStrongSecret(undefined, "X")).toThrow(/Missing X/);
    expect(() => requireStrongSecret("", "X")).toThrow(/Missing X/);
  });

  it("in production, rejects a too-short secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => requireStrongSecret("short", "X")).toThrow(/too weak/i);
  });

  it("in production, rejects a known placeholder even if long enough", () => {
    vi.stubEnv("NODE_ENV", "production");
    // 33 chars, so the length check alone would pass — must be caught as a placeholder.
    expect(() =>
      requireStrongSecret("replace-with-a-long-random-string", "X"),
    ).toThrow(/placeholder/i);
  });

  it("in production, rejects a placeholder even with surrounding whitespace", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() =>
      requireStrongSecret("  replace-with-a-long-random-string\n", "X"),
    ).toThrow(/placeholder/i);
  });

  it("in production, accepts a strong non-placeholder secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(requireStrongSecret(STRONG_SECRET, "X")).toBe(STRONG_SECRET);
  });

  it("returns the trimmed secret", () => {
    expect(requireStrongSecret("  trimmed-value  ", "X")).toBe("trimmed-value");
  });

  it("outside production, allows a short throwaway secret", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(requireStrongSecret("short", "X")).toBe("short");
  });

  it("honours a custom minimum length", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => requireStrongSecret("0123456789", "X", 12)).toThrow(/too weak/i);
    expect(requireStrongSecret("0123456789ab", "X", 12)).toBe("0123456789ab");
  });
});

describe("admin session token (B33)", () => {
  it("creates a token that verifies (roundtrip)", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", STRONG_SECRET);
    const token = await createAdminSessionToken();
    expect(await verifyAdminSessionToken(token)).toBe(true);
  });

  it("rejects a garbage token", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", STRONG_SECRET);
    expect(await verifyAdminSessionToken("not.a.jwt")).toBe(false);
  });

  it("rejects a token signed with a different secret (no forgery)", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", STRONG_SECRET);
    const forged = await signWith("a-completely-different-secret-value-1234");
    expect(await verifyAdminSessionToken(forged)).toBe(false);
  });

  it("rejects a token with the wrong issuer", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", STRONG_SECRET);
    const wrongIssuer = await signWith(STRONG_SECRET, { issuer: "evil" });
    expect(await verifyAdminSessionToken(wrongIssuer)).toBe(false);
  });

  it("rejects a token with the wrong audience", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", STRONG_SECRET);
    const wrongAud = await signWith(STRONG_SECRET, { audience: "someone-else" });
    expect(await verifyAdminSessionToken(wrongAud)).toBe(false);
  });

  it("rejects an expired token", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", STRONG_SECRET);
    const expired = await signWith(STRONG_SECRET, {
      expSeconds: Math.floor(Date.now() / 1000) - 60,
    });
    expect(await verifyAdminSessionToken(expired)).toBe(false);
  });

  it("fails closed (verify returns false) when the secret is missing", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect(await verifyAdminSessionToken("anything")).toBe(false);
  });
});
