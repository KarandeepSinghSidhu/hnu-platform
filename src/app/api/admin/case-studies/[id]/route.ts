// Admin API route for a single case study by id.
// DELETE removes the CaseStudy row, then best-effort unlinks its backing PDF
// from public/ so deleted studies don't leave orphaned files on disk. The file
// removal is non-fatal: a missing/locked PDF is logged but still reports success
// since the canonical record (the DB row) is already gone.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseStudyId = Number(id);

    // Match the repo-standard id guard. `Number.isNaN` alone lets a non-integer
    // like 1.5 (or 0 / negative) through, and Prisma 7 then rejects the float
    // `Int` arg and throws — surfacing as a 500 instead of a clean 400.
    if (!Number.isInteger(caseStudyId) || caseStudyId <= 0) {
      return NextResponse.json(
        { error: "Invalid case study ID" },
        { status: 400 }
      );
    }

    const caseStudy = await prisma.caseStudy.findUnique({
      where: {
        id: caseStudyId,
      },
    });

    if (!caseStudy) {
      return NextResponse.json(
        { error: "Case study not found" },
        { status: 404 }
      );
    }

    await prisma.caseStudy.delete({
      where: {
        id: caseStudyId,
      },
    });

    const relativePdfPath = caseStudy.pdfPath.replace(/^\/+/, "");
    const diskPath = path.join(process.cwd(), "public", relativePdfPath);

    try {
      await unlink(diskPath);
    } catch (fileError) {
      console.warn("PDF file could not be removed:", fileError);
    }

    return NextResponse.json({
      message: "Case study deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete case study:", error);

    return NextResponse.json(
      { error: "Failed to delete case study" },
      { status: 500 }
    );
  }
}