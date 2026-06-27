import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asTrimmedString, isValidEmail } from "@/lib/validation";
import { clampOrder } from "@/lib/order";

// Admin CRUD for inquiry types (ContactRecipient rows double as the type list
// and the per-type notification recipient). `category` is the immutable
// canonical key stored on submissions — renames only touch the labels.

// The English label becomes the canonical category and is copied onto every
// submission and rendered into the public <option>; cap it like the contact
// form caps name/message (see src/app/api/contact/route.ts).
const MAX_LABEL_LENGTH = 120;

// Collapse internal whitespace so a label normalises the same way whether it
// arrives via POST (create, derives the category) or PATCH (rename).
function normalizeLabel(value: unknown) {
  return asTrimmedString(value).replace(/\s+/g, " ");
}

/** List every inquiry type, active first then by display order, for the admin UI. */
export async function GET() {
  try {
    const recipients = await prisma.contactRecipient.findMany({
      orderBy: [{ isArchived: "asc" }, { order: "asc" }, { id: "asc" }],
    });
    return NextResponse.json(recipients);
  } catch (error) {
    console.error("GET /api/admin/contact-recipients failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact recipients." },
      { status: 500 },
    );
  }
}

/** Create a new inquiry type. The English label becomes the canonical category. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const labelEn = normalizeLabel(body?.labelEn);
    const labelZh = asTrimmedString(body?.labelZh);
    const email = asTrimmedString(body?.email);

    if (!labelEn) {
      return NextResponse.json(
        { error: "An English label is required." },
        { status: 400 },
      );
    }
    if (labelEn.length > MAX_LABEL_LENGTH || labelZh.length > MAX_LABEL_LENGTH) {
      return NextResponse.json(
        { error: `Labels must be ${MAX_LABEL_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "email must be a valid email address." },
        { status: 400 },
      );
    }

    const category = labelEn;
    const lower = category.toLowerCase();

    // One transaction so the duplicate check, order calc and write can't race a
    // concurrent create/restore. The match is case-insensitive: SQLite's default
    // collation makes the unique index case-sensitive, which would otherwise let
    // "Donation" and "donation" coexist and would miss an archived original on
    // re-add. The table is tiny, so scanning it is cheap.
    const result = await prisma.$transaction(async (tx) => {
      const all = await tx.contactRecipient.findMany();
      const existing =
        all.find((r) => r.category.toLowerCase() === lower) ?? null;
      if (existing && !existing.isArchived) {
        return { conflict: true as const };
      }

      const maxOrder = await tx.contactRecipient.aggregate({
        _max: { order: true },
      });
      const order = clampOrder((maxOrder._max.order ?? 0) + 1);

      if (existing) {
        // Re-adding an archived type restores the original row (its historical
        // submissions reattach). Flag it so the UI can say so rather than look
        // like a brand-new create.
        const saved = await tx.contactRecipient.update({
          where: { category: existing.category },
          data: { labelEn, labelZh, email, order, isArchived: false },
        });
        return { restored: true as const, saved };
      }

      const saved = await tx.contactRecipient.create({
        data: { category, labelEn, labelZh, email, order },
      });
      return { restored: false as const, saved };
    });

    if ("conflict" in result) {
      return NextResponse.json(
        { error: "An inquiry type with that name already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ...result.saved, restored: result.restored },
      { status: result.restored ? 200 : 201 },
    );
  } catch (error) {
    console.error("POST /api/admin/contact-recipients failed:", error);
    return NextResponse.json(
      { error: "Failed to create contact recipient." },
      { status: 500 },
    );
  }
}

/** Update labels/email/order/archived for one type (category is immutable). */
export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body !== "object" ||
      typeof body.category !== "string"
    ) {
      return NextResponse.json(
        { error: "category is required." },
        { status: 400 },
      );
    }

    const data: {
      email?: string;
      labelEn?: string;
      labelZh?: string;
      order?: number;
      isArchived?: boolean;
    } = {};

    if (body.email !== undefined) {
      const email = asTrimmedString(body.email);
      if (!isValidEmail(email)) {
        return NextResponse.json(
          { error: "email must be a valid email address." },
          { status: 400 },
        );
      }
      data.email = email;
    }
    if (body.labelEn !== undefined) {
      const labelEn = normalizeLabel(body.labelEn);
      if (!labelEn) {
        return NextResponse.json(
          { error: "The English label cannot be empty." },
          { status: 400 },
        );
      }
      if (labelEn.length > MAX_LABEL_LENGTH) {
        return NextResponse.json(
          { error: `Labels must be ${MAX_LABEL_LENGTH} characters or fewer.` },
          { status: 400 },
        );
      }
      data.labelEn = labelEn;
    }
    if (body.labelZh !== undefined) {
      const labelZh = asTrimmedString(body.labelZh);
      if (labelZh.length > MAX_LABEL_LENGTH) {
        return NextResponse.json(
          { error: `Labels must be ${MAX_LABEL_LENGTH} characters or fewer.` },
          { status: 400 },
        );
      }
      data.labelZh = labelZh;
    }
    if (body.order !== undefined) {
      // Funnel through clampOrder so a negative/huge/non-numeric value can never
      // reach the Int column (see src/lib/order.ts).
      data.order = clampOrder(body.order);
    }

    const wantsArchived: unknown = body.isArchived;
    if (wantsArchived !== undefined && typeof wantsArchived !== "boolean") {
      return NextResponse.json(
        { error: "isArchived must be a boolean." },
        { status: 400 },
      );
    }

    // One transaction so the last-active guard and the write can't race a
    // concurrent archive/restore.
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.contactRecipient.findUnique({
        where: { category: body.category },
      });
      if (!existing) return { notFound: true as const };

      if (typeof wantsArchived === "boolean") {
        // Refuse to archive the last active type — the public form needs at
        // least one option to function.
        if (wantsArchived && !existing.isArchived) {
          const activeCount = await tx.contactRecipient.count({
            where: { isArchived: false },
          });
          if (activeCount <= 1) return { lastActive: true as const };
        }
        // Restoring (un-archiving): append at the end so a revived type lands
        // consistently with a freshly-added one instead of keeping a stale order.
        if (!wantsArchived && existing.isArchived) {
          const maxOrder = await tx.contactRecipient.aggregate({
            _max: { order: true },
          });
          data.order = clampOrder((maxOrder._max.order ?? 0) + 1);
        }
        data.isArchived = wantsArchived;
      }

      const updated = await tx.contactRecipient.update({
        where: { category: body.category },
        data,
      });
      return { updated };
    });

    if ("notFound" in result) {
      return NextResponse.json(
        { error: "No recipient exists for that category." },
        { status: 404 },
      );
    }
    if ("lastActive" in result) {
      return NextResponse.json(
        { error: "At least one active inquiry type is required." },
        { status: 400 },
      );
    }
    return NextResponse.json(result.updated);
  } catch (error) {
    console.error("PATCH /api/admin/contact-recipients failed:", error);
    return NextResponse.json(
      { error: "Failed to update contact recipient." },
      { status: 500 },
    );
  }
}

