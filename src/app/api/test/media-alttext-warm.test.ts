import { beforeEach, describe, expect, it, vi } from "vitest";

// collectAssetAltTexts only touches MediaAsset — mock just that.
const mockPrisma = vi.hoisted(() => ({
  mediaAsset: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { collectAssetAltTexts } from "@/lib/media-resolve";
import { toMediaRef } from "@/lib/media-refs";

describe("collectAssetAltTexts (translation warm pass — B23/A11Y-01)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gathers the library altText of every referenced asset, dropping empties", async () => {
    mockPrisma.mediaAsset.findMany.mockResolvedValueOnce([
      { altText: "A researcher at a microscope" },
      { altText: "" }, // decorative asset — empty, nothing to translate
      { altText: "Our team outside the lab" },
    ]);

    const alts = await collectAssetAltTexts([
      { imageSrc: toMediaRef(1), imageAlt: "" },
      { nested: { image: toMediaRef(2) } },
      { cards: [{ imageSrc: toMediaRef(3) }] },
    ]);

    expect(alts).toEqual([
      "A researcher at a microscope",
      "Our team outside the lab",
    ]);
    // One query for the referenced ids — assert the id *set* (an `in` clause is
    // order-independent, so don't pin the array order) and that only altText is
    // selected.
    expect(mockPrisma.mediaAsset.findMany).toHaveBeenCalledTimes(1);
    const [findArgs] = mockPrisma.mediaAsset.findMany.mock.calls[0];
    expect(new Set(findArgs.where.id.in)).toEqual(new Set([1, 2, 3]));
    expect(findArgs.select).toEqual({ altText: true });
  });

  it("makes no query when the contents hold no media refs", async () => {
    const alts = await collectAssetAltTexts([
      { imageSrc: "/uploads/media/raw.png", imageAlt: "a raw path, not a ref" },
    ]);

    expect(alts).toEqual([]);
    expect(mockPrisma.mediaAsset.findMany).not.toHaveBeenCalled();
  });
});
