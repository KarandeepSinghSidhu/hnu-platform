// Public, read-only API for the publications listing. GET returns Approved +
// visible publications (newest year first), each with its category and ordered
// authors. No auth: this is the data the public site renders. ?take= bounds the
// row count so the endpoint can never page the whole table into memory.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampPositiveInt } from "@/lib/clamp";

// Hard cap so the endpoint can never stream the whole publications table into
// memory on the 512MB box; ?take= may request fewer.
const MAX_TAKE = 1000;

export async function GET(request: Request) {
  try {
    // ?take= clamps into [1, MAX_TAKE]; missing/non-numeric falls back to the cap.
    const take = clampPositiveInt(
      new URL(request.url).searchParams.get("take"),
      { fallback: MAX_TAKE, max: MAX_TAKE },
    );

    const publications = await prisma.publication.findMany({
      where: {
        status: "Approved",
        isVisible: true,
        hiddenManually: false,
      },
      orderBy: [
        { year: "desc" },
        { updatedAt: "desc" },
      ],
      take,
      include: {
        category: true,
        authors: {
          orderBy: {
            order: "asc",
          },
          include: {
            teamMember: {
              select: {
                id: true,
                name: true,
                title: true,
                section: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(publications, { status: 200 });
  } catch (error) {
    console.error("GET /api/publications failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch publications." },
      { status: 500 },
    );
  }
}