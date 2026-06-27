"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Study = {
  id: number;
  slug: string;
  title: string;
  shortDescription: string;
  status: string;
  isActive: boolean;
  category: string;
  order: number;
  imagePath: string;
  publishedAt: string | null;
};

const STATUS_COLOURS: Record<string, string> = {
  Recruiting: "bg-emerald-100 text-emerald-800",
  Active: "bg-[#0a4479]/15 text-[#0a4479]",
  Completed: "bg-[#0c0c48]/10 text-[#0c0c48]/70",
};

export default function AdminStudies() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudies();
  }, []);

  async function fetchStudies() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/studies");
      if (!res.ok) throw new Error("Failed to fetch studies");
      const data = await res.json();
      setStudies(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: number, current: boolean) {
    try {
      const res = await fetch(`/api/admin/studies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error("Failed to update study");
      await fetchStudies();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteStudy(id: number, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/studies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete study");
      await fetchStudies();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[2px] text-[#0a4479]/70">
            Studies
          </p>
          <h1 className="text-4xl font-extrabold text-[#0c0c48] mt-1 tracking-tight">
            Studies
          </h1>
          <p className="text-[#0a4479]/80 mt-2">
            Recruitment status, eligibility, REDCap links, and bilingual copy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/studies/template"
            className="inline-flex items-center justify-center border border-[#0a4479]/30 text-[#0a4479] px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#0a4479]/5 transition-colors w-fit"
          >
            Edit shared template
          </Link>
          <Link
            href="/admin/studies/new"
            className="inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors w-fit"
          >
            + Add study
          </Link>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : studies.length === 0 ? (
        <EmptyState
          message="No studies yet."
          actionHref="/admin/studies/new"
          actionLabel="Add the first study"
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f5f5f7] text-[#0a4479]/80">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Order</th>
                  <th className="px-6 py-3 text-left font-semibold">Title</th>
                  <th className="px-6 py-3 text-left font-semibold">Slug</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Visibility
                  </th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0a4479]/5">
                {studies.map((study) => (
                  <tr key={study.id} className="hover:bg-[#f5f5f7]">
                    <td className="px-6 py-3 text-[#0a4479]/70 font-medium">
                      {study.order}
                    </td>
                    <td className="px-6 py-3 font-semibold text-[#0c0c48]">
                      {study.title}
                      {study.shortDescription && (
                        <p className="text-xs font-normal text-[#0a4479]/70 mt-0.5 max-w-md">
                          {study.shortDescription}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-[#0a4479]/80 font-mono text-xs">
                      {study.slug}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOURS[study.status] || STATUS_COLOURS.Completed}`}
                      >
                        {study.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => toggleActive(study.id, study.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          study.isActive
                            ? "bg-[#0a4479]/10 text-[#0a4479] hover:bg-[#0a4479]/20"
                            : "bg-[#0c0c48]/5 text-[#0c0c48]/60 hover:bg-[#0c0c48]/10"
                        }`}
                      >
                        {study.isActive ? "Visible" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/studies/${study.id}`}
                        className="text-[#0a4479] hover:underline font-semibold mr-4"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/studies/${study.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0a4479]/80 hover:underline font-semibold mr-4"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => deleteStudy(study.id, study.title)}
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
