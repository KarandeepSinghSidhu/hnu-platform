// Admin API for the team-members collection: GET lists every member (visible or
// not) grouped by section, POST creates one from a multipart form. Runs on the
// Node runtime so it can write uploaded photos to public/uploads/team. Photo
// uploads are validated for type/size; missing photos fall back to a placeholder.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TeamSection } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampOrder } from "@/lib/order";
import { isValidOrcidId } from "@/lib/orcid";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseBoolean(value: FormDataEntryValue | null, fallback = true) {
  if (typeof value !== "string") return fallback;
  return value === "true";
}

function parseSection(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  if (value === TeamSection.BoardOfDirectors)
    return TeamSection.BoardOfDirectors;
  if (value === TeamSection.ResearchTeam) return TeamSection.ResearchTeam;
  if (value === TeamSection.Alumni) return TeamSection.Alumni;
  return null;
}

function asOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

async function saveTeamPhoto(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only jpeg, png, and webp images are allowed.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be under 5MB.");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "team");
  await mkdir(uploadDir, { recursive: true });

  const safeFileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const filePath = path.join(uploadDir, safeFileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return `/uploads/team/${safeFileName}`;
}

/**
 * Returns all team members (including hidden ones), ordered by section then by
 * order, for the admin console. No filtering — admins see the full roster.
 */
export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({
      orderBy: [{ section: "asc" }, { order: "asc" }],
    });
    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/team failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members." },
      { status: 500 },
    );
  }
}

/**
 * Creates a team member from a multipart form. Requires name, title, and a valid
 * section; orcidId (when supplied) must pass ORCID-format validation. An invalid
 * photo upload yields 400; absent photos default to the placeholder image. The
 * client-supplied order is clamped to a safe range.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get("name");
    const title = formData.get("title");
    const section = parseSection(formData.get("section"));
    const bio = formData.get("bio");
    const photo = formData.get("photo");

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "title is required." },
        { status: 400 },
      );
    }
    if (!section) {
      return NextResponse.json(
        { error: "section is invalid." },
        { status: 400 },
      );
    }

    const orcidId = asOptionalString(formData.get("orcidId"));
    if (orcidId && !isValidOrcidId(orcidId)) {
      return NextResponse.json(
        {
          error:
            "orcidId must look like 0000-0000-0000-0000 (16 digits, last may be X).",
        },
        { status: 400 },
      );
    }

    let photoPath = "";
    if (photo instanceof File && photo.size > 0) {
      try {
        photoPath = await saveTeamPhoto(photo);
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Invalid image file.",
          },
          { status: 400 },
        );
      }
    } else {
      photoPath = "/images/team/no-team-member-picture.png";
    }

    const created = await prisma.teamMember.create({
      data: {
        name: name.trim(),
        title: title.trim(),
        section,
        bio: typeof bio === "string" ? bio.trim() : "",
        photoPath,
        orcidId,
        profileUrl: asOptionalString(formData.get("profileUrl")),
        yearsActive: asOptionalString(formData.get("yearsActive")),
        order: clampOrder(formData.get("order"), 0),
        isVisible: parseBoolean(formData.get("isVisible"), true),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/team failed:", error);
    return NextResponse.json(
      { error: "Failed to create team member." },
      { status: 500 },
    );
  }
}
