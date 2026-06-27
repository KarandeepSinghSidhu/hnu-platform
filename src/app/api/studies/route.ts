// Public read-only API for the studies listing. GET returns active, publicly
// visible studies (PUBLIC_STUDY_WHERE) in display order, projected to the
// fields the listing needs. With ?lang=zh (or a ZH cookie) the title and short
// description are auto-translated via a read-only cache lookup; a miss falls
// back to the English source rather than a live API call. No auth — only the
// public subset is ever exposed.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerLang } from "@/lib/lang";
import { localizeStrings } from "@/lib/translate/blocks";
import { PUBLIC_STUDY_WHERE } from "@/lib/data/study-filters";

export async function GET(request: Request) {
  try {
    const studies = await prisma.study.findMany({
      where: PUBLIC_STUDY_WHERE,
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        imagePath: true,
        contactEmail: true,
        isActive: true,
      },
    });

    // The studies *listing* auto-translates: localize the model-sourced title and
    // short description for 中文 (read-only cache lookup — a miss falls back to the
    // English source, never a live API call). The client passes ?lang= explicitly
    // so a fresh toggle isn't subject to cookie-write timing; we fall back to the
    // cookie for any direct request. Individual study *detail* pages keep their
    // manual, board-approved translations and are untouched by this.
    const param = new URL(request.url).searchParams.get("lang");
    const lang = param
      ? param.toLowerCase() === "zh"
        ? "ZH"
        : "EN"
      : await getServerLang();

    if (lang === "ZH") {
      const [titles, shorts] = await Promise.all([
        localizeStrings(
          studies.map((s) => s.title),
          "ZH",
        ),
        localizeStrings(
          studies.map((s) => s.shortDescription ?? ""),
          "ZH",
        ),
      ]);
      const localized = studies.map((s, i) => ({
        ...s,
        title: titles[i],
        shortDescription: s.shortDescription == null ? null : shorts[i],
      }));
      return NextResponse.json(localized, { status: 200 });
    }

    return NextResponse.json(studies, { status: 200 });
  } catch (error) {
    console.error("GET /api/studies failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch studies." },
      { status: 500 },
    );
  }
}
