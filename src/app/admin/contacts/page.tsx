"use client";

import { useEffect, useMemo, useState } from "react";

type Submission = {
  id: number;
  name: string;
  email: string; // "" when the enquirer gave a phone number instead
  phone: string | null;
  prefersPhone: boolean;
  category: string;
  message: string;
  submittedAt: string;
};

const ALL = "All";

export default function AdminContacts() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(ALL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/contacts");
        if (!res.ok) throw new Error("Failed to fetch contact submissions");
        const data = await res.json();
        if (!cancelled) {
          setSubmissions(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(submissions.map((s) => s.category));
    return [ALL, ...Array.from(set).sort()];
  }, [submissions]);

  const filtered = useMemo(() => {
    if (filter === ALL) return submissions;
    return submissions.filter((s) => s.category === filter);
  }, [submissions, filter]);

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[2px] text-[#0a4479]/70">
          Contacts
        </p>
        <h1 className="text-4xl font-extrabold text-[#0c0c48] mt-1 tracking-tight">
          Contact submissions
        </h1>
        <p className="text-[#0a4479]/80 mt-2 max-w-2xl">
          Inbound messages from the public contact form, newest first.
          Read-only — replies are sent from the inbox configured for the
          inquiry type in <strong>Contact Recipients</strong>.
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6">
          {error}
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <header className="flex flex-wrap items-center gap-2 px-6 py-4 border-b border-[#0a4479]/10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                filter === cat
                  ? "bg-[#0a4479] text-white"
                  : "bg-[#f5f5f7] text-[#0a4479] hover:bg-[#0a4479]/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </header>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full border-2 border-[#0a4479]/20 border-t-[#0a4479] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[#0a4479]/80">
            {submissions.length === 0
              ? "No contact submissions yet."
              : "No submissions in this category."}
          </div>
        ) : (
          <ul className="divide-y divide-[#0a4479]/10">
            {filtered.map((s) => (
              <li
                key={s.id}
                className="px-6 py-5 hover:bg-[#f5f5f7] transition-colors"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                  <p className="text-base font-bold text-[#0c0c48]">
                    {s.name}
                  </p>
                  {s.email && (
                    <a
                      href={`mailto:${s.email}`}
                      className="text-sm text-[#0a4479] hover:underline"
                    >
                      {s.email}
                    </a>
                  )}
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      className="text-sm text-[#0a4479] hover:underline"
                    >
                      {s.phone}
                    </a>
                  )}
                  {s.prefersPhone && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      prefers phone
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0a4479]/10 text-[#0a4479]">
                    {s.category}
                  </span>
                  <p className="ml-auto text-xs text-[#0a4479]/70">
                    {new Date(s.submittedAt).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-[#0c0c48] whitespace-pre-wrap">
                  {s.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
