import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { renderPageBlocks } from "@/components/blocks/render-page";
import { buildPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: "/collaborations",
    title: { en: "Collaborations", zh: "合作" },
    description: {
      en: "Research collaborations and partnerships with industry and academic units, nationally and internationally.",
      zh: "与国内外行业机构和学术单位开展研究合作与伙伴关系。",
    },
  });
}

export const dynamic = "force-dynamic";

export default async function CollaborationsPage() {
  return (
    <>
      <Navbar />
      {await renderPageBlocks("collaborations")}
      <Footer />
    </>
  );
}
