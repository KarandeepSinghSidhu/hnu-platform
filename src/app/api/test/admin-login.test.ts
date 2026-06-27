import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetRateLimitStore } from "@/lib/rate-limit";
import { POST as loginPost } from "@/app/api/admin/auth/login/route";

// Use the REAL rate limiter, admin-session, and client-ip so this exercises the
// end-to-end brute-force behaviour. Each test uses a distinct IP so the shared
// in-process limiter state never bleeds between cases.
function loginReq(password: unknown, ip: string) {
  return new Request("http://localhost/api/admin/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ password }),
  });
}

describe("POST /api/admin/auth/login (B16)", () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.stubEnv("ADMIN_PASSWORD", "correct-horse-battery");
    vi.stubEnv("ADMIN_SESSION_SECRET", "x".repeat(40));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a wrong password with 401", async () => {
    const res = await loginPost(loginReq("wrong", "10.0.0.1"));
    expect(res.status).toBe(401);
  });

  it("accepts the correct password and sets a hardened session cookie", async () => {
    const res = await loginPost(loginReq("correct-horse-battery", "10.0.0.2"));
    expect(res.status).toBe(200);
    const cookie = (res.headers.get("set-cookie") ?? "").toLowerCase();
    expect(cookie).toContain("admin_session=");
    expect(cookie).toContain("httponly");
    expect(cookie).toContain("samesite=strict");
    expect(cookie).toContain("path=/");
  });

  it("does not accept a near-miss password (constant-time compare is still correct)", async () => {
    const res = await loginPost(
      loginReq("correct-horse-batterY", "10.0.0.8"),
    );
    expect(res.status).toBe(401);
  });

  it("blocks brute force: the 6th attempt from one IP is 429 with Retry-After", async () => {
    const ip = "10.0.0.3";
    for (let i = 0; i < 5; i++) {
      const r = await loginPost(loginReq("wrong", ip));
      expect(r.status).toBe(401);
    }
    const sixth = await loginPost(loginReq("wrong", ip));
    expect(sixth.status).toBe(429);
    expect(Number(sixth.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("isolates the limit per IP (a different IP is unaffected)", async () => {
    const ip = "10.0.0.4";
    for (let i = 0; i < 5; i++) {
      await loginPost(loginReq("wrong", ip));
    }
    expect((await loginPost(loginReq("wrong", ip))).status).toBe(429);
    // A fresh IP still reaches the credential check.
    expect((await loginPost(loginReq("wrong", "10.0.0.5"))).status).toBe(401);
  });

  it("returns 400 when the password is missing", async () => {
    const res = await loginPost(loginReq(undefined, "10.0.0.6"));
    expect(res.status).toBe(400);
  });

  it("returns 500 when ADMIN_PASSWORD is not configured", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    const res = await loginPost(loginReq("whatever", "10.0.0.7"));
    expect(res.status).toBe(500);
  });

  it("returns a clean 500 (not an unhandled throw) when ADMIN_SESSION_SECRET is weak in production", async () => {
    // Correct password, but a placeholder session secret that the B12 guard
    // rejects in production: token minting must fail closed with a 500, not an
    // opaque unhandled rejection.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSWORD", "correct-horse-battery");
    vi.stubEnv("ADMIN_SESSION_SECRET", "replace-with-a-long-random-string");
    const res = await loginPost(
      loginReq("correct-horse-battery", "10.0.0.9"),
    );
    expect(res.status).toBe(500);
  });
});
