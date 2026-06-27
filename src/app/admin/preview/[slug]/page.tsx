import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { renderPageBlocks } from "@/components/blocks/render-page";

// Admin-only draft preview of a page (gated by the /admin middleware, and the
// admin shell is bypassed in admin/layout.tsx). Renders the live/draft blocks
// with the real public chrome so editors can see unpublished changes before
// publishing — opened full-width in its own tab from the editor's "Show preview".
export const dynamic = "force-dynamic";

export default async function PagePreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <>
      {/* Make it unmistakable this is an unpublished draft, not the live site. */}
      <div className="sticky top-0 z-[100] flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-950">
        <span aria-hidden="true">●</span>
        Draft preview — unpublished changes. This is not the live published page.
      </div>
      <Navbar />
      {await renderPageBlocks(slug, { draft: true })}
      <Footer />
    </>
  );
}
