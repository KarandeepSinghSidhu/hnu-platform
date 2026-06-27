// Admin API route: POST restores a stored page revision back into the live
// (draft) blocks for the page identified by [slug]. The revision is scoped to
// its page so it can't be applied to the wrong one, and restoring only stages
// the content as a draft — it never publishes, leaving the admin to review and
// publish from the editor.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePublishedSnapshot } from "@/lib/page-publish";
import { replaceDraftBlocks } from "@/lib/page-draft-ops";

export const runtime = "nodejs";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Restore a revision into the live (draft) blocks. The admin reviews it in the
// editor and publishes to make it live — restoring never publishes directly.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid revision id" }, { status: 400 });
    }

    const page = await prisma.page.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Scope to the page so a revision can't be restored via the wrong page.
    const revision = await prisma.pageRevision.findFirst({
      where: { id, pageId: page.id },
    });
    if (!revision) {
      return NextResponse.json({ error: "Revision not found" }, { status: 404 });
    }

    await replaceDraftBlocks(page.id, parsePublishedSnapshot(revision.content));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to restore revision:", error);
    return NextResponse.json(
      { error: "Failed to restore revision" },
      { status: 500 },
    );
  }
}
