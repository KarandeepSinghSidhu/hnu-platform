import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  study: { findUnique: vi.fn() },
  studyPdf: { findUnique: vi.fn(), create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { GET as downloadPdf } from "@/app/api/studies/pdf/[pdfId]/route";
import { POST as uploadPdf } from "@/app/api/admin/studies/[id]/pdfs/route";

const pdfBytes = Buffer.from("%PDF-1.4 fake pdf body");

describe("GET /api/studies/pdf/[pdfId] (public download)", () => {
  beforeEach(() => vi.clearAllMocks());

  const get = (pdfId: string) =>
    downloadPdf(new Request("http://localhost"), {
      params: Promise.resolve({ pdfId }),
    });

  it("400 for a non-numeric id", async () => {
    const res = await get("abc");
    expect(res.status).toBe(400);
    expect(mockPrisma.studyPdf.findUnique).not.toHaveBeenCalled();
  });

  it("404 when the PDF row does not exist", async () => {
    mockPrisma.studyPdf.findUnique.mockResolvedValueOnce(null);
    const res = await get("5");
    expect(res.status).toBe(404);
  });

  it("404 for a legacy row whose bytes were lost (data null)", async () => {
    mockPrisma.studyPdf.findUnique.mockResolvedValueOnce({
      data: null,
      mimeType: "application/pdf",
      title: "Old",
    });
    const res = await get("5");
    expect(res.status).toBe(404);
  });

  it("streams the bytes with PDF headers when present", async () => {
    mockPrisma.studyPdf.findUnique.mockResolvedValueOnce({
      data: pdfBytes,
      mimeType: "application/pdf",
      title: "Participant Info Sheet",
    });
    const res = await get("5");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe(
      'inline; filename="Participant Info Sheet.pdf"',
    );
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(pdfBytes)).toBe(true);
    // The blob is normally omitted, so the route must select it explicitly.
    expect(mockPrisma.studyPdf.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.objectContaining({ data: true }) }),
    );
  });
});

describe("POST /api/admin/studies/[id]/pdfs (upload stores bytes in the DB)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists the file bytes and mime type, not a disk path", async () => {
    mockPrisma.study.findUnique.mockResolvedValueOnce({ id: 1 });
    mockPrisma.studyPdf.create.mockResolvedValueOnce({ id: 10, title: "Doc" });

    const form = new FormData();
    form.set("title", "Doc");
    form.set("file", new File([pdfBytes], "doc.pdf", { type: "application/pdf" }));
    // Build a real NextRequest (the handler's declared param type) instead of
    // casting to `never` — keeps the test honest about the route's contract.
    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: form,
    });

    const res = await uploadPdf(req, {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(201);
    expect(mockPrisma.studyPdf.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studyId: 1,
        title: "Doc",
        mimeType: "application/pdf",
        data: expect.any(Buffer),
      }),
    });
  });
});
