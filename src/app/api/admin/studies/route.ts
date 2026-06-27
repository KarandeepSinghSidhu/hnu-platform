// Admin REST collection for clinical/research studies.
//   GET  → all studies ordered by `order` (admin listing; no filtering).
//   POST → create a study from a JSON body, coercing/validating every field.
// Inputs are normalised defensively (untrusted admin JSON): strings trimmed,
// status constrained to ALLOWED_STATUSES (defaults to "Recruiting"), order
// clamped to a safe Int range, and a required-field check rejects with 400.
// On create, ZH translations of the title/short description are pre-warmed
// best-effort so the public listing renders without a first-hit translate delay.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampOrder } from "@/lib/order";
import { warmStrings } from "@/lib/translate/blocks";

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function asNullableDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

const ALLOWED_STATUSES = new Set(["Recruiting", "Active", "Completed"]);

export async function GET() {
  try {
    const studies = await prisma.study.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json(studies, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/studies failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch studies." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const slug = asTrimmedString(body?.slug);
    const title = asTrimmedString(body?.title);
    const shortDescription = asTrimmedString(body?.shortDescription);
    const fullDescriptionEn = asTrimmedString(body?.fullDescriptionEn);
    const fullDescriptionZh = asTrimmedString(body?.fullDescriptionZh);
    const eligibilityEn = asTrimmedString(body?.eligibilityEn);
    const eligibilityZh = asTrimmedString(body?.eligibilityZh);
    const compensationEn = asTrimmedString(body?.compensationEn);
    const compensationZh = asTrimmedString(body?.compensationZh);
    const redcapUrl = asTrimmedString(body?.redcapUrl);
    const contactEmail = asTrimmedString(body?.contactEmail);
    const contactPhone = asTrimmedString(body?.contactPhone);
    const contactPhoneZh = asTrimmedString(body?.contactPhoneZh);
    const imagePath = asTrimmedString(body?.imagePath);
    const ethicsStatement = asTrimmedString(body?.ethicsStatement);
    const category = asTrimmedString(body?.category);

    const rawStatus = asTrimmedString(body?.status);
    const status = ALLOWED_STATUSES.has(rawStatus) ? rawStatus : "Recruiting";

    if (
      !slug ||
      !title ||
      !shortDescription ||
      !fullDescriptionEn ||
      !fullDescriptionZh ||
      !eligibilityEn ||
      !eligibilityZh ||
      !compensationEn ||
      !compensationZh ||
      !redcapUrl ||
      !contactEmail ||
      !contactPhone ||
      !ethicsStatement
    ) {
      return NextResponse.json(
        { error: "Missing required study fields." },
        { status: 400 },
      );
    }

    const created = await prisma.study.create({
      data: {
        slug,
        title,
        shortDescription,
        fullDescriptionEn,
        fullDescriptionZh,
        eligibilityEn,
        eligibilityZh,
        compensationEn,
        compensationZh,
        redcapUrl,
        contactEmail,
        contactPhone,
        contactPhoneZh,
        imagePath,
        ethicsStatement,
        isActive: asBoolean(body?.isActive, true),
        status,
        category,
        publishedAt: asNullableDate(body?.publishedAt),
        order: clampOrder(body?.order, 0),
      },
    });

    // Pre-warm 中文 translations for the listing's auto-translated title and short
    // description (best-effort; never fail the create over a translation hiccup).
    try {
      await warmStrings([created.title, created.shortDescription], "ZH");
    } catch (err) {
      console.error("Study translation warm failed (non-fatal):", err);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/studies failed:", error);
    return NextResponse.json(
      { error: "Failed to create study." },
      { status: 500 },
    );
  }
}
