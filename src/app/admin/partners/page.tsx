"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Partner = {
  id: number;
  name: string;
  logoPath: string;
  websiteUrl: string;
  isPlaceholder: boolean;
  group: string;
  order: number;
};

const GROUP_LABELS: Record<string, string> = {
  Collaborating: "Collaborating partners",
  Industry: "Industry partners",
};

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  async function fetchPartners() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/partner-logos");
      if (!res.ok) throw new Error("Failed to fetch partners");
      const data = await res.json();
      setPartners(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function deletePartner(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/partner-logos/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete partner");
      await fetchPartners();
    } catch (err) {
      console.error(err);
    }
  }

  const grouped = partners.reduce<Record<string, Partner[]>>((acc, p) => {
    const key = p.group || "Collaborating";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[2px] text-[#0a4479]/70">
            Partners
          </p>
          <h1 className="text-4xl font-extrabold text-[#0c0c48] mt-1 tracking-tight">
            Partner logos
          </h1>
        </div>
        <Link
          href="/admin/partners/new"
          className="inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors w-fit"
        >
          + Add partner
        </Link>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : partners.length === 0 ? (
        <EmptyState
          message="No partners yet."
          actionHref="/admin/partners/new"
          actionLabel="Add the first partner"
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([group, groupPartners]) => (
            <section
              key={group}
              className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden"
            >
              <header className="px-6 py-4 border-b border-[#0a4479]/10">
                <h2 className="text-lg font-bold text-[#0c0c48]">
                  {GROUP_LABELS[group] || group}
                </h2>
                <p className="text-xs text-[#0a4479]/70 mt-0.5">
                  {groupPartners.length}{" "}
                  {groupPartners.length === 1 ? "partner" : "partners"}
                </p>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#f5f5f7] text-[#0a4479]/80">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Order</th>
                      <th className="px-6 py-3 text-left font-semibold">Logo</th>
                      <th className="px-6 py-3 text-left font-semibold">Name</th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Website
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0a4479]/5">
                    {groupPartners.map((partner) => (
                      <tr key={partner.id} className="hover:bg-[#f5f5f7]">
                        <td className="px-6 py-3 text-[#0a4479]/70 font-medium">
                          {partner.order}
                        </td>
                        <td className="px-6 py-3">
                          {partner.logoPath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={partner.logoPath}
                              alt={partner.name}
                              className="h-10 w-auto max-w-[120px] object-contain"
                            />
                          ) : (
                            <span className="text-[#0a4479]/40 text-xs italic">
                              No logo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 font-semibold text-[#0c0c48]">
                          {partner.name}
                        </td>
                        <td className="px-6 py-3 text-[#0a4479]/80 max-w-xs truncate">
                          {partner.websiteUrl ? (
                            <a
                              href={partner.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {partner.websiteUrl}
                            </a>
                          ) : (
                            <span className="text-[#0a4479]/40 italic">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/partners/${partner.id}`}
                            className="text-[#0a4479] hover:underline font-semibold mr-4"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() =>
                              deletePartner(partner.id, partner.name)
                            }
                            className="text-red-600 hover:text-red-800 font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-12 flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-[#0a4479]/20 border-t-[#0a4479] animate-spin" />
    </div>
  );
}

function EmptyState({
  message,
  actionHref,
  actionLabel,
}: {
  message: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-12 text-center">
      <p className="text-[#0a4479]/80 mb-5">{message}</p>
      <Link
        href={actionHref}
        className="inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
