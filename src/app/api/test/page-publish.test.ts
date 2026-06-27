import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  page: { findUnique: vi.fn(), update: vi.fn() },
  pageBlock: { deleteMany: vi.fn(), createMany: vi.fn() },
  pageRevision: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  // Publish warms 中文 translations, which collects referenced assets' altText
  // via prisma.mediaAsset.findMany (default: no assets). The default survives
  // clearAllMocks (which clears calls, not implementations).
  mediaAsset: { findMany: vi.fn().mockResolvedValue([]) },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import {
  snapshotBlocks,
  parsePublishedSnapshot,
  hasUnpublishedChanges,
} from "@/lib/page-publish";
import { POST as publish } from "@/app/api/admin/pages/[slug]/publish/route";
import { POST as discard } from "@/app/api/admin/pages/[slug]/discard/route";
import {
  GET as listRevisions,
  DELETE as clearRevisions,
} from "@/app/api/admin/pages/[slug]/revisions/route";
import { POST as restore } from "@/app/api/admin/pages/[slug]/revisions/[id]/restore/route";
import { POST as rebaseline } from "@/app/api/admin/pages/[slug]/rebaseline/route";

const post = () => new Request("http://localhost/x", { method: "POST" });

describe("page-publish snapshot helpers", () => {
  it("snapshotBlocks keeps only visible blocks, in order, as {type,content}", () => {
    const snap = snapshotBlocks([
      { type: "a", content: '{"x":1}', isVisible: true },
      { type: "hidden", content: "{}", isVisible: false },
      { type: "b", content: "{}", isVisible: true },
    ]);
    expect(JSON.parse(snap)).toEqual([
      { type: "a", content: '{"x":1}' },
      { type: "b", content: "{}" },
    ]);
  });

  it("parsePublishedSnapshot is tolerant of junk", () => {
    expect(parsePublishedSnapshot(null)).toEqual([]);
    expect(parsePublishedSnapshot("not json")).toEqual([]);
    expect(parsePublishedSnapshot('{"not":"array"}')).toEqual([]);
    expect(
      parsePublishedSnapshot('[{"type":"a","content":"{}"},null,{"type":1}]'),
    ).toEqual([{ type: "a", content: "{}" }]);
  });

  it("hasUnpublishedChanges compares the live snapshot to published", () => {
    const blocks = [{ type: "a", content: "{}", isVisible: true }];
    expect(hasUnpublishedChanges(null, blocks)).toBe(true);
    expect(hasUnpublishedChanges(snapshotBlocks(blocks), blocks)).toBe(false);
    expect(hasUnpublishedChanges('[{"type":"b","content":"{}"}]', blocks)).toBe(
      true,
    );
  });
});

describe("POST /api/admin/pages/[slug]/publish", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 when the page is missing", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce(null);
    const res = await publish(post(), {
      params: Promise.resolve({ slug: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("snapshots visible blocks, updates the page, and records a revision", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({
      id: 3,
      blocks: [{ type: "a", content: '{"t":1}', isVisible: true }],
    });
    mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(mockPrisma));
    mockPrisma.pageRevision.findMany.mockResolvedValueOnce([]); // nothing to prune

    const res = await publish(post(), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.page.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: expect.objectContaining({
        publishedContent: '[{"type":"a","content":"{\\"t\\":1}"}]',
      }),
    });
    expect(mockPrisma.pageRevision.create).toHaveBeenCalledWith({
      data: {
        pageId: 3,
        content: '[{"type":"a","content":"{\\"t\\":1}"}]',
        label: "Published",
      },
    });
  });

  it("preserves the original published version on the first publish", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({
      id: 4,
      publishedContent: '[{"type":"old","content":"{}"}]',
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      blocks: [{ type: "new", content: "{}", isVisible: true }],
    });
    mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(mockPrisma));
    mockPrisma.pageRevision.count.mockResolvedValueOnce(0);
    mockPrisma.pageRevision.findMany.mockResolvedValueOnce([]);

    const res = await publish(post(), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(200);
    // The pre-edit published content is captured as the recoverable "Original".
    expect(mockPrisma.pageRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pageId: 4,
        content: '[{"type":"old","content":"{}"}]',
        label: "Original",
      }),
    });
    // ...and the newly published version is recorded as usual.
    expect(mockPrisma.pageRevision.create).toHaveBeenCalledWith({
      data: {
        pageId: 4,
        content: '[{"type":"new","content":"{}"}]',
        label: "Published",
      },
    });
  });

  it("does not add another Original revision on later publishes", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({
      id: 4,
      publishedContent: '[{"type":"old","content":"{}"}]',
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      blocks: [{ type: "new", content: "{}", isVisible: true }],
    });
    mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(mockPrisma));
    mockPrisma.pageRevision.count.mockResolvedValueOnce(2);
    mockPrisma.pageRevision.findMany.mockResolvedValueOnce([]);

    await publish(post(), { params: Promise.resolve({ slug: "home" }) });
    const labels = mockPrisma.pageRevision.create.mock.calls.map(
      (c) => c[0].data.label,
    );
    expect(labels).not.toContain("Original");
    expect(labels).toContain("Published");
  });
});

