// Admin CRUD for a single Study by numeric id (GET read, PATCH update, DELETE
// remove). Backs the admin study editor; mutating routes whitelist the writable
// fields, validate status, and clamp order before touching the DB. PATCH also
// re-warms the ZH translation cache for the listing fields, and DELETE sweeps
// the study's on-disk PDF upload dir that the DB cascade can't reach. Node
// runtime because DELETE does filesystem cleanup.
import { NextResponse } from "next/server";
import { rm } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { clampOrder } from "@/lib/order";
import { warmStrings } from "@/lib/translate/blocks";

export const runtime = "nodejs";

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const ALLOWED_STUDY_STATUSES = new Set(["Recruiting", "Active", "Completed"]);

const ALLOWED_STUDY_KEYS = new Set([
  "slug",
  "title",
  "shortDescription",
  "fullDescriptionEn",
  "fullDescriptionZh",
  "eligibilityEn",
  "eligibilityZh",
  "compensationEn",
  "compensationZh",
  "redcapUrl",
  "contactEmail",
  "contactPhone",
  "contactPhoneZh",
  "imagePath",
  "ethicsStatement",
  "isActive",
  "status",
  "category",
  "publishedAt",
  "order",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) {
      return NextResponse.json({ error: "Invalid study id." }, { status: 400 });
    }
    const study = await prisma.study.findUnique({ where: { id } });
    if (!study) {
      return NextResponse.json({ error: "Study not found." }, { status: 404 });
    }
    return NextResponse.json(study);
  } catch (error) {
    console.error("GET /api/admin/studies/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch study." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) {
      return NextResponse.json({ error: "Invalid study id." }, { status: 400 });
    }

    const existing = await prisma.study.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Study not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_STUDY_KEYS.has(key)) continue;
      if (key === "publishedAt") {
        if (value === null || value === "") {
          updates[key] = null;
        } else if (typeof value === "string") {
          const parsed = new Date(value);
          updates[key] = Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        continue;
      }
      if (key === "status") {
        const trimmed = typeof value === "string" ? value.trim() : "";
        if (!ALLOWED_STUDY_STATUSES.has(trimmed)) {
          return NextResponse.json(
            {
              error: `Invalid status. Allowed values: ${[...ALLOWED_STUDY_STATUSES].join(", ")}.`,
            },
            { status: 400 },
          );
        }
        updates[key] = trimmed;
      } else if (key === "order") {
        updates.order = clampOrder(value);
      } else if (typeof value === "string") {
        updates[key] = value.trim();
      } else {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 },
      );
    }

    const updated = await prisma.study.update({
      where: { id },
      data: updates,
    });

    // Keep the listing's auto-translation current when title/short description
    // change (best-effort; re-warming unchanged text is a cheap cache hit).
    try {
      await warmStrings([updated.title, updated.shortDescription], "ZH");
    } catch (err) {
      console.error("Study translation warm failed (non-fatal):", err);
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/admin/studies/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to update study." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) {
      return NextResponse.json({ error: "Invalid study id." }, { status: 400 });
    }

    const existing = await prisma.study.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Study not found." }, { status: 404 });
    }

    await prisma.study.delete({ where: { id } });

    // The DB cascade removes the StudyPdf rows, but not the files on disk —
    // leaving them orphaned and still publicly downloadable. Every PDF for a
    // study lives under one directory, so remove it wholesale. Best-effort: a
    // successful delete must not fail over file cleanup.
    try {
      await rm(
        path.join(process.cwd(), "public", "uploads", "studies", String(id)),
        { recursive: true, force: true },
      );
    } catch (fileError) {
      console.warn("Study upload dir could not be removed:", fileError);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/admin/studies/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete study." },
      { status: 500 },
    );
  }
}
