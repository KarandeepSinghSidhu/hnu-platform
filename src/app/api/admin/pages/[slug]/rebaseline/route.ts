import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Stamp the current published version as the page's "Original" baseline in
// version history. The Original revision is what "as designed" means in the
// History panel — after a deliberate redesign is published and final, this
// keeps that promise truthful instead of pointing at an outdated layout.
// Replaces the existing Original's content (or creates one, backdated so it
// sorts oldest).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const page = await prisma.page.findUnique({
      where: { slug },
      select: { id: true, createdAt: true, publishedContent: true },
    });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    if (!page.publishedContent) {
      return NextResponse.json(
        { error: "Page has never been published" },
        { status: 400 },
      );
    }

    const original = await prisma.pageRevision.findFirst({
      where: { pageId: page.id, label: "Original" },
      select: { id: true },
    });
    if (original) {
      // Stamp the new baseline with the current time so History shows *when* the
      // Original was last reset (the old date was misleading — it kept pointing
      // at the first baseline). The editor pins the "Original" entry to the
      // bottom of the list regardless of date, so it stays the visual baseline.
      await prisma.pageRevision.update({
        where: { id: original.id },
        data: { content: page.publishedContent, createdAt: new Date() },
      });
    } else {
      await prisma.pageRevision.create({
        data: {
          pageId: page.id,
          content: page.publishedContent,
          label: "Original",
          // Backdate to the page's creation so it always sorts oldest in History.
          createdAt: page.createdAt,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update the Original baseline:", error);
    return NextResponse.json(
      { error: "Failed to update the Original baseline" },
      { status: 500 },
    );
  }
}