describe("POST /api/admin/pages/[slug]/discard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("noop when the page was never published", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({
      id: 1,
      publishedContent: null,
    });
    const res = await discard(post(), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("replaces the draft blocks from the published snapshot", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({
      id: 7,
      publishedContent: '[{"type":"a","content":"{}"}]',
    });
    mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(mockPrisma));

    const res = await discard(post(), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.pageBlock.deleteMany).toHaveBeenCalledWith({
      where: { pageId: 7 },
    });
    expect(mockPrisma.pageBlock.createMany).toHaveBeenCalledWith({
      data: [
        { pageId: 7, type: "a", content: "{}", position: 0, isVisible: true },
      ],
    });
  });
});

describe("GET /api/admin/pages/[slug]/revisions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns revision metadata with a computed block count", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({ id: 2 });
    mockPrisma.pageRevision.findMany.mockResolvedValueOnce([
      {
        id: 9,
        label: "Published",
        createdAt: new Date("2026-05-01T00:00:00Z"),
        content: '[{"type":"a","content":"{}"},{"type":"b","content":"{}"}]',
      },
    ]);
    const res = await listRevisions(new Request("http://localhost/x"), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      expect.objectContaining({ id: 9, label: "Published", blockCount: 2 }),
    ]);
  });
});

describe("POST /api/admin/pages/[slug]/revisions/[id]/restore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400 for an invalid revision id", async () => {
    const res = await restore(post(), {
      params: Promise.resolve({ slug: "home", id: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("404 when the revision doesn't belong to the page", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({ id: 5 });
    mockPrisma.pageRevision.findFirst.mockResolvedValueOnce(null);
    const res = await restore(post(), {
      params: Promise.resolve({ slug: "home", id: "9" }),
    });
    expect(res.status).toBe(404);
    expect(mockPrisma.pageRevision.findFirst).toHaveBeenCalledWith({
      where: { id: 9, pageId: 5 },
    });
  });

  it("restores the revision snapshot into the draft blocks", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({ id: 5 });
    mockPrisma.pageRevision.findFirst.mockResolvedValueOnce({
      id: 9,
      pageId: 5,
      content: '[{"type":"a","content":"{}"}]',
    });
    mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(mockPrisma));

    const res = await restore(post(), {
      params: Promise.resolve({ slug: "home", id: "9" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.pageBlock.createMany).toHaveBeenCalledWith({
      data: [
        { pageId: 5, type: "a", content: "{}", position: 0, isVisible: true },
      ],
    });
  });
});

describe("POST /api/admin/pages/[slug]/rebaseline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 when the page is missing", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce(null);
    const res = await rebaseline(post(), {
      params: Promise.resolve({ slug: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("400 when the page has never been published", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({
      id: 6,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      publishedContent: null,
    });
    const res = await rebaseline(post(), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(400);
    expect(mockPrisma.pageRevision.update).not.toHaveBeenCalled();
    expect(mockPrisma.pageRevision.create).not.toHaveBeenCalled();
  });

  it("replaces the existing Original's content and re-stamps its date", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({
      id: 6,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      publishedContent: '[{"type":"new","content":"{}"}]',
    });
    mockPrisma.pageRevision.findFirst.mockResolvedValueOnce({ id: 11 });

    const res = await rebaseline(post(), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(200);
    // createdAt is stamped to "now" so History shows when the baseline was reset.
    expect(mockPrisma.pageRevision.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: {
        content: '[{"type":"new","content":"{}"}]',
        createdAt: expect.any(Date),
      },
    });
    expect(mockPrisma.pageRevision.create).not.toHaveBeenCalled();
  });

  it("creates a backdated Original when none exists", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    mockPrisma.page.findUnique.mockResolvedValueOnce({
      id: 6,
      createdAt,
      publishedContent: '[{"type":"new","content":"{}"}]',
    });
    mockPrisma.pageRevision.findFirst.mockResolvedValueOnce(null);

    const res = await rebaseline(post(), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.pageRevision.create).toHaveBeenCalledWith({
      data: {
        pageId: 6,
        content: '[{"type":"new","content":"{}"}]',
        label: "Original",
        createdAt,
      },
    });
    expect(mockPrisma.pageRevision.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/pages/[slug]/revisions (clear history)", () => {
  const del = () => new Request("http://localhost/x", { method: "DELETE" });

  beforeEach(() => vi.clearAllMocks());

  it("404 when the page is missing", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce(null);
    const res = await clearRevisions(del(), {
      params: Promise.resolve({ slug: "nope" }),
    });
    expect(res.status).toBe(404);
    expect(mockPrisma.pageRevision.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes every revision except the Original baseline", async () => {
    mockPrisma.page.findUnique.mockResolvedValueOnce({ id: 7 });
    mockPrisma.pageRevision.deleteMany.mockResolvedValueOnce({ count: 3 });

    const res = await clearRevisions(del(), {
      params: Promise.resolve({ slug: "home" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.pageRevision.deleteMany).toHaveBeenCalledWith({
      where: { pageId: 7, label: { not: "Original" } },
    });
  });
});
