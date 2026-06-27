// Public read-only API for a single study, keyed by slug.
// GET /api/studies/[slug] → 200 with the study's display fields (bilingual EN/ZH
// copy, eligibility, compensation, REDCap link and contact details), 404 when no
// study matches the slug, 500 on unexpected failure. No auth: only presentation
// fields are selected, so internal columns never leak to public clients.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const study = await prisma.study.findFirst({
      where: {
        slug,
      },
      select: {
        title: true,
        isActive: true,
        fullDescriptionEn: true,
        fullDescriptionZh: true,
        eligibilityEn: true,
        eligibilityZh: true,
        compensationEn: true,
        compensationZh: true,
        redcapUrl: true,
        contactEmail: true,
        contactPhone: true,
        contactPhoneZh: true,
        ethicsStatement: true,
      },
    });

    if (!study) {
      return NextResponse.json({ error: "Study not found." }, { status: 404 });
    }

    return NextResponse.json(study, { status: 200 });
  } catch (error) {
    console.error("GET /api/studies/[slug] failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch study details." },
      { status: 500 },
    );
  }
}
