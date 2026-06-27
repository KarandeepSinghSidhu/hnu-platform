import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  siteSettings: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  // The route reads the previous path and writes the new one in one
  // $transaction([...]); the mocked calls already return resolved values, so
  // Promise.all reproduces the array-form result tuple.
  $transaction: vi.fn((ops: unknown[]) =>
    Promise.all(ops as Promise<unknown>[]),
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const mockFs = vi.hoisted(() => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

// The route imports mkdir/writeFile from "node:fs/promises"; media-upload's
// tryRemoveFile imports unlink from "fs/promises". Vitest treats both specifiers
// as the same module, so this single mock covers all three on one spy set.
vi.mock("node:fs/promises", () => mockFs);

// unstable_cache becomes a pass-through so getSiteSettings hits the (mocked)
// DB directly; revalidateTag is observable.
const mockRevalidateTag = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: mockRevalidateTag,
}));

import { GET, POST } from "@/app/api/admin/site-settings/route";
import { getSiteSettings } from "@/lib/site-settings";
import {
  DEFAULT_FAVICON,
  DEFAULT_LOGO_LIGHT,
  DEFAULT_LOGO_DARK,
  DEFAULT_DONATE_URL,
} from "@/lib/branding";

function postRequest(fields: Record<string, string | File>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request("http://localhost/api/admin/site-settings", {
    method: "POST",
    body: form,
  });
}

