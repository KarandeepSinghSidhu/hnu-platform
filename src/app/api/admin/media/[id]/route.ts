// Admin API for a single media asset by id: PATCH edits its alt text / caption,
// DELETE removes the record and its underlying file. DELETE refuses (409, with a
// usage list) when the asset is still referenced unless ?force=1 is passed.
// Runs on the Node runtime because deletion touches the filesystem.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findAssetUsage } from "@/lib/media-resolve";
import { tryRemoveFile } from "@/lib/media-upload";

export const runtime = "nodejs";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Update an asset's alt text / caption.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const data: { altText?: string; caption?: string } = {};
    if (typeof body.altText === "string") data.altText = body.altText;
    if (typeof body.caption === "string") data.caption = body.caption;

    const existing = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json(existing);
    }

    const updated = await prisma.mediaAsset.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update media:", error);
    return NextResponse.json(
      { error: "Failed to update media" },
      { status: 500 },
    );
  }
}

// Delete an asset record and its underlying file.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const existing = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Block deletion of an asset that's still referenced (unless ?force=1),
    // returning where it's used so the admin can fix those pages first.
    const force = new URL(request.url).searchParams.get("force") === "1";
    if (!force) {
      const usage = await findAssetUsage(existing);
      if (usage.length > 0) {
        return NextResponse.json(
          {
            error: "This image is still in use. Remove or replace it on those pages first, or delete with force.",
            usage,
          },
          { status: 409 },
        );
      }
    }

    await prisma.mediaAsset.delete({ where: { id } });
    await tryRemoveFile(existing.filePath);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete media:", error);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 },
    );
  }
}
