import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STUDY_LAYOUT_BLOCKS } from "@/components/blocks/study/study-default-layout";

const mockPrisma = vi.hoisted(() => ({
  page: { upsert: vi.fn() },
  pageBlock: { deleteMany: vi.fn(), createMany: vi.fn() },
  $transaction: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { POST as resetOriginal } from "@/app/api/admin/study-layouts/[slug]/reset-original/route";

function postReq() {
  return new Request("http://localhost/x", { method: "POST" });
}

describe("POST /api/admin/study-layouts/[slug]/reset-original", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes the original default layout into a study's override", async () => {
    mockPrisma.page.upsert.mockResolvedValueOnce({ id: 7 });
    const res = await resetOriginal(postReq(), {
      params: Promise.resolve({ slug: "ferdinand" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.page.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "studylayout-ferdinand" } }),
    );
    // Original default fully (re)written in one atomic transaction.
    expect(mockPrisma.pageBlock.createMany).toHaveBeenCalledTimes(1);
    const arg = mockPrisma.pageBlock.createMany.mock.calls[0][0] as {
      data: { pageId: number; type: string }[];
    };
    expect(arg.data).toHaveLength(DEFAULT_STUDY_LAYOUT_BLOCKS.length);
    expect(arg.data.every((b) => b.pageId === 7)).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("targets the shared template when slug is __default__", async () => {
    mockPrisma.page.upsert.mockResolvedValueOnce({ id: 1 });
    const res = await resetOriginal(postReq(), {
      params: Promise.resolve({ slug: "__default__" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.page.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "studylayout-__default__" } }),
    );
  });
});
