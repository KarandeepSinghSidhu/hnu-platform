import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPagesListPage() {
  const pages = await prisma.page.findMany({
    where: {
      // "studies" is being reworked directly on the public site — hide it from
      // the page editor so content editors don't change it here.
      slug: { not: "studies" },
      NOT: { slug: { startsWith: "studylayout-" } },
    },
    orderBy: { slug: "asc" },
    include: { _count: { select: { blocks: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0c0c48]">Pages</h1>
      <p className="mt-1 text-sm text-gray-500">
        Edit, reorder, and add content sections on each public page.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <Link
            key={page.id}
            href={`/admin/pages/${page.slug}`}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#0c0c48] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[#0c0c48]">
              {page.title}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">/{page.slug}</p>
            <p className="mt-3 text-sm text-gray-500">
              {page._count.blocks} section
              {page._count.blocks === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
      </div>

      {pages.length === 0 && (
        <p className="mt-6 text-sm text-gray-400">
          No pages found. Run <code>npm run seed:pages</code> to populate them.
        </p>
      )}
    </div>
  );
}
