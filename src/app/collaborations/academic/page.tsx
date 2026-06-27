import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { renderPageBlocks } from "@/components/blocks/render-page";
import { buildPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: "/collaborations/academic",
    title: { en: "Academic Partners", zh: "学术合作伙伴" },
    description: {
      en: "Research collaborations and partnerships with industry and academic units, nationally and internationally.",
      zh: "与国内外学术单位开展研究合作与伙伴关系。",
    },
  });
}

export const dynamic = "force-dynamic";

export default async function AcademicPartnersPage() {
  return (
    <>
      <Navbar />
      {await renderPageBlocks("collaborations-academic")}
      <Footer />
    </>
  );
}
