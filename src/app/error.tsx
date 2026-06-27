"use client";

import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

// Route-segment error boundary. Client component — renders inside the root
// layout, so LanguageProvider is available. Kept intentionally minimal (no
// Navbar/Footer) so a failure originating in shared chrome can't re-throw here.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isZh = useLanguage().lang === "ZH";

  useEffect(() => {
    // Surface the error for debugging (and any prod error reporting).
    console.error(error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="min-h-[60vh] flex flex-1 flex-col items-center justify-center bg-white px-6 text-center"
    >
      <h1 className="text-3xl font-extrabold text-[#0c0c48]">
        {isZh ? "出错了" : "Something went wrong"}
      </h1>
      <p className="mt-4 text-[#0c0c48]">
        {isZh ? "请稍后重试。" : "Please try again in a moment."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-full bg-[#0c0c48] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a4479] focus-visible:ring-offset-2"
      >
        {isZh ? "重试" : "Try again"}
      </button>
    </main>
  );
}
