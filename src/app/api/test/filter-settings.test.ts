import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---------------------------------------------------------------
const mockPrisma = vi.hoisted(() => ({
  publicationFilterSetting: { update: vi.fn() },
}));
const mockSettings = vi.hoisted(() => ({
  getOrCreateFilterSetting: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/publication-filter-settings", () => mockSettings);

import { PUT } from "@/app/api/admin/publications/filter-settings/route";

// A persisted singleton row to seed the PUT handler's `current`.
const currentRow = {
  id: 1,
  minYear: 1998,
  affiliationPhrases: "Human Nutrition Unit",
  institutionRors: "03b94tp07",
  strongKeywords: "nutrition",
  weakKeywords: "health",
  exclusionKeywords: "veterinary",
  routeUnitAffiliation: "Approved",
  routeInstitutionKeyword: "Pending",
  routeStrongKeywords: "Pending",
  routeWeakMatch: "Pending",
  routeExclusion: "Rejected",
  routeNoSignal: "Pending",
  updatedAt: new Date(),
};

function putReq(body: unknown) {
  return new Request("http://test/api/admin/publications/filter-settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/admin/publications/filter-settings — route validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.getOrCreateFilterSetting.mockResolvedValue(currentRow);
    mockPrisma.publicationFilterSetting.update.mockImplementation(
      (args: { data: Record<string, unknown> }) => ({
        ...currentRow,
        ...args.data,
      }),
    );
  });

  it("persists a valid route change", async () => {
    const res = await PUT(putReq({ routeStrongKeywords: "Approved" }));
    expect(res.status).toBe(200);
    const arg = mockPrisma.publicationFilterSetting.update.mock.calls[0][0];
    expect(arg.data.routeStrongKeywords).toBe("Approved");
  });

  it("rejects an invalid bucket value with 400 and does not write", async () => {
    const res = await PUT(putReq({ routeStrongKeywords: "Banana" }));
    expect(res.status).toBe(400);
    expect(mockPrisma.publicationFilterSetting.update).not.toHaveBeenCalled();
  });

  it("rejects Approved for the exclusion rule (off-topic must not auto-approve)", async () => {
    const res = await PUT(putReq({ routeExclusion: "Approved" }));
    expect(res.status).toBe(400);
    expect(mockPrisma.publicationFilterSetting.update).not.toHaveBeenCalled();
  });

  it("allows Pending for the exclusion rule", async () => {
    const res = await PUT(putReq({ routeExclusion: "Pending" }));
    expect(res.status).toBe(200);
    const arg = mockPrisma.publicationFilterSetting.update.mock.calls[0][0];
    expect(arg.data.routeExclusion).toBe("Pending");
  });

  it("rejects Approved for the no-signal rule (zero-signal must not auto-approve)", async () => {
    const res = await PUT(putReq({ routeNoSignal: "Approved" }));
    expect(res.status).toBe(400);
    expect(mockPrisma.publicationFilterSetting.update).not.toHaveBeenCalled();
  });

  it("allows Rejected for the no-signal rule", async () => {
    const res = await PUT(putReq({ routeNoSignal: "Rejected" }));
    expect(res.status).toBe(200);
    const arg = mockPrisma.publicationFilterSetting.update.mock.calls[0][0];
    expect(arg.data.routeNoSignal).toBe("Rejected");
  });
});
