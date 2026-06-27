import TeamFilter from "@/components/team/TeamFilter";
import BoardOfDirectors from "@/components/team/BoardOfDirectors";
import ResearchTeam from "@/components/team/ResearchTeam";
import AlumniSection from "@/components/team/AlumniSection";
import { getTeamData } from "@/lib/data/team";

// The Team page's filterable member sections. Self-contained: reads its own data
// so it can be placed as a block. Mirrors the previous page-level composition.
type TeamTab = "all" | "board" | "research" | "alumni";

export default async function TeamSectionsBlock({
  defaultTab = "all",
}: {
  defaultTab?: TeamTab;
} = {}) {
  const { boardOfDirectors, researchTeam, alumni } = await getTeamData();

  return (
    <TeamFilter
      board={<BoardOfDirectors members={boardOfDirectors} />}
      research={<ResearchTeam members={researchTeam} />}
      alumni={<AlumniSection members={alumni} />}
      hasAlumni={alumni.length > 0}
      defaultTab={defaultTab}
    />
  );
}
