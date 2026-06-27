import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { getImageDimensions } from "@/lib/image-dimensions";
import { migrateRawPathInBlocks } from "@/lib/media-resolve";
import {
  MAX_FILE_SIZE,
  MEDIA_UPLOAD_PREFIX,
  sanitizeFileName,
  isAllowedImage,
  tryRemoveFile,
} from "@/lib/media-upload";

export const runtime = "nodejs";

// POST: replace an asset's file. We write a NEW managed file and repoint the
// record to it (rather than overwriting in place), then migrate the DB-field
// consumers (team/partner/study) that referenced the old path. The fresh URL is
// essential: Next's <Image> optimizer caches by URL, so an in-place overwrite
// keeps serving the stale image. Page blocks using a "media:{id}" reference update
// automatically; the original /public file is left intact (never clobbered).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const existing = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !file.name || file.size === 0) {
      return NextResponse.json({ error: "A file is required" }, { status: 400 });
    }
    if (!isAllowedImage(file)) {
      return NextResponse.json(
        { error: "Only PNG, JPEG, WebP, GIF or AVIF images are allowed" },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be 10MB or less" },
        { status: 400 },
      );
    }

    const uploadDir = path.join(process.cwd(), "public", MEDIA_UPLOAD_PREFIX);
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    const dimensions = getImageDimensions(buffer);

    const oldPath = existing.filePath;
    // Always write a NEW managed file and repoint the record to it. The new URL is
    // what makes the change actually show — Next's <Image> optimizer caches by URL,
    // so overwriting a file in place keeps serving the stale cached version. It also
    // means the original /public file is never clobbered on disk.
    const newPath = `/${MEDIA_UPLOAD_PREFIX}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const newFsPath = path.join(
      process.cwd(),
      "public",
      newPath.replace(/^\/+/, ""),
    );
    await writeFile(newFsPath, buffer);

    let updated;
    try {
      // Repoint the asset and migrate the DB-field consumers (team photos, partner
      // logos, study images) in one transaction, so a failure can't leave the asset
      // on the new path while a consumer still points at the old one. Page blocks
      // using a "media:{id}" reference resolve to the new filePath automatically.
      const [asset] = await prisma.$transaction([
        prisma.mediaAsset.update({
          where: { id },
          data: {
            filePath: newPath,
            originalName: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            width: dimensions?.width ?? null,
            height: dimensions?.height ?? null,
          },
        }),
        prisma.teamMember.updateMany({
          where: { photoPath: oldPath },
          data: { photoPath: newPath },
        }),
        prisma.partnerLogo.updateMany({
          where: { logoPath: oldPath },
          data: { logoPath: newPath },
        }),
        prisma.study.updateMany({
          where: { imagePath: oldPath },
          data: { imagePath: newPath },
        }),
      ]);
      updated = asset;
    } catch (err) {
      // The asset wasn't repointed — remove the orphaned new file.
      await unlink(newFsPath).catch(() => {});
      throw err;
    }

    // Also migrate any raw oldPath typed directly into a page block (rare — the
    // picker stores "media:{id}"). Done before removing the old file so no
    // reference is left dangling. Paths hardcoded in component source (e.g. the
    // collaborations sections) aren't reachable from here.
    await migrateRawPathInBlocks(oldPath, newPath);

    // Remove the old file only if it was a managed upload; tryRemoveFile leaves
    // cataloged /public originals untouched.
    await tryRemoveFile(oldPath);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to replace media:", error);
    return NextResponse.json(
      { error: "Failed to replace media" },
      { status: 500 },
    );
  }
}
