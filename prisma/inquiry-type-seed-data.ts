// Canonical label + order for the six original inquiry types, shared by the
// seed (prisma/seed.ts) and the db-push backfill (prisma/backfill-inquiry-labels.ts)
// so the two can't drift. The migration SQL keeps its own copy — raw SQL can't
// import TS. `category` is the immutable canonical key; labelEn equals it for
// these originals (labels were previously hardcoded in src/messages/en|zh.ts).
export type OriginalInquiryType = {
  category: string;
  labelZh: string;
  order: number;
};

export const ORIGINAL_INQUIRY_TYPES: OriginalInquiryType[] = [
  { category: "Study Participant Enquiry", labelZh: "研究参与者咨询", order: 1 },
  { category: "Industry Partnership", labelZh: "行业合作", order: 2 },
  { category: "Internship or PhD Opportunity", labelZh: "实习或博士机会", order: 3 },
  { category: "Donation", labelZh: "捐赠", order: 4 },
  { category: "General Enquiry", labelZh: "一般咨询", order: 5 },
  { category: "Other", labelZh: "其他", order: 6 },
];
