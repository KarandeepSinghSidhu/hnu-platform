import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  partnerLogo: {
    aggregate: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { POST as createPartnerLogo } from "@/app/api/admin/partner-logos/route";
import { MAX_ORDER } from "@/lib/order";

function postReq(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return new NextRequest("http://localhost/api/admin/partner-logos", {
    method: "POST",
    body: fd,
  });
}

// Regression for B14 / bug-hunt H1: the auto-increment fallback used to write
// `(max ?? -1) + 1` UNCLAMPED, so MAX_ORDER + 1 could be persisted — a value
// SQLite stores but Prisma throws on when reading the row back, crashing the
// admin partner-logos list.
describe("POST /api/admin/partner-logos — auto-increment order is clamped (B14/H1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.partnerLogo.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 1, ...data }),
    );
  });

  it("clamps the fallback so MAX_ORDER + 1 can never be written", async () => {
    mockPrisma.partnerLogo.aggregate.mockResolvedValueOnce({
      _max: { order: MAX_ORDER },
    });

    const res = await createPartnerLogo(postReq({ name: "Acme" }));

    expect(res.status).toBe(201);
    expect(mockPrisma.partnerLogo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: MAX_ORDER }),
      }),
    );
  });

  it("auto-increments normally below the ceiling", async () => {
    mockPrisma.partnerLogo.aggregate.mockResolvedValueOnce({
      _max: { order: 5 },
    });

    const res = await createPartnerLogo(postReq({ name: "Beta" }));

    expect(res.status).toBe(201);
    expect(mockPrisma.partnerLogo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 6 }),
      }),
    );
  });

  it("starts at 0 for an empty table", async () => {
    mockPrisma.partnerLogo.aggregate.mockResolvedValueOnce({
      _max: { order: null },
    });

    const res = await createPartnerLogo(postReq({ name: "Gamma" }));

    expect(res.status).toBe(201);
    expect(mockPrisma.partnerLogo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 0 }),
      }),
    );
  });
});
