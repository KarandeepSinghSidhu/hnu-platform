import { prisma } from "@/lib/prisma";
import StudyTemplateEditor, {
  type StudyTemplateStatus,
} from "@/components/admin/page-editor/StudyTemplateEditor";
import {
  STUDY_TEMPLATE_SLUG,
  studyOverrideSlug,
} from "@/components/blocks/study/resolve-study-layout";

export const dynamic = "force-dynamic";

export default async function StudyTemplatePage() {
  // The template page is created lazily; an empty one means studies fall back to
  // the built-in default.
  const template = await prisma.page.upsert({
    where: { slug: STUDY_TEMPLATE_SLUG },
    update: {},
    create: { slug: STUDY_TEMPLATE_SLUG, title: "Study layout template" },
    include: { blocks: { orderBy: { position: "asc" } } },
  });
  // Match the render path, which only uses visible blocks: a template/override
  // with only hidden blocks falls back to the built-in default.
  const templateHasBlocks = template.blocks.some((b) => b.isVisible);

  const studies = await prisma.study.findMany({
    orderBy: { order: "asc" },
    select: { id: true, title: true, slug: true },
  });

  const overridePages = await prisma.page.findMany({
    where: { slug: { in: studies.map((s) => studyOverrideSlug(s.slug)) } },
    select: {
      slug: true,
      blocks: { where: { isVisible: true }, select: { id: true } },
    },
  });
  const overrideCounts = new Map(
    overridePages.map((p) => [p.slug, p.blocks.length]),
  );

  const studyStatus = studies.map((s) => {
    const count = overrideCounts.get(studyOverrideSlug(s.slug)) ?? 0;
    const state: StudyTemplateStatus["state"] =
      count > 0
        ? "Custom override"
        : templateHasBlocks
          ? "On template"
          : "Built-in default";
    return { id: s.id, title: s.title, state };
  });

  return (
    <StudyTemplateEditor
      initialBlocks={template.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        content: b.content,
        isVisible: b.isVisible,
      }))}
      studies={studyStatus}
    />
  );
}
