import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  study: {
    findMany: vi.fn(),
  },
  translationCache: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { getNavStudies } from "@/lib/nav-studies";

describe("getNavStudies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries active, non-completed studies in admin order and returns only nav fields", async () => {
    mockPrisma.study.findMany.mockResolvedValueOnce([
      { slug: "s1", title: "Study 1", imagePath: "/images/studies/s1.jpg" },
    ]);

    await expect(getNavStudies("EN")).resolves.toEqual([
      { slug: "s1", title: "Study 1", imagePath: "/images/studies/s1.jpg" },
    ]);

    // The "hide Completed" + ordering policy is owned by the server query, not
    // the client — so the filter and order live in the where/orderBy.
    expect(mockPrisma.study.findMany).toHaveBeenCalledWith({
      where: { isActive: true, status: { not: "Completed" } },
      orderBy: { order: "asc" },
      select: { slug: true, title: true, imagePath: true },
    });
  });

  it("localizes titles to Chinese from the translation cache", async () => {
    mockPrisma.study.findMany.mockResolvedValueOnce([
      { slug: "s1", title: "Study 1", imagePath: null },
    ]);
    const sha256 = (s: string) =>
      crypto.createHash("sha256").update(s).digest("hex");
    mockPrisma.translationCache.findMany.mockResolvedValue([
      { format: "text", sourceHash: sha256("Study 1"), translatedText: "研究一" },
    ]);

    await expect(getNavStudies("ZH")).resolves.toEqual([
      { slug: "s1", title: "研究一", imagePath: null },
    ]);
  });

  it("returns [] when the query fails (transient DB error doesn't break the page)", async () => {
    mockPrisma.study.findMany.mockRejectedValueOnce(new Error("db error"));
    await expect(getNavStudies("EN")).resolves.toEqual([]);
  });
});
