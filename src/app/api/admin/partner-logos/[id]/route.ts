// Admin CRUD for a single partner logo by id. GET reads one record; PATCH
// updates fields and (for multipart requests) optionally swaps the logo image;
// DELETE removes the record and its on-disk file. Runs on the Node runtime
// because logo files are written to / removed from public/uploads/partner-logos.
// PATCH accepts either JSON (placeholder/order/group only) or multipart form
// data (full edit incl. file upload); a newly saved upload is rolled back from
// disk if the write fails, and the previous file is deleted only after a
// successful swap so a logo is never lost on a failed update.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampOrder } from "@/lib/order";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const LOGO_UPLOAD_PREFIX = "uploads/partner-logos";
const ALLOWED_GROUPS = new Set(["Collaborating", "Industry"]);

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function parseOrder(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return clampOrder(parsed);
}

function parseGroup(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (ALLOWED_GROUPS.has(trimmed)) return trimmed;
  return null;
}

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)
  );
}

async function saveLogoFile(file: File) {
  const uploadDir = path.join(process.cwd(), "public", LOGO_UPLOAD_PREFIX);
  await mkdir(uploadDir, { recursive: true });
  const safeFileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const diskPath = path.join(uploadDir, safeFileName);
  const bytes = await file.arrayBuffer();
  await writeFile(diskPath, Buffer.from(bytes));
  return `/uploads/partner-logos/${safeFileName}`;
}

async function tryRemoveLogoFile(logoPath: string) {
  if (!logoPath) return;
  const relativePath = logoPath.replace(/^\/+/, "");
  if (!relativePath.startsWith(LOGO_UPLOAD_PREFIX)) return;
  const diskPath = path.join(process.cwd(), "public", relativePath);
  try {
    await unlink(diskPath);
  } catch (error) {
    console.warn("Logo file could not be removed:", error);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Invalid partner logo ID" },
        { status: 400 },
      );
    }
    const partner = await prisma.partnerLogo.findUnique({ where: { id } });
    if (!partner) {
      return NextResponse.json(
        { error: "Partner logo not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(partner);
  } catch (error) {
    console.error("GET /api/admin/partner-logos/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner logo" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let newSavedLogoPath = "";

  try {
    const { id } = await params;
    const partnerLogoId = Number(id);

    if (!Number.isInteger(partnerLogoId) || partnerLogoId <= 0) {
      return NextResponse.json(
        { error: "Invalid partner logo ID" },
        { status: 400 },
      );
    }

    const existing = await prisma.partnerLogo.findUnique({
      where: { id: partnerLogoId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Partner logo not found" },
        { status: 404 },
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let nextName = existing.name;
    let nextWebsite = existing.websiteUrl;
    let nextOrder = existing.order;
    let nextGroup = existing.group;
    let nextIsPlaceholder = existing.isPlaceholder;
    let nextLogoPath = existing.logoPath;

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (body && typeof body === "object") {
        if (typeof body.isPlaceholder === "boolean") {
          nextIsPlaceholder = body.isPlaceholder;
        }
        if (typeof body.order === "number") nextOrder = clampOrder(body.order);
        if (typeof body.group === "string" && ALLOWED_GROUPS.has(body.group)) {
          nextGroup = body.group;
        }
      }
    } else {
      const formData = await request.formData();

      const name = formData.get("name");
      if (typeof name === "string") {
        if (!name.trim()) {
          return NextResponse.json(
            { error: "Name cannot be empty" },
            { status: 400 },
          );
        }
        nextName = name.trim();
      }

      const websiteUrl = formData.get("websiteUrl");
      if (typeof websiteUrl === "string") {
        const trimmed = websiteUrl.trim();
        if (trimmed) {
          try {
            new URL(trimmed);
          } catch {
            return NextResponse.json(
              { error: "Website URL must be a valid absolute URL" },
              { status: 400 },
            );
          }
        }
        nextWebsite = trimmed;
      }

      const parsedOrder = parseOrder(formData.get("order"));
      if (parsedOrder === null) {
        return NextResponse.json(
          { error: "Order must be a non-negative integer" },
          { status: 400 },
        );
      }
      if (parsedOrder !== undefined) nextOrder = parsedOrder;

      const group = parseGroup(formData.get("group"));
      if (group === null) {
        return NextResponse.json(
          { error: "Group must be 'Collaborating' or 'Industry'" },
          { status: 400 },
        );
      }
      if (group !== undefined) nextGroup = group;

      const explicitPlaceholder = parseBoolean(formData.get("isPlaceholder"));
      const file = formData.get("file") ?? formData.get("logo");
      const hasNewFile =
        file instanceof File && Boolean(file.name) && file.size > 0;

      if (hasNewFile) {
        if (!isImageFile(file)) {
          return NextResponse.json(
            { error: "Only image files are allowed" },
            { status: 400 },
          );
        }
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: "Logo image must be 5MB or less" },
            { status: 400 },
          );
        }
        newSavedLogoPath = await saveLogoFile(file);
        nextLogoPath = newSavedLogoPath;
        nextIsPlaceholder = false;
      } else if (explicitPlaceholder === true) {
        nextLogoPath = "";
        nextIsPlaceholder = true;
      } else if (explicitPlaceholder === false) {
        nextIsPlaceholder = false;
      }
    }

    const updated = await prisma.partnerLogo.update({
      where: { id: partnerLogoId },
      data: {
        name: nextName,
        websiteUrl: nextWebsite,
        order: nextOrder,
        group: nextGroup,
        isPlaceholder: nextIsPlaceholder,
        logoPath: nextLogoPath,
      },
    });

    if (existing.logoPath && existing.logoPath !== updated.logoPath) {
      await tryRemoveLogoFile(existing.logoPath);
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (newSavedLogoPath) {
      await tryRemoveLogoFile(newSavedLogoPath);
    }
    console.error("Failed to update partner logo:", error);
    return NextResponse.json(
      { error: "Failed to update partner logo" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const partnerLogoId = Number(id);
    if (!Number.isInteger(partnerLogoId) || partnerLogoId <= 0) {
      return NextResponse.json(
        { error: "Invalid partner logo ID" },
        { status: 400 },
      );
    }
    const existing = await prisma.partnerLogo.findUnique({
      where: { id: partnerLogoId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Partner logo not found" },
        { status: 404 },
      );
    }
    await prisma.partnerLogo.delete({ where: { id: partnerLogoId } });
    await tryRemoveLogoFile(existing.logoPath);
    return NextResponse.json({ message: "Partner logo deleted successfully" });
  } catch (error) {
    console.error("Failed to delete partner logo:", error);
    return NextResponse.json(
      { error: "Failed to delete partner logo" },
      { status: 500 },
    );
  }
}
