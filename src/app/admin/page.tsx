"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  studies: number;
  teamMembers: number;
  partners: number;
  publications: number;
  pendingPublications: number;
  contactSubmissions: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    studies: 0,
    teamMembers: 0,
    partners: 0,
    publications: 0,
    pendingPublications: 0,
    contactSubmissions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        const data = res.ok ? await res.json() : {};
        if (cancelled) return;
        setStats({
          studies: data.studies ?? 0,
          teamMembers: data.teamMembers ?? 0,
          partners: data.partners ?? 0,
          publications: data.publications ?? 0,
          pendingPublications: data.pendingPublications ?? 0,
          contactSubmissions: data.contactSubmissions ?? 0,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: Array<{
    title: string;
    count: number;
    href: string;
    helper?: string;
  }> = [
    { title: "Studies", count: stats.studies, href: "/admin/studies" },
    { title: "Team members", count: stats.teamMembers, href: "/admin/team" },
    // Partners (Option A): the /admin/partners section is retired from the UI.
    // Partner logos are managed as page-builder image blocks on the standalone
    // grid pages; the stat is no longer surfaced here.
    {
      title: "Publications",
      count: stats.publications,
      href: "/admin/publications",
      helper:
        stats.pendingPublications > 0
          ? `${stats.pendingPublications} pending approval`
          : "All reviewed",
    },
    {
      title: "Contact submissions",
      count: stats.contactSubmissions,
      href: "/admin/contacts",
    },
  ];

  return (
    <div>
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[2px] text-[#0a4479]/70">
          Overview
        </p>
        <h1 className="text-4xl font-extrabold text-[#0c0c48] mt-1 tracking-tight">
          Dashboard
        </h1>
        <p className="text-[#0a4479]/80 mt-2">
          Manage content shown across the public site.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group block bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] transition-shadow"
          >
            <p className="text-sm font-medium text-[#0a4479]/70 group-hover:text-[#0a4479]">
              {card.title}
            </p>
            <p className="mt-2 text-4xl font-extrabold text-[#0c0c48]">
              {loading ? (
                <span className="inline-block h-9 w-12 rounded bg-[#0a4479]/10 animate-pulse" />
              ) : (
                card.count
              )}
            </p>
            {card.helper && (
              <p className="mt-2 text-xs text-[#0a4479]/70">{card.helper}</p>
            )}
          </Link>
        ))}
      </section>

      <section className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6">
        <h2 className="text-xl font-bold text-[#0c0c48] mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickAction href="/admin/studies/new">Add a study</QuickAction>
          <QuickAction href="/admin/team/new">Add a team member</QuickAction>
          <QuickAction href="/admin/publications">
            Review publications
          </QuickAction>
          <QuickAction href="/admin/contact-recipients">
            Edit contact emails
          </QuickAction>
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-3 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors"
    >
      {children}
    </Link>
  );
}
