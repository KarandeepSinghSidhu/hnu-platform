import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkRateLimit,
  MAX_BUCKETS,
  rateLimitBucketCount,
  resetRateLimitStore,
} from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimitStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit (B16/B19/B33)", () => {
  it("defaults to 5 requests per window (preserves the original contact behaviour)", () => {
    const key = "default:test";
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.allowed === false && blocked.retryAfterSeconds).toBeTruthy();
  });

  it("honours a custom max and reports remaining", () => {
    const key = "remaining:test";
    expect(checkRateLimit(key, { max: 3 }).remaining).toBe(2);
    expect(checkRateLimit(key, { max: 3 }).remaining).toBe(1);
    expect(checkRateLimit(key, { max: 3 }).remaining).toBe(0);
    expect(checkRateLimit(key, { max: 3 }).allowed).toBe(false);
  });

  it("tracks keys independently", () => {
    expect(checkRateLimit("indep:a", { max: 1 }).allowed).toBe(true);
    expect(checkRateLimit("indep:a", { max: 1 }).allowed).toBe(false);
    // A different key has its own budget.
    expect(checkRateLimit("indep:b", { max: 1 }).allowed).toBe(true);
  });

  it("resets the window after windowMs elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const key = "reset:test";
    const opts = { max: 2, windowMs: 1000 };
    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(false); // window exhausted
    vi.setSystemTime(1001); // past the window
    expect(checkRateLimit(key, opts).allowed).toBe(true); // fresh window
  });

  it("bounds memory: never tracks more than MAX_BUCKETS keys", () => {
    // Flood far more unique keys than the cap; FIFO eviction must hold the line.
    for (let i = 0; i < MAX_BUCKETS + 200; i++) {
      checkRateLimit(`cap:${i}`, { max: 1 });
    }
    expect(rateLimitBucketCount()).toBe(MAX_BUCKETS);
  });
});
