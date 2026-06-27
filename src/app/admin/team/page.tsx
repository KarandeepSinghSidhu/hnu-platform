"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TeamMember = {
  id: number;
  name: string;
  title: string;
  section: string;
  isVisible: boolean;
  order: number;
  photoPath: string;
};

const SECTION_LABELS: Record<string, string> = {
  BoardOfDirectors: "Board of Directors",
  ResearchTeam: "Research Team",
  Alumni: "Alumni",
};

export default function AdminTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/team");
      if (!res.ok) throw new Error("Failed to fetch team members");
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function toggleVisible(id: number, current: boolean) {
    const next = !current;
    setError(null);
    // Optimistically flip just this member in place. Refetching would set
    // loading=true and swap the whole list for the spinner, collapsing the
    // page height and snapping the scroll back to the top.
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isVisible: next } : m)),
    );
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: next }),
      });
      if (!res.ok) throw new Error("Failed to update team member");
    } catch (err) {
      console.error(err);
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isVisible: current } : m)),
      );
      setError("Failed to update team member.");
    }
  }

  async function deleteMember(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setError(null);
    // Optimistically drop the row so the list doesn't reload and jump. On
    // failure, re-insert just this row at its original spot rather than
    // restoring a whole-list snapshot, so any other in-flight edit is kept.
    const index = members.findIndex((m) => m.id === id);
    const removed = members[index];
    setMembers((cur) => cur.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/admin/team/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete team member");
    } catch (err) {
      console.error(err);
      if (removed) {
        setMembers((cur) => {
          const next = [...cur];
          next.splice(Math.min(index, next.length), 0, removed);
          return next;
        });
      }
      setError("Failed to delete team member.");
    }
  }

  const grouped = members.reduce<Record<string, TeamMember[]>>((acc, m) => {
    if (!acc[m.section]) acc[m.section] = [];
    acc[m.section].push(m);
    return acc;
  }, {});

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[2px] text-[#0a4479]/70">
            Team
          </p>
          <h1 className="text-4xl font-extrabold text-[#0c0c48] mt-1 tracking-tight">
            Team members
          </h1>
        </div>
        <Link
          href="/admin/team/new"
          className="inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors w-fit"
        >
          + Add team member
        </Link>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState
          message="No team members yet."
          actionHref="/admin/team/new"
          actionLabel="Add the first team member"
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([section, sectionMembers]) => (
            <section
              key={section}
              className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden"
            >
              <header className="px-6 py-4 border-b border-[#0a4479]/10">
                <h2 className="text-lg font-bold text-[#0c0c48]">
                  {SECTION_LABELS[section] || section}
                </h2>
                <p className="text-xs text-[#0a4479]/70 mt-0.5">
                  {sectionMembers.length}{" "}
                  {sectionMembers.length === 1 ? "member" : "members"}
                </p>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#f5f5f7] text-[#0a4479]/80">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Order</th>
                      <th className="px-6 py-3 text-left font-semibold">Name</th>
                      <th className="px-6 py-3 text-left font-semibold">Title</th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Visibility
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0a4479]/5">
                    {sectionMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-[#f5f5f7]">
                        <td className="px-6 py-3 text-[#0a4479]/70 font-medium">
                          {member.order}
                        </td>
                        <td className="px-6 py-3 font-semibold text-[#0c0c48]">
                          {member.name}
                        </td>
                        <td className="px-6 py-3 text-[#0a4479]/80">
                          {member.title}
                        </td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() =>
                              toggleVisible(member.id, member.isVisible)
                            }
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                              member.isVisible
                                ? "bg-[#0a4479]/10 text-[#0a4479] hover:bg-[#0a4479]/20"
                                : "bg-[#0c0c48]/5 text-[#0c0c48]/60 hover:bg-[#0c0c48]/10"
                            }`}
                          >
                            {member.isVisible ? "Visible" : "Hidden"}
                          </button>
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/team/${member.id}`}
                            className="text-[#0a4479] hover:underline font-semibold mr-4"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => deleteMember(member.id, member.name)}
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
