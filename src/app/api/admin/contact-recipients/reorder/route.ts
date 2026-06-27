import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reorder the active inquiry types in one shot. Body: { order: string[] } — the
// active categories in their new order. Mirrors the page-blocks reorder route
// (src/app/api/admin/pages/[slug]/blocks/reorder/route.ts): one transaction
// reassigns each row's `order` to its index, so the orders stay unique and
// sequential and a half-completed swap can't leave two rows sharing an order.
export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const order: unknown = body?.order;

    const active = await prisma.contactRecipient.findMany({
      where: { isArchived: false },
      select: { category: true },
    });
    const activeCategories = new Set(active.map((r) => r.category));

    if (
      !Array.isArray(order) ||
      order.length !== active.length ||
      !order.every((c) => typeof c === "string" && activeCategories.has(c)) ||
      new Set(order).size !== order.length
    ) {
      return NextResponse.json(
        { error: "order must list every active inquiry type exactly once." },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      order.map((category, index) =>
        prisma.contactRecipient.update({
          where: { category },
          data: { order: index },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/admin/contact-recipients/reorder failed:", error);
    return NextResponse.json(
      { error: "Failed to reorder inquiry types." },
      { status: 500 },
    );
  }
}
