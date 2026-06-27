import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  study: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  translationCache: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET as getStudies } from "@/app/api/studies/route";
import { GET as getStudyBySlug } from "@/app/api/studies/[slug]/route";

describe("GET /api/studies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active studies with expected fields", async () => {
    mockPrisma.study.findMany.mockResolvedValueOnce([
      {
        id: 1,
        slug: "s1",
        title: "Study 1",
        shortDescription: "Desc",
        imagePath: "/images/studies/s1.jpg",
        contactEmail: "team@example.com",
        isActive: true,
      },
    ]);

    const response = await getStudies(
      new Request("http://localhost/api/studies?lang=en"),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: 1,
        slug: "s1",
        title: "Study 1",
        shortDescription: "Desc",
        imagePath: "/images/studies/s1.jpg",
        contactEmail: "team@example.com",
        isActive: true,
      },
    ]);
    expect(mockPrisma.study.findMany).toHaveBeenCalledWith({
      where: { isActive: true, status: { not: "Completed" } },
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        imagePath: true,
        contactEmail: true,
        isActive: true,
      },
    });
  });

  it("localizes title and short description to Chinese from the cache", async () => {
    mockPrisma.study.findMany.mockResolvedValueOnce([
      {
        id: 1,
        slug: "s1",
        title: "Study 1",
        shortDescription: "Desc",
        imagePath: "/images/studies/s1.jpg",
        contactEmail: "team@example.com",
        isActive: true,
      },
    ]);
    const sha256 = (s: string) =>
      crypto.createHash("sha256").update(s).digest("hex");
    mockPrisma.translationCache.findMany.mockResolvedValue([
      { format: "text", sourceHash: sha256("Study 1"), translatedText: "研究一" },
      { format: "text", sourceHash: sha256("Desc"), translatedText: "描述" },
    ]);

    const response = await getStudies(
      new Request("http://localhost/api/studies?lang=zh"),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: 1,
        slug: "s1",
        title: "研究一",
        shortDescription: "描述",
        imagePath: "/images/studies/s1.jpg",
        contactEmail: "team@example.com",
        isActive: true,
      },
    ]);
  });

  it("returns 500 when database query fails", async () => {
    mockPrisma.study.findMany.mockRejectedValueOnce(new Error("db error"));
    const response = await getStudies(
      new Request("http://localhost/api/studies?lang=en"),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to fetch studies.",
    });
  });
});

describe("GET /api/studies/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns study details by slug", async () => {
    mockPrisma.study.findFirst.mockResolvedValueOnce({
      title: "Study 1",
      isActive: true,
      fullDescriptionEn: "en",
      fullDescriptionZh: "zh",
      eligibilityEn: "elig en",
      eligibilityZh: "elig zh",
      compensationEn: "comp en",
      compensationZh: "comp zh",
      redcapUrl: "https://example.com",
      contactEmail: "team@example.com",
      contactPhone: "123",
      contactPhoneZh: "123",
      ethicsStatement: "ethics",
    });

    const response = await getStudyBySlug(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "s1" }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      title: "Study 1",
      isActive: true,
      fullDescriptionEn: "en",
      fullDescriptionZh: "zh",
    });
    expect(mockPrisma.study.findFirst).toHaveBeenCalledWith({
      where: { slug: "s1" },
      select: {
        title: true,
        isActive: true,
        fullDescriptionEn: true,
        fullDescriptionZh: true,
        eligibilityEn: true,
        eligibilityZh: true,
        compensationEn: true,
        compensationZh: true,
        redcapUrl: true,
        contactEmail: true,
        contactPhone: true,
        contactPhoneZh: true,
        ethicsStatement: true,
      },
    });
  });

  it("returns 404 when study does not exist", async () => {
    mockPrisma.study.findFirst.mockResolvedValueOnce(null);
    const response = await getStudyBySlug(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "missing" }),
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Study not found." });
  });
});
