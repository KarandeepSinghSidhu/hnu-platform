// Admin logout endpoint. POST clears the admin session cookie, ending the
// session. Counterpart to the login route; lives under /api/admin/auth so the
// admin console can sign out without exposing the session-cookie name client-side.

import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/admin-session";

/**
 * Always succeeds: returns { ok: true } and expires the admin session cookie
 * by overwriting it with an empty value and maxAge 0. Cookie attributes mirror
 * the login route's so the browser reliably matches and clears the existing cookie.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  // Overwrite with empty value and immediate expiration.
  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
