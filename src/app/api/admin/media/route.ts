// Admin media-library API. GET lists every MediaAsset newest-first; POST accepts
// a multipart image upload, writes it to public/<MEDIA_UPLOAD_PREFIX>/ under a
// timestamped sanitised name, records a MediaAsset row, and returns it (201).
// Runs on the Node runtime for fs access. POST rejects non-images / oversized
// files (4xx) and, on any later failure, deletes the just-written file so disk
// and DB don't drift.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getImageDimensions } from "@/lib/image-dimensions";
import {
  MAX_FILE_SIZE,
  MEDIA_UPLOAD_PREFIX,
  sanitizeFileName,
  isAllowedImage,
  tryRemoveFile,
} from "@/lib/media-upload";

export const runtime = "nodejs";

export async function GET() {
  try {
    const assets = await prisma.mediaAsset.findMany({
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(assets);
  } catch (error) {
    console.error("Failed to fetch media:", error);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let savedPath = "";
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const altText = formData.get("altText");
    const caption = formData.get("caption");

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
    const safeFileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
    await writeFile(path.join(uploadDir, safeFileName), buffer);
    savedPath = `/${MEDIA_UPLOAD_PREFIX}/${safeFileName}`;

    const dimensions = getImageDimensions(buffer);

    const asset = await prisma.mediaAsset.create({
      data: {
        filePath: savedPath,
        originalName: file.name,
        altText: typeof altText === "string" ? altText : "",
        caption: typeof caption === "string" ? caption : "",
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    if (savedPath) await tryRemoveFile(savedPath);
    console.error("Failed to upload media:", error);
    return NextResponse.json(
      { error: "Failed to upload media" },
      { status: 500 },
    );
  }
}
