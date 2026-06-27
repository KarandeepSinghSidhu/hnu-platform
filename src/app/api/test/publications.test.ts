import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  publication: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { GET } from "@/app/api/publications/route";

const MAX_TAKE = 1000;

const req = (qs = "") => new Request(`http://localhost/api/publications${qs}`);

// The `take` argument passed to the most recent prisma.publication.findMany call.
function lastTake(): number | undefined {
  const calls = mockPrisma.publication.findMany.mock.calls;
  const arg = calls[calls.length - 1]?.[0] as { take?: number } | undefined;
  return arg?.take;
}

describe("GET /api/publications ?take= clamping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.publication.findMany.mockResolvedValue([]);
  });

  it("defaults to MAX_TAKE when the param is absent", async () => {
    await GET(req());
    expect(lastTake()).toBe(MAX_TAKE);
  });

  it("honours a valid in-range take", async () => {
    await GET(req("?take=5"));
    expect(lastTake()).toBe(5);
  });

  it("clamps take=0 up to 1", async () => {
    await GET(req("?take=0"));
    expect(lastTake()).toBe(1);
  });

  it("clamps a negative take up to 1", async () => {
    await GET(req("?take=-7"));
    expect(lastTake()).toBe(1);
  });

  it("clamps an over-large take down to MAX_TAKE", async () => {
    await GET(req("?take=999999"));
    expect(lastTake()).toBe(MAX_TAKE);
  });

  it("defaults to MAX_TAKE for a non-numeric take", async () => {
    await GET(req("?take=abc"));
    expect(lastTake()).toBe(MAX_TAKE);
  });
});
