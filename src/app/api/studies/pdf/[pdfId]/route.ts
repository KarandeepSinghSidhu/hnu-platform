// Public, unauthenticated download endpoint for study PDFs. Streams the file
// bytes straight from the database because Render's filesystem is ephemeral, so
// uploaded files can't be served from disk. Runs on the Node runtime and is
// force-dynamic so the bytes are read per request, never prerendered/cached.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
// Reads the bytes from the DB per request — never prerender/cache at build time.
export const dynamic = "force-dynamic";

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * GET /api/studies/pdf/[pdfId] — serves a study PDF inline by numeric id.
 * Responds 400 for a non-positive-integer id, 404 when the row or its bytes are
 * missing, and 500 on unexpected errors. The filename is sanitised before being
 * placed in the Content-Disposition header.
 */
// Public download for a study PDF. The bytes live in the database (Render's
// filesystem is ephemeral), so this streams them with a sensible filename. The
// `data` column is normally omitted from queries (see src/lib/prisma.ts), so it
// is selected explicitly here.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pdfId: string }> },
) {
  try {
    const { pdfId: pdfIdParam } = await params;
    const pdfId = parseId(pdfIdParam);
    if (!pdfId) {
      return NextResponse.json({ error: "Invalid PDF id." }, { status: 400 });
    }

    const pdf = await prisma.studyPdf.findUnique({
      where: { id: pdfId },
      select: { data: true, mimeType: true, title: true },
    });

    // Missing row, or a legacy row whose bytes were lost to an old ephemeral
    // disk (re-upload via the admin console fixes it).
    if (!pdf || !pdf.data) {
      return NextResponse.json({ error: "PDF not found." }, { status: 404 });
    }

    const safeName =
      pdf.title.replace(/[^a-zA-Z0-9._ -]/g, "_").trim() || "document";
    const fileName = safeName.toLowerCase().endsWith(".pdf")
      ? safeName
      : `${safeName}.pdf`;

    // `pdf.data` is already a Uint8Array (a valid BodyInit), so hand it to the
    // Response directly — wrapping it in `new Uint8Array(...)` would copy the
    // whole buffer and double peak memory for multi-MB PDFs.
    return new Response(pdf.data, {
      status: 200,
      headers: {
        "Content-Type": pdf.mimeType || "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": String(pdf.data.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/studies/pdf/[pdfId] failed:", error);
    return NextResponse.json({ error: "Failed to load PDF." }, { status: 500 });
  }
}
