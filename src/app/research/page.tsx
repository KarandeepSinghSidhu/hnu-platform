import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { renderPageBlocks } from "@/components/blocks/render-page";
import { buildPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: "/research",
    title: { en: "Our Research", zh: "我们的研究" },
    description: {
      en: "Better health through nutrition science. Explore our research in diet, disease, and clinical trials.",
      zh: "通过营养科学促进健康。探索我们在饮食、疾病与临床试验方面的研究。",
    },
  });
}

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  return (
    <>
      <Navbar />
      {await renderPageBlocks("research")}
      <Footer />
    </>
  );
}
