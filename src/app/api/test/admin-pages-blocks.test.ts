import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  page: { findMany: vi.fn(), findUnique: vi.fn() },
  pageBlock: {
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { GET as listPages } from "@/app/api/admin/pages/route";
import { POST as createBlock } from "@/app/api/admin/pages/[slug]/blocks/route";
import {
  PATCH as patchBlock,
  DELETE as deleteBlock,
} from "@/app/api/admin/pages/[slug]/blocks/[id]/route";
import { POST as duplicateBlock } from "@/app/api/admin/pages/[slug]/blocks/[id]/duplicate/route";
import { PATCH as reorderBlocks } from "@/app/api/admin/pages/[slug]/blocks/reorder/route";

function jsonReq(method: string, body: unknown) {
  return new NextRequest("http://localhost/x", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/pages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("excludes study-layout pages and the reworked studies page from the list", async () => {
    mockPrisma.page.findMany.mockResolvedValueOnce([]);
    const res = await listPages();
    expect(res.status).toBe(200);
    expect(mockPrisma.page.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: { not: "studies" },
          NOT: { slug: { startsWith: "studylayout-" } },
        },
      }),
    );
  });
});

describe("POST /api/admin/pages/[slug]/blocks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 when the page does not exist", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce(null);
    const res = await createBlock(
      jsonReq("POST", { type: "sectionHeading", content: {} }),
      { params: Promise.resolve({ slug: "nope" }) },
    );
    expect(res.status).toBe(404);
  });

  it("400 for an unknown block type", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({ id: 1 });
    const res = await createBlock(
      jsonReq("POST", { type: "not-a-block", content: {} }),
      { params: Promise.resolve({ slug: "home" }) },
    );
    expect(res.status).toBe(400);
  });

  it("creates a block and shifts later positions down", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({ id: 1 });
    mockPrisma.pageBlock.count.mockResolvedValueOnce(2);
    mockPrisma.pageBlock.updateMany.mockResolvedValueOnce({ count: 0 });
    mockPrisma.pageBlock.create.mockResolvedValueOnce({
      id: 5,
      type: "sectionHeading",
      content: "{}",
      position: 0,
      isVisible: true,
    });
    const res = await createBlock(
      jsonReq("POST", {
        type: "sectionHeading",
        content: { text: "Hi" },
        position: 0,
      }),
      { params: Promise.resolve({ slug: "home" }) },
    );
    expect(res.status).toBe(201);
    expect(mockPrisma.pageBlock.updateMany).toHaveBeenCalled();
    expect(mockPrisma.pageBlock.create).toHaveBeenCalled();
  });
});

