import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  study: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const mockRm = vi.hoisted(() => vi.fn());
vi.mock("fs/promises", () => ({ rm: mockRm }));

import {
  GET as getAdminStudies,
  POST as postAdminStudy,
} from "@/app/api/admin/studies/route";
import {
  PATCH as patchAdminStudy,
  DELETE as deleteAdminStudy,
} from "@/app/api/admin/studies/[id]/route";

describe("admin studies routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/admin/studies returns all studies", async () => {
    mockPrisma.study.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const response = await getAdminStudies();
    expect(response.status).toBe(200);
  });

  it("POST /api/admin/studies validates required fields", async () => {
    const req = new Request("http://localhost/api/admin/studies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Only title" }),
    });
    const response = await postAdminStudy(req);
    expect(response.status).toBe(400);
  });

  it("PATCH /api/admin/studies/[id] returns 404 for missing study", async () => {
    mockPrisma.study.findUnique.mockResolvedValueOnce(null);
    const req = new Request("http://localhost/api/admin/studies/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "new" }),
    });
    const response = await patchAdminStudy(req, {
      params: Promise.resolve({ id: "1" }),
    });
    expect(response.status).toBe(404);
  });

  it("DELETE /api/admin/studies/[id] returns 204 on success", async () => {
    mockPrisma.study.findUnique.mockResolvedValueOnce({ id: 1 });
    mockPrisma.study.delete.mockResolvedValueOnce({});
    const response = await deleteAdminStudy(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(response.status).toBe(204);
  });

  it("DELETE also removes the study's uploaded files from disk", async () => {
    mockPrisma.study.findUnique.mockResolvedValueOnce({ id: 42 });
    mockPrisma.study.delete.mockResolvedValueOnce({});
    await deleteAdminStudy(new Request("http://localhost"), {
      params: Promise.resolve({ id: "42" }),
    });
    expect(mockRm).toHaveBeenCalledTimes(1);
    const [target, opts] = mockRm.mock.calls[0];
    expect(String(target).replace(/\\/g, "/")).toContain(
      "public/uploads/studies/42",
    );
    expect(opts).toMatchObject({ recursive: true, force: true });
  });
});
