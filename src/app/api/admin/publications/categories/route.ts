// Admin API route for publication categories.
// GET → returns all PublicationCategory rows ordered by `order` (asc) for the
// admin console's category management UI. Read-only; failures are logged and
// surfaced as a 500 with a generic message.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.publicationCategory.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/admin/publications/categories failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories." },
      { status: 500 },
    );
  }
}
