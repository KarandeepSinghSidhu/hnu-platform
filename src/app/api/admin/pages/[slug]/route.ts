// Admin API for a single editable Page, keyed by slug.
// GET → the page plus its blocks ordered for display, used by the page editor to
// load existing content. Returns 404 when the slug is unknown, 500 on DB errors.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Fetch a single page with its blocks in display order.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const page = await prisma.page.findUnique({
      where: { slug },
      include: { blocks: { orderBy: { position: "asc" } } },
    });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (error) {
    console.error("Failed to fetch page:", error);
    return NextResponse.json(
      { error: "Failed to fetch page" },
      { status: 500 },
    );
  }
}
