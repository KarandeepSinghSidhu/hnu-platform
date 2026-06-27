// Server-only data accessor for the visible team roster, grouped into the three
// display sections. Single source of truth shared by the `/api/team` route and
// the TeamSectionsBlock server component, so both agree on shape and ordering
// without one HTTP-fetching the other during render.
import "server-only";
import { TeamSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TeamMemberRecord = {
  id: number;
  name: string;
  title: string;
  section: string;
  bio: string;
  photoPath: string;
  profileUrl: string | null;
};

export type TeamData = {
  boardOfDirectors: TeamMemberRecord[];
  researchTeam: TeamMemberRecord[];
  alumni: TeamMemberRecord[];
};

const memberSelect = {
  id: true,
  name: true,
  title: true,
  section: true,
  bio: true,
  photoPath: true,
  profileUrl: true,
} as const;

/**
 * Reads the three visible team sections straight from the database, each ordered
 * by display order.
 *
 * Single source of truth shared by the `/api/team` route (for client components)
 * and the TeamSectionsBlock server component. Server components call this
 * directly rather than HTTP-fetching our own API during render.
 */
export async function getTeamData(): Promise<TeamData> {
  const [boardOfDirectors, researchTeam, alumni] = await Promise.all([
    prisma.teamMember.findMany({
      where: { isVisible: true, section: TeamSection.BoardOfDirectors },
      orderBy: { order: "asc" },
      select: memberSelect,
    }),
    prisma.teamMember.findMany({
      where: { isVisible: true, section: TeamSection.ResearchTeam },
      orderBy: { order: "asc" },
      select: memberSelect,
    }),
    prisma.teamMember.findMany({
      where: { isVisible: true, section: TeamSection.Alumni },
      orderBy: { order: "asc" },
      select: memberSelect,
    }),
  ]);

  return { boardOfDirectors, researchTeam, alumni };
}
