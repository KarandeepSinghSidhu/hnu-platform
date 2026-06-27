// Admin API for reading public contact-form submissions.
// GET → newest-first list of submissions, optionally filtered by ?category;
// powers the admin inbox view. Read-only; submissions are created elsewhere.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category")?.trim();

    const submissions = await prisma.contactSubmission.findMany({
      where: category ? { category } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        prefersPhone: true,
        category: true,
        message: true,
        submittedAt: true,
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Failed to fetch contact submissions:", error);

    return NextResponse.json(
      { error: "Failed to fetch contact submissions" },
      { status: 500 }
    );
  }
}