// Admin API for a single PDF attached to a study, keyed by both the study id
// and the PDF id so a PDF can only be touched through its owning study.
//   PATCH  — rename (title) and/or reorder (order) the PDF; ignores unknown
//            fields and rejects when nothing valid is supplied.
//   DELETE — remove the PDF (and its stored bytes, which live in the row).
// Both verbs 404 unless the PDF exists AND belongs to the given study.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampOrder } from "@/lib/order";

export const runtime = "nodejs";

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; pdfId: string }> },
) {
  try {
    const { id: idParam, pdfId: pdfIdParam } = await params;
    const studyId = parseId(idParam);
    const pdfId = parseId(pdfIdParam);
    if (!studyId || !pdfId) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    const pdf = await prisma.studyPdf.findUnique({ where: { id: pdfId } });
    if (!pdf || pdf.studyId !== studyId) {
      return NextResponse.json({ error: "PDF not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const updates: { title?: string; order?: number } = {};
    if (typeof body.title === "string" && body.title.trim()) {
      updates.title = body.title.trim();
    }
    if (typeof body.order === "number") {
      if (!Number.isInteger(body.order)) {
        return NextResponse.json(
          { error: "order must be an integer." },
          { status: 400 },
        );
      }
      updates.order = clampOrder(body.order);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 },
      );
    }

    const updated = await prisma.studyPdf.update({
      where: { id: pdfId },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/studies/[id]/pdfs/[pdfId] failed:", error);
    return NextResponse.json(
      { error: "Failed to update PDF." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; pdfId: string }> },
) {
  try {
    const { id: idParam, pdfId: pdfIdParam } = await params;
    const studyId = parseId(idParam);
    const pdfId = parseId(pdfIdParam);
    if (!studyId || !pdfId) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    const pdf = await prisma.studyPdf.findUnique({ where: { id: pdfId } });
    if (!pdf || pdf.studyId !== studyId) {
      return NextResponse.json({ error: "PDF not found." }, { status: 404 });
    }

    // The bytes live in the row, so deleting it removes the file too.
    await prisma.studyPdf.delete({ where: { id: pdfId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/studies/[id]/pdfs/[pdfId] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete PDF." },
      { status: 500 },
    );
  }
}
