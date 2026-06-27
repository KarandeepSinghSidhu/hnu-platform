import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { renderPageBlocks } from "@/components/blocks/render-page";
import { buildPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: "/",
    title: { en: "Home", zh: "首页" },
    description: {
      en: "The Human Nutrition Unit Homepage",
      zh: "Human Nutrition Unit 首页。",
    },
  });
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <>
      <Navbar />
      {await renderPageBlocks("home")}
      <Footer />
    </>
  );
}