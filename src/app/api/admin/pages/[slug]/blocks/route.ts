// Admin API route for the page editor: POST appends (or inserts) a block onto
// a page identified by its slug. Block type/content are validated server-side
// before persistence, and sibling positions are shifted to keep the ordering
// contiguous. Runs on the Node runtime because it touches Prisma directly.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateBlockForWrite } from "@/lib/blocks/validate";

export const runtime = "nodejs";

// Create a new block on a page, inserted at an optional position (default: end).
// Existing blocks at or after the insert position are shifted down by one.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const validation = validateBlockForWrite(body.type, body.content ?? {});
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const blockCount = await prisma.pageBlock.count({
      where: { pageId: page.id },
    });
    const insertAt =
      typeof body.position === "number" &&
      body.position >= 0 &&
      body.position <= blockCount
        ? body.position
        : blockCount;

    await prisma.pageBlock.updateMany({
      where: { pageId: page.id, position: { gte: insertAt } },
      data: { position: { increment: 1 } },
    });

    const block = await prisma.pageBlock.create({
      data: {
        pageId: page.id,
        type: validation.type,
        content: validation.content,
        position: insertAt,
        isVisible: true,
      },
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error("Failed to create block:", error);
    return NextResponse.json(
      { error: "Failed to create block" },
      { status: 500 },
    );
  }
}