describe("PATCH/DELETE block scoping /api/admin/pages/[slug]/blocks/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCH 404 when the block doesn't belong to the page slug", async () => {
    mockPrisma.pageBlock.findFirst.mockResolvedValueOnce(null);
    const res = await patchBlock(jsonReq("PATCH", { isVisible: false }), {
      params: Promise.resolve({ slug: "about", id: "1" }),
    });
    expect(res.status).toBe(404);
    expect(mockPrisma.pageBlock.findFirst).toHaveBeenCalledWith({
      where: { id: 1, page: { slug: "about" } },
    });
    expect(mockPrisma.pageBlock.update).not.toHaveBeenCalled();
  });

  it("PATCH updates a block scoped to its page", async () => {
    mockPrisma.pageBlock.findFirst.mockResolvedValueOnce({
      id: 1,
      type: "sectionHeading",
      pageId: 3,
    });
    mockPrisma.pageBlock.update.mockResolvedValueOnce({ id: 1, isVisible: false });
    const res = await patchBlock(jsonReq("PATCH", { isVisible: false }), {
      params: Promise.resolve({ slug: "home", id: "1" }),
    });
    expect(res.status).toBe(200);
  });

  it("DELETE 404 when the block doesn't belong to the page slug", async () => {
    mockPrisma.pageBlock.findFirst.mockResolvedValueOnce(null);
    const res = await deleteBlock(
      new Request("http://localhost/x", { method: "DELETE" }),
      { params: Promise.resolve({ slug: "about", id: "99" }) },
    );
    expect(res.status).toBe(404);
    expect(mockPrisma.pageBlock.delete).not.toHaveBeenCalled();
  });

  it("DELETE removes a scoped block and closes the position gap", async () => {
    mockPrisma.pageBlock.findFirst.mockResolvedValueOnce({
      id: 1,
      pageId: 3,
      position: 0,
    });
    mockPrisma.pageBlock.delete.mockResolvedValueOnce({});
    mockPrisma.pageBlock.updateMany.mockResolvedValueOnce({ count: 0 });
    const res = await deleteBlock(
      new Request("http://localhost/x", { method: "DELETE" }),
      { params: Promise.resolve({ slug: "home", id: "1" }) },
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.pageBlock.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe("POST /api/admin/pages/[slug]/blocks/[id]/duplicate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400 for an invalid id", async () => {
    const res = await duplicateBlock(
      new Request("http://localhost/x", { method: "POST" }),
      { params: Promise.resolve({ slug: "home", id: "abc" }) },
    );
    expect(res.status).toBe(400);
  });

  it("404 when the block doesn't belong to the page slug", async () => {
    mockPrisma.pageBlock.findFirst.mockResolvedValueOnce(null);
    const res = await duplicateBlock(
      new Request("http://localhost/x", { method: "POST" }),
      { params: Promise.resolve({ slug: "about", id: "5" }) },
    );
    expect(res.status).toBe(404);
    expect(mockPrisma.pageBlock.findFirst).toHaveBeenCalledWith({
      where: { id: 5, page: { slug: "about" } },
    });
  });

  it("inserts a copy right after the original, shifting later blocks down", async () => {
    mockPrisma.pageBlock.findFirst.mockResolvedValueOnce({
      id: 5,
      pageId: 3,
      type: "sectionHeading",
      content: '{"text":"Hi"}',
      position: 1,
      isVisible: true,
    });
    // Run the duplicate transaction against the same mock.
    mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(mockPrisma));
    mockPrisma.pageBlock.updateMany.mockResolvedValueOnce({ count: 2 });
    mockPrisma.pageBlock.create.mockResolvedValueOnce({
      id: 6,
      type: "sectionHeading",
      content: '{"text":"Hi"}',
      position: 2,
      isVisible: true,
    });

    const res = await duplicateBlock(
      new Request("http://localhost/x", { method: "POST" }),
      { params: Promise.resolve({ slug: "home", id: "5" }) },
    );
    expect(res.status).toBe(201);
    expect(mockPrisma.pageBlock.updateMany).toHaveBeenCalledWith({
      where: { pageId: 3, position: { gte: 2 } },
      data: { position: { increment: 1 } },
    });
    expect(mockPrisma.pageBlock.create).toHaveBeenCalledWith({
      data: {
        pageId: 3,
        type: "sectionHeading",
        content: '{"text":"Hi"}',
        position: 2,
        isVisible: true,
      },
    });
  });
});

describe("PATCH /api/admin/pages/[slug]/blocks/reorder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 when the page is missing", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce(null);
    const res = await reorderBlocks(jsonReq("PATCH", { order: [1] }), {
      params: Promise.resolve({ slug: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("400 when order length doesn't match the page's blocks", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({
      id: 1,
      blocks: [{ id: 1 }, { id: 2 }],
    });
    const res = await reorderBlocks(jsonReq("PATCH", { order: [1] }), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 when order contains an id from another page", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({
      id: 1,
      blocks: [{ id: 1 }, { id: 2 }],
    });
    const res = await reorderBlocks(jsonReq("PATCH", { order: [1, 3] }), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(400);
  });

  it("200 and runs a transaction for a valid reorder", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({
      id: 1,
      blocks: [{ id: 1 }, { id: 2 }],
    });
    mockPrisma.pageBlock.update.mockReturnValue({});
    mockPrisma.$transaction.mockResolvedValueOnce([]);
    const res = await reorderBlocks(jsonReq("PATCH", { order: [2, 1] }), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});
