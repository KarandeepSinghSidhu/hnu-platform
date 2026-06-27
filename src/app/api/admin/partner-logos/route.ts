// Admin API for the partner-logo collection backing the public "Our Partners"
// section. GET lists every logo grouped/ordered for the admin console; POST
// creates one from a multipart form, optionally persisting an uploaded image to
// public/uploads/partner-logos and recording its served path.
// Node runtime: needs fs access to write/clean up logo files on disk.
// On any create failure the just-saved file is removed so disk never drifts
// from the DB, and the auto-increment order fallback is clamped to dodge the
// Prisma Int-overflow read crash (see src/lib/order.ts).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampOrder } from "@/lib/order";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
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
  if (typeof value !== "string") return null;
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

export async function GET() {
  try {
    const partnerLogos = await prisma.partnerLogo.findMany({
      orderBy: [{ group: "asc" }, { order: "asc" }, { id: "asc" }],
    });
    return NextResponse.json(partnerLogos);
  } catch (error) {
    console.error("Failed to fetch partner logos:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner logos" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let savedLogoPath = "";

  try {
    const formData = await request.formData();

    const name = formData.get("name");
    const websiteUrlRaw = formData.get("websiteUrl");
    const isPlaceholderRaw = formData.get("isPlaceholder");
    const orderRaw = formData.get("order");
    const groupRaw = formData.get("group");
    const file = formData.get("file") ?? formData.get("logo");

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    let websiteUrl = "";
    if (typeof websiteUrlRaw === "string" && websiteUrlRaw.trim()) {
      websiteUrl = websiteUrlRaw.trim();
      try {
        new URL(websiteUrl);
      } catch {
        return NextResponse.json(
          { error: "Website URL must be a valid absolute URL" },
          { status: 400 },
        );
      }
    }

    const parsedOrder = parseOrder(orderRaw);
    if (parsedOrder === null) {
      return NextResponse.json(
        { error: "Order must be a non-negative integer" },
        { status: 400 },
      );
    }

    const group = parseGroup(groupRaw) || "Collaborating";

    const hasFile =
      file instanceof File && Boolean(file.name) && file.size > 0;

    if (hasFile) {
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
      savedLogoPath = await saveLogoFile(file);
    }

    const explicitPlaceholder = parseBoolean(isPlaceholderRaw);

    const maxOrderResult = await prisma.partnerLogo.aggregate({
      _max: { order: true },
    });
    // Clamp the auto-increment fallback too: an unclamped MAX_ORDER+1 writes to
    // SQLite fine but throws when Prisma reads the row back, crashing the admin
    // list. (Explicit client orders are already clamped via parseOrder.)
    const nextOrder = clampOrder(
      parsedOrder ?? (maxOrderResult._max.order ?? -1) + 1,
    );

    const isPlaceholder = hasFile ? false : (explicitPlaceholder ?? true);

    const partnerLogo = await prisma.partnerLogo.create({
      data: {
        name: name.trim(),
        websiteUrl,
        logoPath: hasFile ? savedLogoPath : "",
        isPlaceholder,
        group,
        order: nextOrder,
      },
    });

    return NextResponse.json(partnerLogo, { status: 201 });
  } catch (error) {
    if (savedLogoPath) {
      await tryRemoveLogoFile(savedLogoPath);
    }
    console.error("Failed to create partner logo:", error);
    return NextResponse.json(
      { error: "Failed to create partner logo" },
      { status: 500 },
    );
  }
}
