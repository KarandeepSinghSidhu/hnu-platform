// Admin API for the case-studies collection.
//   GET  -> list every case study, newest upload first.
//   POST -> accept a multipart form (title, description, PDF), validate it,
//           persist the file under public/uploads/case-studies, and record the
//           row in the DB.
// Uploads are constrained to PDFs <= 20MB; the stored filename is timestamp-
// prefixed and sanitised so it can't escape the upload dir or clash with
// existing files. Runs on the Node runtime because it touches the filesystem.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET() {
  try {
    const caseStudies = await prisma.caseStudy.findMany({
      orderBy: {
        uploadedAt: "desc",
      },
    });

    return NextResponse.json(caseStudies);
  } catch (error) {
    console.error("Failed to fetch case studies:", error);

    return NextResponse.json(
      { error: "Failed to fetch case studies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const title = formData.get("title");
    const description = formData.get("description");
    const file = formData.get("file");

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 }
      );
    }

    const isPdfMime = file.type === "application/pdf";
    const isPdfExtension = file.name.toLowerCase().endsWith(".pdf");

    if (!isPdfMime || !isPdfExtension) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be 20MB or less" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "case-studies"
    );

    await mkdir(uploadDir, { recursive: true });

    const safeFileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
    const diskPath = path.join(uploadDir, safeFileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(diskPath, buffer);

    const caseStudy = await prisma.caseStudy.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        pdfPath: `/uploads/case-studies/${safeFileName}`,
      },
    });

    return NextResponse.json(caseStudy, { status: 201 });
  } catch (error) {
    console.error("Failed to create case study:", error);

    return NextResponse.json(
      { error: "Failed to create case study" },
      { status: 500 }
    );
  }
}