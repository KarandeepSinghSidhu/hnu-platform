import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  study: { findMany: vi.fn() },
  teamMember: { findMany: vi.fn() },
  publication: { findMany: vi.fn() },
  page: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
// rate-limit and client-ip are intentionally NOT mocked here: this exercises the
// real composed throttle path (getClientIp -> checkRateLimit) through the handler,
// which search.test.ts (which mocks rate-limit) cannot.

import { resetRateLimitStore } from "@/lib/rate-limit";
import { GET as search } from "@/app/api/search/route";

// Matches SEARCH_RATE_LIMIT_MAX in the route.
const LIMIT = 60;

function reqFrom(ip: string, q = "nutrition") {
  return new NextRequest(`http://localhost/api/search?q=${q}`, {
    headers: { "x-forwarded-for": ip },
  });
}

describe("GET /api/search rate limiting (B19, integration)", () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.clearAllMocks();
    mockPrisma.study.findMany.mockResolvedValue([]);
    mockPrisma.teamMember.findMany.mockResolvedValue([]);
    mockPrisma.publication.findMany.mockResolvedValue([]);
    mockPrisma.page.findMany.mockResolvedValue([]);
  });

  it("allows up to the limit then 429s for the same IP", async () => {
    const ip = "203.0.113.61";
    for (let i = 0; i < LIMIT; i++) {
      expect((await search(reqFrom(ip))).status).toBe(200);
    }
    const blocked = await search(reqFrom(ip));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("keeps budgets independent per client IP", async () => {
    const ip = "203.0.113.71";
    for (let i = 0; i < LIMIT; i++) await search(reqFrom(ip));
    expect((await search(reqFrom(ip))).status).toBe(429);
    // A different IP is unaffected.
    expect((await search(reqFrom("203.0.113.72"))).status).toBe(200);
  });

  it("collapses forged/garbage x-forwarded-for to one bucket (no key rotation)", async () => {
    // Every request carries a different NON-IP forwarded-for value; all collapse
    // to search:unknown, so they share one budget and cannot rotate keys.
    for (let i = 0; i < LIMIT; i++) {
      await search(reqFrom(`not-an-ip-${i}`));
    }
    expect((await search(reqFrom("still-not-an-ip"))).status).toBe(429);
  });
});
