// Admin API route reporting where a single MediaAsset is referenced across page
// blocks. Backs the admin media library's "where used" panel and the safety
// guard that blocks deleting an asset that is still in use.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findAssetUsage } from "@/lib/media-resolve";

export const runtime = "nodejs";

// GET: where is this asset used? Lists the page blocks that reference it (by id
// or by raw path). Powers the "where used" view and the delete guard.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    const usage = await findAssetUsage(asset);
    return NextResponse.json({ usage });
  } catch (error) {
    console.error("Failed to compute media usage:", error);
    return NextResponse.json(
      { error: "Failed to compute usage" },
      { status: 500 },
    );
  }
}
