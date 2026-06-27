// Admin API for a single page block: PATCH updates its content/visibility,
// DELETE removes it and reflows the remaining blocks' positions. Every block is
// looked up scoped to the page slug in the URL so a block can't be touched via
// the wrong page. PATCH runs content through validateBlockForWrite (type-aware
// normalisation) before persisting; a no-op PATCH returns the existing row.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateBlockForWrite } from "@/lib/blocks/validate";

export const runtime = "nodejs";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Update a block's content and/or visibility.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid block id" }, { status: 400 });
    }

    // Scope to the page in the URL so a block can't be edited via the wrong page.
    const existing = await prisma.pageBlock.findFirst({
      where: { id, page: { slug } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const data: { content?: string; isVisible?: boolean } = {};

    if (body.content !== undefined) {
      const validation = validateBlockForWrite(existing.type, body.content);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      data.content = validation.content;
    }

    if (typeof body.isVisible === "boolean") {
      data.isVisible = body.isVisible;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(existing);
    }

    const updated = await prisma.pageBlock.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update block:", error);
    return NextResponse.json(
      { error: "Failed to update block" },
      { status: 500 },
    );
  }
}

// Delete a block and close the gap in the remaining blocks' positions.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid block id" }, { status: 400 });
    }

    // Scope to the page in the URL so a block can't be deleted via the wrong page.
    const existing = await prisma.pageBlock.findFirst({
      where: { id, page: { slug } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    await prisma.pageBlock.delete({ where: { id } });
    await prisma.pageBlock.updateMany({
      where: { pageId: existing.pageId, position: { gt: existing.position } },
      data: { position: { decrement: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete block:", error);
    return NextResponse.json(
      { error: "Failed to delete block" },
      { status: 500 },
    );
  }
}
