import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StudyHero from "@/components/layout/StudiesHero";
import StudyDetail from "@/components/sections/StudyDetail";
import { getStudyLayoutForSlug } from "@/components/blocks/study/resolve-study-layout";
import StudyLayoutView from "@/components/blocks/study/StudyLayoutView";
import { getServerLang } from "@/lib/lang";
import { getDictionary } from "@/lib/dictionaries";
import { buildPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: "/studies/food-beverage",
    title: { en: "NZ Food and Beverage", zh: "新西兰食品与饮料研究" },
    description: {
      en: "A short-term study investigating how different foods and beverages affect your metabolic rate, fat burn, blood sugar levels, and appetite.",
      zh: "一项短期研究，探讨不同食品和饮料如何影响代谢率、脂肪燃烧、血糖水平和食欲。",
    },
  });
}

export const dynamic = "force-dynamic";

export default async function NZFoodAndBeveragePage() {
  const layout = await getStudyLayoutForSlug("food-beverage");
  if (layout) {
    return <StudyLayoutView study={layout.study} blocks={layout.blocks} />;
  }
  const t = await getDictionary(await getServerLang());

  return (
    <>
      <Navbar />
        <StudyHero
          imageSrc="/food-bev.jpg"
          imageAlt={t.studies.foodBeverageStudyTitle}
          title={t.studies.foodBeveragePageTitle}
        />

        <StudyDetail
          status="Open"
          deadline={t.studies.foodBeverageDeadline}
          eligibility={[
            t.studies.eligibilityAge18To70,
            t.studies.eligibilityBmi18To30,
            t.studies.eligibilityAuckland,
            t.studies.foodBeverageEligibilityVisits,
          ]}
          joinHref="/contact"
          contactHref="/contact"
          content={
            <div>
              <ul>
                <li>
                  {t.studies.foodBeverageQuestion1}
                </li>
                <li>{t.studies.foodBeverageQuestion2}</li>
              </ul>
              <p>
                {t.studies.foodBeverageDescriptionText}
              </p>
            </div>
          }
        />    

      <Footer />
    </>
  );
}
