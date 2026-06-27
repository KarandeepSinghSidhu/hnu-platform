// Public, read-only API for the case-studies list. GET returns every case
// study (newest first) as JSON for the front-end study pages. No auth: this is
// public catalogue data. Stored pdfPath values are normalised to a path
// relative to /uploads so clients can build a stable URL regardless of how the
// upload was recorded.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CaseStudyListItem = {
  id: number;
  title: string;
  description: string;
  pdfPath: string;
  uploadedAt: Date;
};

function toRelativeUploadsPath(pdfPath: string) {
  return pdfPath
    .replace(/^\/?public\/uploads\//, "")
    .replace(/^\/?uploads\//, "")
    .replace(/^\/+/, "");
}

export async function GET() {
  try {
    const caseStudies: CaseStudyListItem[] = await prisma.caseStudy.findMany({
      orderBy: {
        uploadedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        pdfPath: true,
        uploadedAt: true,
      },
    });

    const normalizedCaseStudies = caseStudies.map((caseStudy: CaseStudyListItem) => ({
      ...caseStudy,
      pdfPath: toRelativeUploadsPath(caseStudy.pdfPath),
    }));

    return NextResponse.json(normalizedCaseStudies);
  } catch (error) {
    console.error("GET /api/case-studies failed:", error);

    return NextResponse.json(
      { error: "Failed to fetch case studies" },
      { status: 500 },
    );
  }
}