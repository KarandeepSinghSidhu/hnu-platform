import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  caseStudy: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("fs/promises", () => ({
  unlink: vi.fn().mockResolvedValue(undefined),
}));

import { DELETE as deleteCaseStudy } from "@/app/api/admin/case-studies/[id]/route";

function del(id: string) {
  return deleteCaseStudy(
    new Request("http://localhost/api/admin/case-studies/x", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id }) },
  );
}

// Regression for B29 / bug-hunt M3: the guard used `Number.isNaN` only, so a
// non-integer like 1.5 (or 0 / negative) slipped through and Prisma 7's float
// `Int` rejection surfaced as a 500 instead of a clean 400.
describe("DELETE /api/admin/case-studies/[id] — id guard (B29/M3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["1.5", "abc", "0", "-1"])(
    "returns 400 (not 500) for invalid id %s without touching the DB",
    async (id) => {
      const res = await del(id);
      expect(res.status).toBe(400);
      expect(mockPrisma.caseStudy.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.caseStudy.delete).not.toHaveBeenCalled();
    },
  );

  it("returns 404 when a valid id has no matching row (delete not attempted)", async () => {
    mockPrisma.caseStudy.findUnique.mockResolvedValueOnce(null);
    const res = await del("5");
    expect(res.status).toBe(404);
    expect(mockPrisma.caseStudy.delete).not.toHaveBeenCalled();
  });

  it("deletes an existing case study (200)", async () => {
    mockPrisma.caseStudy.findUnique.mockResolvedValueOnce({
      id: 5,
      pdfPath: "/uploads/case-studies/5.pdf",
    });
    mockPrisma.caseStudy.delete.mockResolvedValueOnce({ id: 5 });

    const res = await del("5");

    expect(res.status).toBe(200);
    expect(mockPrisma.caseStudy.delete).toHaveBeenCalledWith({
      where: { id: 5 },
    });
  });
});
