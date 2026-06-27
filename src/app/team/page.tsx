import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { renderPageBlocks } from "@/components/blocks/render-page";
import { buildPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: "/team",
    title: { en: "Our Team", zh: "我们的团队" },
    description: {
      en: "Meet the people behind the Human Nutrition Unit — our board of directors and research team.",
      zh: "认识 Human Nutrition Unit 背后的团队，包括董事会和研究团队。",
    },
  });
}

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  return (
    <>
      <Navbar />
      {await renderPageBlocks("team")}
      <Footer />
    </>
  );
}