/** Hard-delete a type — only when no submissions reference it (else archive). */
export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const category = asTrimmedString(body?.category);
    if (!category) {
      return NextResponse.json(
        { error: "category is required." },
        { status: 400 },
      );
    }

    // One transaction so the reference/last-active checks and the delete can't
    // race a concurrent submission or archive.
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.contactRecipient.findUnique({
        where: { category },
      });
      if (!existing) return { notFound: true as const };

      const submissionCount = await tx.contactSubmission.count({
        where: { category },
      });
      if (submissionCount > 0) return { referenced: submissionCount };

      if (!existing.isArchived) {
        const activeCount = await tx.contactRecipient.count({
          where: { isArchived: false },
        });
        if (activeCount <= 1) return { lastActive: true as const };
      }

      await tx.contactRecipient.delete({ where: { category } });
      return { ok: true as const };
    });

    if ("notFound" in result) {
      return NextResponse.json(
        { error: "No recipient exists for that category." },
        { status: 404 },
      );
    }
    if ("referenced" in result) {
      return NextResponse.json(
        {
          error: `This type has ${result.referenced} submission(s) — archive it instead so they stay readable.`,
        },
        { status: 409 },
      );
    }
    if ("lastActive" in result) {
      return NextResponse.json(
        { error: "At least one active inquiry type is required." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/contact-recipients failed:", error);
    return NextResponse.json(
      { error: "Failed to delete contact recipient." },
      { status: 500 },
    );
  }
}
