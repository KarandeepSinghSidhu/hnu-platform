// Admin API route for persisting the page-editor's drag-to-reorder of blocks.
// PATCH /api/admin/pages/[slug]/blocks/reorder rewrites each block's `position`
// to match the supplied id order, atomically in one transaction. Validates that
// the order lists exactly — and only — the page's own block ids before writing,
// so a stale or tampered client can't reorder partially or touch other pages.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Reorder a page's blocks. Body: { order: number[] } — block ids in the new order.
// The array must contain exactly the page's current block ids.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const page = await prisma.page.findUnique({
      where: { slug },
      include: { blocks: { select: { id: true } } },
    });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const order: unknown = body?.order;
    if (
      !Array.isArray(order) ||
      order.length !== page.blocks.length ||
      !order.every((id) => typeof id === "number")
    ) {
      return NextResponse.json(
        { error: "order must list every block id for this page" },
        { status: 400 },
      );
    }

    const pageBlockIds = new Set(page.blocks.map((b) => b.id));
    if (!order.every((id) => pageBlockIds.has(id))) {
      return NextResponse.json(
        { error: "order contains ids that don't belong to this page" },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      order.map((id, index) =>
        prisma.pageBlock.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reorder blocks:", error);
    return NextResponse.json(
      { error: "Failed to reorder blocks" },
      { status: 500 },
    );
  }
}
