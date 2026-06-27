import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  teamMember: {
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

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

import { GET as getAdminTeam, POST as postAdminTeam } from "@/app/api/admin/team/route";
import {
  PATCH as patchAdminTeam,
  DELETE as deleteAdminTeam,
} from "@/app/api/admin/team/[id]/route";

describe("admin team routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/admin/team returns members", async () => {
    mockPrisma.teamMember.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const response = await getAdminTeam();
    expect(response.status).toBe(200);
  });

  it("POST /api/admin/team validates section", async () => {
    const form = new FormData();
    form.set("name", "Alice");
    form.set("title", "Lead");
    form.set("section", "Invalid");
    form.set("bio", "Bio");
    form.set("photo", new File(["x"], "a.png", { type: "image/png" }));

    const request = new Request("http://localhost/api/admin/team", {
      method: "POST",
      body: form,
    });
    const response = await postAdminTeam(request as never);
    expect(response.status).toBe(400);
  });

  it("PATCH /api/admin/team/[id] returns 404 when missing", async () => {
    mockPrisma.teamMember.findUnique.mockResolvedValueOnce(null);
    const form = new FormData();
    form.set("name", "New Name");
    const request = new Request("http://localhost/api/admin/team/1", {
      method: "PATCH",
      body: form,
    });
    const response = await patchAdminTeam(request as never, {
      params: Promise.resolve({ id: "1" }),
    });
    expect(response.status).toBe(404);
  });

  it("POST /api/admin/team clamps an out-of-range order into the Int range", async () => {
    mockPrisma.teamMember.create.mockResolvedValueOnce({ id: 1 });
    const form = new FormData();
    form.set("name", "Alice");
    form.set("title", "Lead");
    form.set("section", "ResearchTeam");
    form.set("bio", "Bio");
    form.set("order", "9999999999"); // > 2^31-1, would poison Prisma reads

    const request = new Request("http://localhost/api/admin/team", {
      method: "POST",
      body: form,
    });
    const response = await postAdminTeam(request as never);
    expect(response.status).toBe(201);
    expect(mockPrisma.teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 2147483647 }),
      }),
    );
  });

  it("PATCH /api/admin/team/[id] clamps order (huge -> max, negative -> 0)", async () => {
    mockPrisma.teamMember.findUnique.mockResolvedValue({
      id: 1,
      photoPath: "/uploads/team/a.png",
    });
    mockPrisma.teamMember.update.mockResolvedValue({ id: 1 });

    const huge = new Request("http://localhost/api/admin/team/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: 9999999999 }),
    });
    await patchAdminTeam(huge as never, {
      params: Promise.resolve({ id: "1" }),
    });
    expect(mockPrisma.teamMember.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 2147483647 }),
      }),
    );

    const negative = new Request("http://localhost/api/admin/team/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: -5 }),
    });
    await patchAdminTeam(negative as never, {
      params: Promise.resolve({ id: "1" }),
    });
    expect(mockPrisma.teamMember.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 0 }),
      }),
    );
  });

  it("DELETE /api/admin/team/[id] returns 204 on success", async () => {
    mockPrisma.teamMember.findUnique.mockResolvedValueOnce({
      id: 1,
      photoPath: "/uploads/team/a.png",
    });
    mockPrisma.teamMember.delete.mockResolvedValueOnce({});

    const response = await deleteAdminTeam(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(response.status).toBe(204);
  });
});
