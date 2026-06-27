// Admin API for the page-editor index: GET returns every editable page (slug,
// metadata, block count) for the admin pages list. Non-public pages — the
// retired "studies" overview and internal study-layout pages — are excluded so
// content editors can't reach routes that have no public-site presence. The
// excluded-slug rules live in lib/blocks/page-paths so they stay in sync with
// site search rather than drifting per call site.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  INTERNAL_PAGE_SLUG_PREFIX,
  RETIRED_PAGE_SLUG,
} from "@/lib/blocks/page-paths";

export const runtime = "nodejs";

// List all editable pages with their block counts.
export async function GET() {
  try {
    const pages = await prisma.page.findMany({
      where: {
        // Hide pages with no public route — the "studies" overview (reworked
        // directly on the public site) and internal study-layout pages — so
        // content editors don't change them here. Shared with site search via
        // page-paths so the non-public slug rules can't drift.
        slug: { not: RETIRED_PAGE_SLUG },
        NOT: { slug: { startsWith: INTERNAL_PAGE_SLUG_PREFIX } },
      },
      orderBy: { slug: "asc" },
      include: { _count: { select: { blocks: true } } },
    });
    return NextResponse.json(pages);
  } catch (error) {
    console.error("Failed to fetch pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 },
    );
  }
}
