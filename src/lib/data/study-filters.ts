import { Prisma } from "@prisma/client";

/**
 * Single source of truth for which studies appear in PUBLIC listings: active
 * and not yet Completed. Shared by getStudies (studies overview), getNavStudies
 * (navbar dropdown) and GET /api/studies, so the "hide Completed" policy has one
 * owner — change it here and every public listing follows.
 */
export const PUBLIC_STUDY_WHERE: Prisma.StudyWhereInput = {
  isActive: true,
  status: { not: "Completed" },
};