describe("site settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getSiteSettings falls back to the built-in defaults when no row exists", async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValueOnce(null);
    await expect(getSiteSettings()).resolves.toEqual({
      faviconPath: DEFAULT_FAVICON,
      logoLightPath: DEFAULT_LOGO_LIGHT,
      logoDarkPath: DEFAULT_LOGO_DARK,
      donateUrl: DEFAULT_DONATE_URL,
    });
  });

  it("GET returns the raw stored values (empty = default) for the admin UI", async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValueOnce({
      id: 1,
      faviconPath: "/uploads/branding/123-icon.png",
      logoLightPath: "",
      logoDarkPath: "",
    });
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      faviconPath: "/uploads/branding/123-icon.png",
      logoLightPath: "",
      logoDarkPath: "",
      donateUrl: "",
    });
  });

  it("POST rejects an unknown target", async () => {
    const response = await POST(
      postRequest({ target: "background", reset: "true" }) as never,
    );
    expect(response.status).toBe(400);
  });

  it("POST rejects an SVG favicon (no-SVG upload stance)", async () => {
    const response = await POST(
      postRequest({
        target: "favicon",
        file: new File(["<svg/>"], "icon.svg", { type: "image/svg+xml" }),
      }) as never,
    );
    expect(response.status).toBe(400);
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it("POST rejects a JPEG logo (PNG/WebP only)", async () => {
    const response = await POST(
      postRequest({
        target: "logoLight",
        file: new File(["x"], "logo.jpg", { type: "image/jpeg" }),
      }) as never,
    );
    expect(response.status).toBe(400);
  });

  it("POST stores an uploaded PNG favicon and revalidates the cache tag", async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValueOnce(null);
    mockPrisma.siteSettings.upsert.mockImplementationOnce(
      async ({ create }: { create: Record<string, string> }) => ({
        id: 1,
        faviconPath: create.faviconPath ?? "",
        logoLightPath: "",
        logoDarkPath: "",
      }),
    );

    const response = await POST(
      postRequest({
        target: "favicon",
        file: new File(["png-bytes"], "icon.png", { type: "image/png" }),
      }) as never,
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as { faviconPath: string };
    expect(body.faviconPath).toMatch(/^\/uploads\/branding\/\d+-icon\.png$/);
    expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    expect(mockRevalidateTag).toHaveBeenCalledWith("site-settings", { expire: 0 });
    // The favicon column was the one written.
    expect(mockPrisma.siteSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { faviconPath: body.faviconPath },
      }),
    );
  });

  it("POST accepts a .ico favicon by extension (MIME is browser-inconsistent)", async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValueOnce(null);
    mockPrisma.siteSettings.upsert.mockResolvedValueOnce({
      id: 1,
      faviconPath: "/uploads/branding/1-favicon.ico",
      logoLightPath: "",
      logoDarkPath: "",
    });
    const response = await POST(
      postRequest({
        target: "favicon",
        file: new File(["ico"], "favicon.ico", { type: "application/octet-stream" }),
      }) as never,
    );
    expect(response.status).toBe(200);
  });

  it("POST reset clears the override and removes the old uploaded file", async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValueOnce({
      id: 1,
      faviconPath: "",
      logoLightPath: "/uploads/branding/111-logo.png",
      logoDarkPath: "",
    });
    mockPrisma.siteSettings.upsert.mockResolvedValueOnce({
      id: 1,
      faviconPath: "",
      logoLightPath: "",
      logoDarkPath: "",
    });

    const response = await POST(
      postRequest({ target: "logoLight", reset: "true" }) as never,
    );
    expect(response.status).toBe(200);
    expect(mockPrisma.siteSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { logoLightPath: "" } }),
    );
    // The previously-uploaded file is cleaned up...
    expect(mockFs.unlink).toHaveBeenCalledTimes(1);
    expect(String(mockFs.unlink.mock.calls[0][0])).toContain("111-logo.png");
    expect(mockRevalidateTag).toHaveBeenCalledWith("site-settings", { expire: 0 });
  });

  it("POST reset never deletes a committed default asset", async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValueOnce({
      id: 1,
      faviconPath: "/images/logos/hnu-logo.svg",
      logoLightPath: "",
      logoDarkPath: "",
    });
    mockPrisma.siteSettings.upsert.mockResolvedValueOnce({
      id: 1,
      faviconPath: "",
      logoLightPath: "",
      logoDarkPath: "",
    });

    const response = await POST(
      postRequest({ target: "favicon", reset: "true" }) as never,
    );
    expect(response.status).toBe(200);
    // Old value pointed outside /uploads/branding → must not be unlinked.
    expect(mockFs.unlink).not.toHaveBeenCalled();
  });

  it("stores an extension-less PNG with a derived .png extension", async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValueOnce(null);
    mockPrisma.siteSettings.upsert.mockImplementationOnce(
      async ({ create }: { create: Record<string, string> }) => ({
        id: 1,
        faviconPath: "",
        logoLightPath: create.logoLightPath ?? "",
        logoDarkPath: "",
      }),
    );

    // A genuine PNG whose filename has no extension: validated by MIME, and the
    // stored file must still end in .png so it is served as an image, not octet-stream.
    const response = await POST(
      postRequest({
        target: "logoLight",
        file: new File(["png-bytes"], "logo", { type: "image/png" }),
      }) as never,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { logoLightPath: string };
    expect(body.logoLightPath).toMatch(/^\/uploads\/branding\/\d+-logo\.png$/);
    expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
  });

  it("rejects an upload with neither a recognised type nor a valid extension", async () => {
    const response = await POST(
      postRequest({
        target: "logoLight",
        file: new File(["x"], "logo", { type: "application/octet-stream" }),
      }) as never,
    );
    expect(response.status).toBe(400);
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it("removes the just-saved file if the DB write fails (no orphan)", async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValueOnce(null);
    mockPrisma.siteSettings.upsert.mockRejectedValueOnce(new Error("db down"));

    const response = await POST(
      postRequest({
        target: "logoLight",
        file: new File(["png-bytes"], "logo.png", { type: "image/png" }),
      }) as never,
    );
    expect(response.status).toBe(500);
    expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    // The orphaned upload is cleaned up.
    expect(mockFs.unlink).toHaveBeenCalledTimes(1);
    expect(String(mockFs.unlink.mock.calls[0][0])).toMatch(/\d+-logo\.png$/);
  });

  it("POST saves a valid donation link (https) and revalidates", async () => {
    mockPrisma.siteSettings.upsert.mockResolvedValueOnce({
      id: 1,
      faviconPath: "",
      logoLightPath: "",
      logoDarkPath: "",
      donateUrl: "https://example.org/give",
    });
    const response = await POST(
      postRequest({
        target: "donateUrl",
        value: "https://example.org/give",
      }) as never,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { donateUrl: string };
    expect(body.donateUrl).toBe("https://example.org/give");
    expect(mockPrisma.siteSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { donateUrl: "https://example.org/give" },
      }),
    );
    expect(mockRevalidateTag).toHaveBeenCalledWith("site-settings", {
      expire: 0,
    });
  });

  it("POST treats saving the built-in default link as a reset (stores empty)", async () => {
    mockPrisma.siteSettings.upsert.mockResolvedValueOnce({
      id: 1,
      faviconPath: "",
      logoLightPath: "",
      logoDarkPath: "",
      donateUrl: "",
    });
    const response = await POST(
      postRequest({ target: "donateUrl", value: DEFAULT_DONATE_URL }) as never,
    );
    expect(response.status).toBe(200);
    expect(mockPrisma.siteSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { donateUrl: "" } }),
    );
  });

  it("POST rejects a donation link with a non-http(s) scheme (no javascript: in an href)", async () => {
    const response = await POST(
      postRequest({ target: "donateUrl", value: "javascript:alert(1)" }) as never,
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.siteSettings.upsert).not.toHaveBeenCalled();
  });

  it("POST rejects a donation link that is not a valid URL", async () => {
    const response = await POST(
      postRequest({ target: "donateUrl", value: "not a url" }) as never,
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.siteSettings.upsert).not.toHaveBeenCalled();
  });

  it("POST reset clears the donation link back to the built-in default", async () => {
    mockPrisma.siteSettings.upsert.mockResolvedValueOnce({
      id: 1,
      faviconPath: "",
      logoLightPath: "",
      logoDarkPath: "",
      donateUrl: "",
    });
    const response = await POST(
      postRequest({ target: "donateUrl", reset: "true" }) as never,
    );
    expect(response.status).toBe(200);
    expect(mockPrisma.siteSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { donateUrl: "" } }),
    );
  });

  it("getSiteSettings returns a stored donation link verbatim", async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValueOnce({
      id: 1,
      faviconPath: "",
      logoLightPath: "",
      logoDarkPath: "",
      donateUrl: "https://give.example.org",
    });
    await expect(getSiteSettings()).resolves.toMatchObject({
      donateUrl: "https://give.example.org",
    });
  });
});
