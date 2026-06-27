import { prisma } from "@/lib/prisma";

// The admin-managed inquiry types shown on the public contact form.
// `category` is the canonical value submitted to /api/contact and stored on
// ContactSubmission rows; the labels are what visitors see (per language).

export type InquiryTypeOption = {
  category: string;
  labelEn: string;
  labelZh: string;
};

/** Active (non-archived) inquiry types in admin-set order, for the form. */
export async function getActiveInquiryTypes(): Promise<InquiryTypeOption[]> {
  const rows = await prisma.contactRecipient.findMany({
    where: { isArchived: false },
    // Tiebreak by id (like the admin GET) so the dropdown order is deterministic
    // and matches the admin list even if two rows ever share an `order`.
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { category: true, labelEn: true, labelZh: true },
  });
  // Older rows may predate the label backfill — fall back to the category
  // (which doubled as the English label before labels existed).
  return rows.map((row) => ({
    category: row.category,
    labelEn: row.labelEn || row.category,
    labelZh: row.labelZh,
  }));
}
