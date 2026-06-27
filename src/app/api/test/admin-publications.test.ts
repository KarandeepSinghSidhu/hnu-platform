import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  publication: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  deletedPublication: {
    create: vi.fn(),
  },
  // The delete route wraps tombstone-create + publication-delete in a
  // transaction; emulate it by resolving the supplied prisma-promise array.
  $transaction: vi.fn((operations: unknown[]) => Promise.all(operations)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  GET as getPublication,
  PATCH as patchPublication,
  DELETE as deletePublication,
} from "@/app/api/admin/publications/[id]/route";

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const basePublication = {
  id: 1,
  title: "Test Publication",
  authorsRaw: "Author A",
  journal: "Nature",
  year: 2024,
  doi: "10.1000/test",
  pubType: "Journal Article",
  url: null,
  abstract: null,
  affiliation: null,
  sourceType: "manual",
  sourceId: null,
  orcidSource: null,
  status: "Pending",
  isVisible: true,
  hiddenManually: false,
  matchedKeywords: "",
  lastSyncedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  categoryId: null,
  category: null,
  authors: [],
};

describe("admin publications/[id] routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // GET
  it("GET returns 400 for invalid id", async () => {
    const res = await getPublication(
      new Request("http://localhost"),
      makeParams("abc"),
    );
    expect(res.status).toBe(400);
  });

  it("GET returns 404 when publication not found", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce(null);
    const res = await getPublication(
      new Request("http://localhost"),
      makeParams("1"),
    );
    expect(res.status).toBe(404);
  });

  it("GET returns publication on success", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce(basePublication);
    const res = await getPublication(
      new Request("http://localhost"),
      makeParams("1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(1);
  });

  // PATCH
  it("PATCH returns 400 for invalid id", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Approved" }),
    });
    const res = await patchPublication(req, makeParams("not-a-number"));
    expect(res.status).toBe(400);
  });

  it("PATCH returns 404 when publication not found", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce(null);
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Approved" }),
    });
    const res = await patchPublication(req, makeParams("1"));
    expect(res.status).toBe(404);
  });

  it("PATCH returns 400 for invalid status", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce(basePublication);
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "InvalidStatus" }),
    });
    const res = await patchPublication(req, makeParams("1"));
    expect(res.status).toBe(400);
  });

  it("PATCH returns 400 when no valid fields provided", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce(basePublication);
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ unknownField: "value" }),
    });
    const res = await patchPublication(req, makeParams("1"));
    expect(res.status).toBe(400);
  });

  it("PATCH updates publication on valid input", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce(basePublication);
    mockPrisma.publication.update.mockResolvedValueOnce({
      ...basePublication,
      status: "Approved",
    });
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Approved" }),
    });
    const res = await patchPublication(req, makeParams("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("Approved");
  });

  it("PATCH marks reviewedManually when status changes (so re-sync won't clobber it)", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce(basePublication);
    mockPrisma.publication.update.mockResolvedValueOnce({
      ...basePublication,
      status: "Rejected",
      reviewedManually: true,
    });
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Rejected" }),
    });
    const res = await patchPublication(req, makeParams("1"));
    expect(res.status).toBe(200);
    // The update payload must flip reviewedManually so the ORCID sync preserves it.
    const updateArg = mockPrisma.publication.update.mock.calls[0][0];
    expect(updateArg.data.status).toBe("Rejected");
    expect(updateArg.data.reviewedManually).toBe(true);
  });

  it("PATCH does NOT set reviewedManually for non-status edits", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce(basePublication);
    mockPrisma.publication.update.mockResolvedValueOnce({
      ...basePublication,
      title: "Edited title",
    });
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Edited title" }),
    });
    const res = await patchPublication(req, makeParams("1"));
    expect(res.status).toBe(200);
    const updateArg = mockPrisma.publication.update.mock.calls[0][0];
    expect(updateArg.data.reviewedManually).toBeUndefined();
  });

  it("PATCH returns 400 for invalid categoryId type", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce(basePublication);
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categoryId: "not-a-number" }),
    });
    const res = await patchPublication(req, makeParams("1"));
    // categoryId "not-a-number" is a string, not number/null — treated as no valid field → 400
    expect(res.status).toBe(400);
  });

  // DELETE
  it("DELETE returns 400 for invalid id", async () => {
    const res = await deletePublication(
      new Request("http://localhost"),
      makeParams("0"),
    );
    expect(res.status).toBe(400);
  });

  it("DELETE returns 404 when publication not found", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce(null);
    const res = await deletePublication(
      new Request("http://localhost"),
      makeParams("1"),
    );
    expect(res.status).toBe(404);
  });

  it("DELETE returns 204 on success", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce(basePublication);
    mockPrisma.deletedPublication.create.mockResolvedValueOnce({});
    mockPrisma.publication.delete.mockResolvedValueOnce({});
    const res = await deletePublication(
      new Request("http://localhost"),
      makeParams("1"),
    );
    expect(res.status).toBe(204);
  });

  it("DELETE writes a tombstone before deleting (so re-sync can't resurrect it)", async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce({
      ...basePublication,
      id: 5,
      sourceType: "ORCID",
      sourceId: "0000-0001-0000-0001:w1",
      doi: "10.1000/Test", // mixed case — must be normalized in the tombstone
      title: "Resurrectable Work",
      year: 2020,
    });
    mockPrisma.deletedPublication.create.mockResolvedValueOnce({});
    mockPrisma.publication.delete.mockResolvedValueOnce({});

    const res = await deletePublication(
      new Request("http://localhost"),
      makeParams("5"),
    );
    expect(res.status).toBe(204);

    // A tombstone capturing the three identity signals must be written...
    expect(mockPrisma.deletedPublication.create).toHaveBeenCalledTimes(1);
    const tombstoneArg = mockPrisma.deletedPublication.create.mock.calls[0][0];
    expect(tombstoneArg.data).toMatchObject({
      sourceType: "ORCID",
      sourceId: "0000-0001-0000-0001:w1",
      doi: "10.1000/test", // normalized to lowercase
      titleYearKey: "resurrectable work::2020",
      title: "Resurrectable Work",
      year: 2020,
    });
    // ...inside a transaction, alongside the actual delete.
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.publication.delete).toHaveBeenCalledWith({
      where: { id: 5 },
    });
  });
});
