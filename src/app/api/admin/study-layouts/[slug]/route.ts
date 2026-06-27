// Admin API for managing a single study's page-editor layout (keyed by [slug]).
// POST promotes that study's override into the shared study template (the
// fallback layout for every study without its own override); DELETE drops the
// study's override so it falls back to that template / default rendering.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  STUDY_TEMPLATE_SLUG,
  studyOverrideSlug,
} from "@/components/blocks/study/resolve-study-layout";

export const runtime = "nodejs";

// POST: copy this study's custom layout into the shared template, which then
// applies to every study that has no override of its own.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const source = await prisma.page.findUnique({
      where: { slug: studyOverrideSlug(slug) },
      include: { blocks: { orderBy: { position: "asc" } } },
    });
    if (!source || source.blocks.length === 0) {
      return NextResponse.json(
        { error: "Build a layout for this study before saving it as a template" },
        { status: 400 },
      );
    }

    const template = await prisma.page.upsert({
      where: { slug: STUDY_TEMPLATE_SLUG },
      update: {},
      create: { slug: STUDY_TEMPLATE_SLUG, title: "Study layout template" },
    });

    const blockData = source.blocks.map((block, i) => ({
      pageId: template.id,
      type: block.type,
      content: block.content,
      position: i,
      isVisible: block.isVisible,
    }));

    // Atomic: a mid-write failure must not leave the shared template empty or
    // partial, since it applies to every study without its own override.
    await prisma.$transaction([
      prisma.pageBlock.deleteMany({ where: { pageId: template.id } }),
      prisma.pageBlock.createMany({ data: blockData }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save study template:", error);
    return NextResponse.json(
      { error: "Failed to save template" },
      { status: 500 },
    );
  }
}

// DELETE: reset this study to its default rendering by clearing its override blocks.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const page = await prisma.page.findUnique({
      where: { slug: studyOverrideSlug(slug) },
    });
    if (page) {
      await prisma.pageBlock.deleteMany({ where: { pageId: page.id } });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reset study layout:", error);
    return NextResponse.json(
      { error: "Failed to reset layout" },
      { status: 500 },
    );
  }
}
