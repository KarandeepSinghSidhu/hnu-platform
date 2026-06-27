import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getServerLang } from "@/lib/lang";

// Branded bilingual 404. Server component — renders within the root layout, so
// the language providers (Navbar/Footer) and the #main-content skip target are
// available. notFound() is already called for missing/inactive studies.
export default async function NotFound() {
  const isZh = (await getServerLang()) === "ZH";
  return (
    <>
      <Navbar />
      <main
        id="main-content"
        className="bg-white flex flex-1 flex-col items-center justify-center py-32 px-6 text-center"
      >
        <p className="text-[#1f2bd4] font-semibold tracking-widest uppercase">404</p>
        <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold text-[#0c0c48]">
          {isZh ? "页面未找到" : "Page not found"}
        </h1>
        <p className="mt-4 max-w-xl text-[#0c0c48]">
          {isZh
            ? "抱歉，您访问的页面不存在或已被移动。"
            : "Sorry, the page you’re looking for doesn’t exist or has moved."}
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-[#0c0c48] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a4479] focus-visible:ring-offset-2"
        >
          {isZh ? "返回首页" : "Back to home"}
        </Link>
      </main>
      <Footer />
    </>
  );
}
