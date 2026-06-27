import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  mediaAsset: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pageBlock: {
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
  },
  // DB-field consumers scanned by findAssetUsage. Default to "no usage" (kept
  // across vi.clearAllMocks, which clears call history but not implementations)
  // so each test opts into a match explicitly.
  teamMember: {
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  partnerLogo: {
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  study: {
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  // Array-form $transaction: run the batched operations and return their results.
  $transaction: vi.fn((ops: unknown[]) =>
    Promise.all(ops as Promise<unknown>[]),
  ),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("fs/promises", () => ({
  unlink: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
}));

import {
  PATCH as patchMedia,
  DELETE as deleteMedia,
} from "@/app/api/admin/media/[id]/route";
import { GET as getUsage } from "@/app/api/admin/media/[id]/usage/route";
import { POST as replaceMedia } from "@/app/api/admin/media/[id]/replace/route";

function jsonReq(method: string, body: unknown) {
  return new NextRequest("http://localhost/x", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function fileFormReq(url: string) {
  const fd = new FormData();
  fd.append(
    "file",
    new File([new Uint8Array([1, 2, 3, 4])], "new.png", { type: "image/png" }),
  );
  return new NextRequest(url, { method: "POST", body: fd });
}

const usageBlock = (id: number, ref: string) => ({
  id,
  type: "infoCardLeft",
  content: JSON.stringify({ imageSrc: ref }),
  page: { slug: "home", title: "Home" },
});

describe("PATCH /api/admin/media/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400 for an invalid id", async () => {
    const res = await patchMedia(jsonReq("PATCH", { altText: "x" }), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("404 when the asset doesn't exist (not a 500)", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce(null);
    const res = await patchMedia(jsonReq("PATCH", { altText: "x" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(404);
    expect(mockPrisma.mediaAsset.update).not.toHaveBeenCalled();
  });

  it("updates alt text for an existing asset", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 1,
      altText: "a",
      caption: "",
    });
    mockPrisma.mediaAsset.update.mockResolvedValueOnce({
      id: 1,
      altText: "new",
      caption: "",
    });
    const res = await patchMedia(jsonReq("PATCH", { altText: "new" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.mediaAsset.update).toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/media/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 when the asset doesn't exist", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce(null);
    const res = await deleteMedia(
      new Request("http://localhost/x", { method: "DELETE" }) as NextRequest,
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(404);
    expect(mockPrisma.mediaAsset.delete).not.toHaveBeenCalled();
  });

  it("deletes an unused asset record", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 1,
      filePath: "/uploads/media/x.png",
    });
    mockPrisma.pageBlock.findMany.mockResolvedValueOnce([]);
    mockPrisma.mediaAsset.delete.mockResolvedValueOnce({});
    const res = await deleteMedia(
      new Request("http://localhost/x", { method: "DELETE" }) as NextRequest,
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.mediaAsset.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("blocks deleting an asset that's still in use (409)", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 1,
      filePath: "/uploads/media/x.png",
    });
    mockPrisma.pageBlock.findMany.mockResolvedValueOnce([
      usageBlock(10, "media:1"),
    ]);
    const res = await deleteMedia(
      new Request("http://localhost/x", { method: "DELETE" }) as NextRequest,
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(409);
    expect(mockPrisma.mediaAsset.delete).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.usage).toHaveLength(1);
  });

  it("force-deletes an in-use asset with ?force=1", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 1,
      filePath: "/uploads/media/x.png",
    });
    mockPrisma.mediaAsset.delete.mockResolvedValueOnce({});
    const res = await deleteMedia(
      new Request("http://localhost/x?force=1", {
        method: "DELETE",
      }) as NextRequest,
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.pageBlock.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.mediaAsset.delete).toHaveBeenCalled();
  });
});

describe("GET /api/admin/media/[id]/usage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 when the asset doesn't exist", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce(null);
    const res = await getUsage(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(404);
  });

  it("reports only blocks that genuinely reference the asset", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 1,
      filePath: "/uploads/media/x.png",
    });
    // A coarse `contains` match can include a non-match (media:1 vs media:99);
    // the exact-id filter must drop it.
    mockPrisma.pageBlock.findMany.mockResolvedValueOnce([
      usageBlock(10, "media:1"),
      usageBlock(11, "media:99"),
    ]);
    const res = await getUsage(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usage).toHaveLength(1);
    expect(body.usage[0]).toMatchObject({
      pageSlug: "home",
      blockType: "infoCardLeft",
    });
  });

  it("detects DB-field references (e.g. a team photo) by exact path", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 5,
      filePath: "/images/team/jane.jpg",
    });
    mockPrisma.pageBlock.findMany.mockResolvedValueOnce([]);
    mockPrisma.teamMember.findMany.mockResolvedValueOnce([
      { id: 9, name: "Jane Doe" },
    ]);
    const res = await getUsage(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usage).toHaveLength(1);
    expect(body.usage[0]).toMatchObject({ kind: "team", blockType: "Jane Doe" });
  });

  it("detects partner-logo and study-image references by exact path", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 7,
      filePath: "/images/x.png",
    });
    mockPrisma.pageBlock.findMany.mockResolvedValueOnce([]);
    mockPrisma.partnerLogo.findMany.mockResolvedValueOnce([
      { id: 3, name: "Acme" },
    ]);
    mockPrisma.study.findMany.mockResolvedValueOnce([
      { id: 4, title: "NZ Synergy" },
    ]);
    const res = await getUsage(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: "7" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usage).toHaveLength(2);
    const kinds = body.usage
      .map((u: { kind: string }) => u.kind)
      .sort();
    expect(kinds).toEqual(["partner", "study"]);
  });
});

describe("POST /api/admin/media/[id]/replace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 when the asset doesn't exist", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce(null);
    const res = await replaceMedia(fileFormReq("http://localhost/x"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(404);
  });

  it("swaps the file and keeps the same record id", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 1,
      filePath: "/uploads/media/old.png",
    });
    mockPrisma.mediaAsset.update.mockResolvedValueOnce({
      id: 1,
      filePath: "/uploads/media/old.png",
    });
    const res = await replaceMedia(fileFormReq("http://localhost/x"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.mediaAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  it("repoints a cataloged /public image to a managed file and migrates DB consumers", async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 2,
      filePath: "/images/hero.jpg",
    });
    mockPrisma.mediaAsset.update.mockResolvedValueOnce({
      id: 2,
      filePath: "/uploads/media/new.jpg",
    });
    const res = await replaceMedia(fileFormReq("http://localhost/x"), {
      params: Promise.resolve({ id: "2" }),
    });
    expect(res.status).toBe(200);
    // Repointed into managed storage (the original /public file is left intact),
    // so the fresh URL bypasses the Next <Image> optimizer cache.
    const updateArg = mockPrisma.mediaAsset.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 2 });
    expect(updateArg.data.filePath).toMatch(/^\/uploads\/media\//);
    // DB-field consumers that pointed at the old path are migrated to the new one.
    expect(mockPrisma.teamMember.updateMany).toHaveBeenCalledWith({
      where: { photoPath: "/images/hero.jpg" },
      data: { photoPath: updateArg.data.filePath },
    });
    expect(mockPrisma.partnerLogo.updateMany).toHaveBeenCalledWith({
      where: { logoPath: "/images/hero.jpg" },
      data: { logoPath: updateArg.data.filePath },
    });
    expect(mockPrisma.study.updateMany).toHaveBeenCalledWith({
      where: { imagePath: "/images/hero.jpg" },
      data: { imagePath: updateArg.data.filePath },
    });
  });
});
