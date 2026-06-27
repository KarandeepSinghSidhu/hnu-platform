import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  partnerLogo: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET as getPartnerLogos } from "@/app/api/partner-logos/route";

describe("GET /api/partner-logos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns logos sorted by order with public fields only", async () => {
    mockPrisma.partnerLogo.findMany.mockResolvedValueOnce([
      {
        id: 1,
        name: "A",
        logoPath: "/logos/a.png",
        websiteUrl: "https://a.example.com",
        isPlaceholder: false,
        group: "Collaborating",
      },
    ]);

    const response = await getPartnerLogos();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: 1,
        name: "A",
        logoPath: "/logos/a.png",
        websiteUrl: "https://a.example.com",
        isPlaceholder: false,
        group: "Collaborating",
      },
    ]);
  });

  it("returns 500 on database failure", async () => {
    mockPrisma.partnerLogo.findMany.mockRejectedValueOnce(new Error("db error"));
    const response = await getPartnerLogos();
    expect(response.status).toBe(500);
  });
});
