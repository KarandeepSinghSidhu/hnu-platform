// Admin login endpoint. POST { password } verifies the configured admin
// password and, on success, sets a signed, httpOnly session cookie that
// middleware checks to gate the admin console. Hardened against brute-force
// (per-IP rate limit) and timing attacks (constant-time compare), and fails
// closed with a 500 when ADMIN_PASSWORD / ADMIN_SESSION_SECRET are missing or
// too weak rather than leaking the cause to the client.
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminPassword,
  getAdminSessionCookieName,
} from "@/lib/admin-session";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

// Per-IP brute-force throttle on the login endpoint.
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// Constant-time comparison over fixed-length SHA-256 digests. Hashing first
// guarantees equal-length inputs to timingSafeEqual (which throws on length
// mismatch) and prevents the secret's length from leaking through timing.
function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(request: Request) {
  // Throttle by client IP first, so brute-forcing is bounded regardless of
  // whether the submitted password is correct. The IP comes from the
  // trusted-proxy helper, so it can't be cheaply spoofed to dodge the limit.
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`login:${ip}`, {
    max: LOGIN_MAX_ATTEMPTS,
    windowMs: LOGIN_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(
      rateLimit,
      "Too many login attempts. Please try again later.",
    );
  }

  let expectedPassword: string;
  try {
    expectedPassword = getAdminPassword();
  } catch (error) {
    // Error messages never contain the secret value, so they are safe to log.
    console.error("Admin login: ADMIN_PASSWORD misconfigured:", error);
    return NextResponse.json(
      { error: "Server auth config is missing or too weak" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  if (!safeEqual(password, expectedPassword)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // On success, issue a signed cookie token consumed by middleware. Token
  // creation reads ADMIN_SESSION_SECRET, which fails closed in production on a
  // weak/placeholder value (B12); handle that symmetrically with the password
  // path instead of throwing an opaque 500.
  let token: string;
  try {
    token = await createAdminSessionToken();
  } catch (error) {
    console.error(
      "Admin login: failed to mint session token (check ADMIN_SESSION_SECRET):",
      error,
    );
    return NextResponse.json(
      { error: "Server auth config is missing or too weak" },
      { status: 500 },
    );
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
