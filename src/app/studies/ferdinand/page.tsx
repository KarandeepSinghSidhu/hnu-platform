import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StudyDetail from "@/components/sections/StudyDetail";
import StudiesHero from "@/components/layout/StudiesHero";
import { getStudyLayoutForSlug } from "@/components/blocks/study/resolve-study-layout";
import StudyLayoutView from "@/components/blocks/study/StudyLayoutView";
import { getServerLang } from "@/lib/lang";
import { getDictionary } from "@/lib/dictionaries";
import { buildPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: "/studies/ferdinand",
    title: { en: "Ferdinand", zh: "Ferdinand 研究" },
    description: {
      en: "A 6-month weight loss nutrition study investigating whether daily feijoa whole fruit powder alters the risk of developing type 2 diabetes.",
      zh: "一项为期 6 个月的体重管理营养研究，探讨每日食用斐济果全果粉是否会改变 2 型糖尿病风险。",
    },
  });
}

export const dynamic = "force-dynamic";

export default async function FerdinandPage() {
  const layout = await getStudyLayoutForSlug("ferdinand");
  if (layout) {
    return <StudyLayoutView study={layout.study} blocks={layout.blocks} />;
  }
  const t = await getDictionary(await getServerLang());

  return (
    <>
      <Navbar />

      <StudiesHero
        imageSrc="/ferdinand study.jpg"
        imageAlt={t.studies.ferdinandPageTitle}
        title={t.studies.ferdinandPageTitle}
      />

      <StudyDetail
        status="Open"
        deadline={t.studies.ferdinandDeadline}
        eligibility={[
          t.studies.ferdinandEligibilityGlucose,
          t.studies.eligibilityAge18To70,
          t.studies.ferdinandEligibilityWeight,
          t.studies.eligibilityAuckland,
          t.studies.ferdinandEligibilityVisits,
        ]}
        joinHref="/contact"
        contactHref="/contact"
        content={
          <div>
            <ul>
              <li>
                {t.studies.ferdinandQuestion1}
              </li>
              <li>{t.studies.ferdinandQuestion2}</li>
              <li>{t.studies.ferdinandQuestion3}</li>
            </ul>
            <p>
              {t.studies.ferdinandDescriptionText}
            </p>
          </div>
        }
      />

      <Footer />
    </>
  );
}
