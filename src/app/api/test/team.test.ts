import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  teamMember: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET as getTeam } from "@/app/api/team/route";

describe("GET /api/team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns board, research team, and alumni", async () => {
    mockPrisma.teamMember.findMany
      .mockResolvedValueOnce([{ id: 1, name: "Director" }])
      .mockResolvedValueOnce([{ id: 2, name: "Researcher" }])
      .mockResolvedValueOnce([]);

    const response = await getTeam();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      boardOfDirectors: [{ id: 1, name: "Director" }],
      researchTeam: [{ id: 2, name: "Researcher" }],
      alumni: [],
    });
    expect(mockPrisma.teamMember.findMany).toHaveBeenCalledTimes(3);
  });
});
