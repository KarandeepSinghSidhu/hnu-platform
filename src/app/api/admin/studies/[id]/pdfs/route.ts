// Admin API for a study's attached PDFs. GET lists a study's PDFs (metadata
// only, ordered for display); POST accepts a multipart upload and stores the
// file bytes in the database. Bytes live in the DB rather than public/ because
// Render's filesystem is ephemeral — see the POST handler. The route runs on
// the Node.js runtime (Buffer / large form bodies) and enforces a 20MB cap,
// PDF-only MIME + extension, and integer order.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampOrder } from "@/lib/order";

export const runtime = "nodejs";

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseOrder(orderRaw: FormDataEntryValue | null) {
  if (typeof orderRaw !== "string" || orderRaw.trim() === "") {
    return 0;
  }

  const parsed = Number(orderRaw);
  return Number.isInteger(parsed) ? clampOrder(parsed) : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const studyId = parseId(idParam);
    if (!studyId) {
      return NextResponse.json({ error: "Invalid study id." }, { status: 400 });
    }

    const pdfs = await prisma.studyPdf.findMany({
      where: { studyId },
      orderBy: [{ order: "asc" }, { uploadedAt: "asc" }],
    });

    return NextResponse.json(pdfs);
  } catch (error) {
    console.error("GET /api/admin/studies/[id]/pdfs failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch study PDFs." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const studyId = parseId(idParam);
    if (!studyId) {
      return NextResponse.json({ error: "Invalid study id." }, { status: 400 });
    }

    const study = await prisma.study.findUnique({ where: { id: studyId } });
    if (!study) {
      return NextResponse.json({ error: "Study not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const title = formData.get("title");
    const file = formData.get("file");
    const orderRaw = formData.get("order");

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "PDF file is required." },
        { status: 400 },
      );
    }

    const isPdfMime = file.type === "application/pdf";
    const isPdfExtension = file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfMime || !isPdfExtension) {
      return NextResponse.json(
        { error: "Only PDF files are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: "File size must be 20MB or less." },
        { status: 400 },
      );
    }

    const order = parseOrder(orderRaw);
    if (order === null) {
      return NextResponse.json(
        { error: "Order must be an integer." },
        { status: 400 },
      );
    }

    // Store the bytes in the database so downloads survive a redeploy: Render's
    // filesystem is ephemeral, so files written to public/ at runtime are wiped.
    // The bytes are served by GET /api/studies/pdf/[id]; `fileName` is kept as a
    // display label only.
    const safeFileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    // `data` is omitted from the client's default selection, so the returned row
    // is metadata only (no multi-MB buffer echoed back to the admin).
    const created = await prisma.studyPdf.create({
      data: {
        studyId,
        title: title.trim(),
        fileName: safeFileName,
        data: bytes,
        mimeType: file.type || "application/pdf",
        order,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/studies/[id]/pdfs failed:", error);
    return NextResponse.json(
      { error: "Failed to upload study PDF." },
      { status: 500 },
    );
  }
}
