import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StudyLayoutEditor from "@/components/admin/page-editor/StudyLayoutEditor";
import { studyOverrideSlug } from "@/components/blocks/study/resolve-study-layout";

export const dynamic = "force-dynamic";

export default async function StudyLayoutEditorRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const studyId = Number(id);
  if (!Number.isInteger(studyId) || studyId <= 0) notFound();

  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study) notFound();

  // Lazily create the override page; an empty one renders the default layout.
  const overrideSlug = studyOverrideSlug(study.slug);
  const page = await prisma.page.upsert({
    where: { slug: overrideSlug },
    update: {},
    create: { slug: overrideSlug, title: `Study layout: ${study.title}` },
    include: { blocks: { orderBy: { position: "asc" } } },
  });

  return (
    <StudyLayoutEditor
      studyId={studyId}
      studySlug={study.slug}
      studyTitle={study.title}
      overrideSlug={overrideSlug}
      initialBlocks={page.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        content: b.content,
        isVisible: b.isVisible,
      }))}
    />
  );
}
