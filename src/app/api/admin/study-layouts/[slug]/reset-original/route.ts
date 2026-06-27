// Admin recovery route for study layouts: restores a study's page (or the shared
// template) to the original code-defined default blocks. The default lives in
// source control, so this is the guaranteed escape hatch when an edited layout
// has been broken from the admin panel.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { studyOverrideSlug } from "@/components/blocks/study/resolve-study-layout";
import { DEFAULT_STUDY_LAYOUT_BLOCKS } from "@/components/blocks/study/study-default-layout";

export const runtime = "nodejs";

// POST: write the original (code-defined) default layout into this slug's page —
// a study's override, or the shared template when slug is "__default__". This is
// the always-available recovery path: the original design is in source control,
// so it can never become unrecoverable from the admin panel.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const pageSlug = studyOverrideSlug(slug); // "__default__" → the template slug
    const isTemplate = slug === "__default__";

    const page = await prisma.page.upsert({
      where: { slug: pageSlug },
      update: {},
      create: {
        slug: pageSlug,
        title: isTemplate ? "Study layout template" : `Study layout: ${slug}`,
      },
    });

    const blockData = DEFAULT_STUDY_LAYOUT_BLOCKS.map((block, i) => ({
      pageId: page.id,
      type: block.type,
      content: JSON.stringify(block.content),
      position: i,
      isVisible: true,
    }));

    // Atomic: never leave the layout empty or partial mid-write.
    await prisma.$transaction([
      prisma.pageBlock.deleteMany({ where: { pageId: page.id } }),
      prisma.pageBlock.createMany({ data: blockData }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reset to original default:", error);
    return NextResponse.json(
      { error: "Failed to reset to original default" },
      { status: 500 },
    );
  }
}
