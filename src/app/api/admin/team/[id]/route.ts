// Admin API for a single team member by id (Node runtime — needs the fs disk
// for photo writes). GET reads the record; PATCH applies a partial update from
// either JSON or multipart/form-data; DELETE removes the record. PATCH and
// DELETE also reap the old uploaded photo from /public/uploads/team, but only
// for files we own (path prefix check) so seeded/external image paths are kept.
// Failed photo deletes are logged, not fatal — the DB write is the source of truth.
import { mkdir, unlink, writeFile } from "node:fs/promises";
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

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toDiskPath(publicPath: string) {
  const relativePath = publicPath.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", relativePath);
}

function parseSection(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  if (value === TeamSection.BoardOfDirectors)
    return TeamSection.BoardOfDirectors;
  if (value === TeamSection.ResearchTeam) return TeamSection.ResearchTeam;
  if (value === TeamSection.Alumni) return TeamSection.Alumni;
  return null;
}

function parseBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function readOptionalString(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

async function saveReplacementPhoto(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only jpeg, png, and webp images are allowed.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be under 5MB.");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "team");
  await mkdir(uploadDir, { recursive: true });
  const safeFileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const destination = path.join(uploadDir, safeFileName);
  await writeFile(destination, Buffer.from(await file.arrayBuffer()));
  return `/uploads/team/${safeFileName}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json(
        { error: "Invalid team member id." },
        { status: 400 },
      );
    }
    const member = await prisma.teamMember.findUnique({ where: { id } });
    if (!member) {
      return NextResponse.json(
        { error: "Team member not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(member);
  } catch (error) {
    console.error("GET /api/admin/team/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch team member." },
      { status: 500 },
    );
  }
}

/**
 * Partial update of a team member. Accepts JSON (toggle/reorder/edit text) or
 * multipart/form-data (full edit incl. a replacement photo). Only the fields
 * actually present in the body are written, so absent fields are left untouched;
 * orcidId is format-validated and order is clamped to Prisma's Int range. A new
 * photo is persisted before the old owned file is removed. Returns 400 when the
 * body carries no recognised fields.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json(
        { error: "Invalid team member id." },
        { status: 400 },
      );
    }

    const existing = await prisma.teamMember.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Team member not found." },
        { status: 404 },
      );
    }

    const contentType = request.headers.get("content-type") || "";
    const updates: Record<string, unknown> = {};

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (body && typeof body === "object") {
        if (typeof body.isVisible === "boolean")
          updates.isVisible = body.isVisible;
        if (typeof body.order === "number") updates.order = clampOrder(body.order);
        if (typeof body.name === "string") updates.name = body.name.trim();
        if (typeof body.title === "string") updates.title = body.title.trim();
        if (typeof body.bio === "string") updates.bio = body.bio.trim();
      }
    } else {
      const formData = await request.formData();

      const name = formData.get("name");
      if (typeof name === "string") updates.name = name.trim();

      const title = formData.get("title");
      if (typeof title === "string") updates.title = title.trim();

      const bio = formData.get("bio");
      if (typeof bio === "string") updates.bio = bio.trim();

      const section = parseSection(formData.get("section"));
      if (section) updates.section = section;

      const isVisible = parseBoolean(formData.get("isVisible"));
      if (typeof isVisible === "boolean") updates.isVisible = isVisible;

      const orderRaw = formData.get("order");
      if (typeof orderRaw === "string") updates.order = clampOrder(orderRaw);

      const orcidId = readOptionalString(formData, "orcidId");
      if (orcidId !== undefined) {
        if (orcidId && !isValidOrcidId(orcidId)) {
          return NextResponse.json(
            {
              error:
                "orcidId must look like 0000-0000-0000-0000 (16 digits, last may be X).",
            },
            { status: 400 },
          );
        }
        updates.orcidId = orcidId;
      }

      const profileUrl = readOptionalString(formData, "profileUrl");
      if (profileUrl !== undefined) updates.profileUrl = profileUrl;

      const yearsActive = readOptionalString(formData, "yearsActive");
      if (yearsActive !== undefined) updates.yearsActive = yearsActive;

      const photo = formData.get("photo");
      if (photo instanceof File && photo.size > 0) {
        let newPhotoPath: string;
        try {
          newPhotoPath = await saveReplacementPhoto(photo);
        } catch (error) {
          return NextResponse.json(
            {
              error:
                error instanceof Error ? error.message : "Invalid image file.",
            },
            { status: 400 },
          );
        }

        updates.photoPath = newPhotoPath;
        if (existing.photoPath.startsWith("/uploads/team/")) {
          try {
            await unlink(toDiskPath(existing.photoPath));
          } catch (error) {
            console.warn("Old team photo could not be removed:", error);
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 },
      );
    }

    const updated = await prisma.teamMember.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/admin/team/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to update team member." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json(
        { error: "Invalid team member id." },
        { status: 400 },
      );
    }

    const existing = await prisma.teamMember.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Team member not found." },
        { status: 404 },
      );
    }

    await prisma.teamMember.delete({ where: { id } });

    if (existing.photoPath.startsWith("/uploads/team/")) {
      try {
        await unlink(toDiskPath(existing.photoPath));
      } catch (error) {
        console.warn("Team photo could not be removed:", error);
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/admin/team/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete team member." },
      { status: 500 },
    );
  }
}
