// Admin API route: POST duplicates one page block in place. Used by the page
// editor's "duplicate" action so editors can clone an existing block (type,
// content, visibility) without re-authoring it. The insert + position shift run
// in a transaction to keep block ordering contiguous.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Duplicate a block: inserts a copy immediately after the original, shifting the
// blocks below it down by one. The copy keeps the original's type, content and
// visibility. Scoped to the page in the URL so a block can't be copied via the
// wrong page.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid block id" }, { status: 400 });
    }

    const existing = await prisma.pageBlock.findFirst({
      where: { id, page: { slug } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    const insertAt = existing.position + 1;
    const created = await prisma.$transaction(async (tx) => {
      await tx.pageBlock.updateMany({
        where: { pageId: existing.pageId, position: { gte: insertAt } },
        data: { position: { increment: 1 } },
      });
      return tx.pageBlock.create({
        data: {
          pageId: existing.pageId,
          type: existing.type,
          content: existing.content,
          position: insertAt,
          isVisible: existing.isVisible,
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to duplicate block:", error);
    return NextResponse.json(
      { error: "Failed to duplicate block" },
      { status: 500 },
    );
  }
}
