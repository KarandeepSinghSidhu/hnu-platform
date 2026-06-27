// In-process, fixed-window rate limiter shared by API routes (contact, login,
// search) to throttle abuse. Deliberately in-memory rather than SQLite/Redis:
// a single Render instance with no Redis, where a per-request DB write would
// block the event loop. Counters reset on restart, which is fine for throttling.
import { NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitOptions = {
  /** Max requests allowed per window for this key. Defaults to 5. */
  max?: number;
  /** Window length in ms. Defaults to 10 minutes. */
  windowMs?: number;
};

// Defaults preserve the original behaviour for existing callers (e.g. /api/contact).
const DEFAULT_MAX = 5;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

// Hard ceiling on tracked keys. On the 512 MB box an attacker (even with the
// trusted-proxy IP from client-ip.ts) must not be able to grow this map without
// bound; once full we evict the oldest-inserted entry (FIFO). 50k entries is a
// few MB worst case yet far more than this site's real distinct-IP volume.
export const MAX_BUCKETS = 50_000;

// Full sweeps are amortised: at most one per interval instead of an O(n) scan on
// every request (which would itself be a CPU sink once the map is large).
// Expired entries are also ignored lazily on access, so accuracy never waits.
const SWEEP_INTERVAL_MS = 60 * 1000;

const buckets = new Map<string, RateLimitEntry>();
let lastSweepAt = 0;

function sweepExpired(now: number) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
  lastSweepAt = now;
}

/**
 * Fixed-window, in-process rate limiter. Keys are caller-namespaced strings
 * (e.g. `login:1.2.3.4`, `search:1.2.3.4`). In-process (not SQLite-backed) on
 * purpose: a single Render instance with no Redis, where a synchronous SQLite
 * write per request would block the event loop and contend with the app DB. A
 * restart resets counters, which is acceptable for throttling.
 */
export function checkRateLimit(key: string, options: RateLimitOptions = {}) {
  const max = options.max ?? DEFAULT_MAX;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  const bucketKey = key || "unknown";

  if (now - lastSweepAt >= SWEEP_INTERVAL_MS) {
    sweepExpired(now);
  }

  const existing = buckets.get(bucketKey);
  if (existing && existing.resetAt > now) {
    if (existing.count >= max) {
      return {
        allowed: false as const,
        retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
      };
    }
    existing.count += 1;
    return { allowed: true as const, remaining: max - existing.count };
  }

  // New key, or a previous window that has since expired: start fresh. Enforce
  // the memory ceiling first by evicting the oldest-inserted entry if needed.
  if (!existing && buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) {
      buckets.delete(oldest);
    }
  }
  buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
  return { allowed: true as const, remaining: max - 1 };
}

/**
 * Standard 429 response for a blocked request, with Retry-After when known.
 * Centralised so every limiter call site stays consistent.
 */
export function rateLimitResponse(
  result: { retryAfterSeconds?: number },
  message = "Too many requests. Please try again later.",
) {
  const response = NextResponse.json({ error: message }, { status: 429 });
  if (result.retryAfterSeconds) {
    response.headers.set("Retry-After", String(result.retryAfterSeconds));
  }
  return response;
}

/** Number of tracked keys. Exposed for tests asserting the memory ceiling. */
export function rateLimitBucketCount() {
  return buckets.size;
}

/** Test-only: clears all limiter state so tests don't share buckets. */
export function resetRateLimitStore() {
  buckets.clear();
  lastSweepAt = 0;
}
