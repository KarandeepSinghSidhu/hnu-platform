import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StudiesHero from "@/components/layout/StudiesHero";
import StudyDetail from "@/components/sections/StudyDetail";
import { getStudyLayoutForSlug } from "@/components/blocks/study/resolve-study-layout";
import StudyLayoutView from "@/components/blocks/study/StudyLayoutView";
import { getServerLang } from "@/lib/lang";
import { getDictionary } from "@/lib/dictionaries";
import { buildPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: "/studies/nz-synergy",
    title: { en: "NZ Synergy", zh: "NZ Synergy 研究" },
    description: {
      en: "A two-week residential nutrition study investigating dietary effects on diabetes risk markers.",
      zh: "一项为期两周的住院式营养研究，探讨饮食对糖尿病风险指标的影响。",
    },
  });
}

export const dynamic = "force-dynamic";

export default async function NZSynergyPage() {
  const layout = await getStudyLayoutForSlug("nz-synergy");
  if (layout) {
    return <StudyLayoutView study={layout.study} blocks={layout.blocks} />;
  }
  const t = await getDictionary(await getServerLang());

  return (
    <>
      <Navbar />

      <StudiesHero
        imageSrc="/NZ Synergy study.jpg"
        imageAlt={t.studies.nzSynergyPageTitle}
        title={t.studies.nzSynergyPageTitle}
        imagePosition="top"
      />

      <StudyDetail
        status="Open"
        deadline={t.studies.nzSynergyDeadline}
        eligibility={[
          t.studies.eligibilityAge18To70,
          t.studies.eligibilityBmi18To30,
          t.studies.eligibilityAuckland,
          t.studies.nzSynergyEligibilityStay,
        ]}
        joinHref="/contact"
        contactHref="/contact"
        content={
          <div>
            <ul>
              <li>
                {t.studies.nzSynergyQuestion1}
              </li>
              <li>{t.studies.nzSynergyQuestion2}</li>
            </ul>
            <p>
              {t.studies.nzSynergyDescriptionText}
            </p>
          </div>
        }
      />

      <Footer />
    </>
  );
}
