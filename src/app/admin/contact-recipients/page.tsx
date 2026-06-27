"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Recipient = {
  id: number;
  category: string;
  email: string;
  labelEn: string;
  labelZh: string;
  order: number;
  isArchived: boolean;
};

type Draft = { labelEn: string; labelZh: string; email: string };

const inputClass =
  "px-4 py-2.5 border-2 border-[#cac7c7] rounded-2xl text-sm text-[#0c0c48] focus:outline-none focus:border-[#0a4479]";

export default function AdminContactRecipients() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busyCategory, setBusyCategory] = useState<string | null>(null);
  const [savedCategory, setSavedCategory] = useState<string | null>(null);
  const [newType, setNewType] = useState<Draft>({ labelEn: "", labelZh: "", email: "" });
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRecipients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/contact-recipients");
      if (!res.ok) throw new Error("Failed to load inquiry types");
      const data = await res.json();
      const arr: Recipient[] = Array.isArray(data) ? data : [];
      setRecipients(arr);
      // Preserve any in-progress edit; only seed a draft from the server when
      // the row has none yet, so a refetch after saving/reordering one row
      // can't wipe unsaved edits in the others. Drafts for removed rows drop.
      setDrafts((prev) => {
        const next: Record<string, Draft> = {};
        for (const r of arr) {
          next[r.category] = prev[r.category] ?? {
            labelEn: r.labelEn || r.category,
            labelZh: r.labelZh,
            email: r.email,
          };
        }
        return next;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipients();
    return () => {
      if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
    };
  }, [fetchRecipients]);

  // Single helper for every mutation: sets busy state, surfaces errors, and
  // refetches. Returns the parsed response on success (so callers can read
  // flags like `restored`), or null on failure. `path` targets a sub-route
  // (e.g. "/reorder"); `busyKey` is the row's category, or "" for non-row
  // actions (add/reorder) so it can never mark a real (non-empty) row busy.
  async function call(
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
    busyKey: string,
    path = "",
  ): Promise<Record<string, unknown> | null> {
    setBusyCategory(busyKey);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/contact-recipients${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "The request failed.");
      }
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      await fetchRecipients();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
    } finally {
      setBusyCategory(null);
    }
  }

  async function save(r: Recipient) {
    const draft = drafts[r.category];
    if (!draft) return;
    const data = await call(
      "PATCH",
      {
        category: r.category,
        labelEn: draft.labelEn,
        labelZh: draft.labelZh,
        email: draft.email,
      },
      r.category,
    );
    if (data) {
      if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
      setSavedCategory(r.category);
      savedTimerRef.current = setTimeout(
        () => setSavedCategory((prev) => (prev === r.category ? null : prev)),
        2500,
      );
    }
  }

  const active = recipients.filter((r) => !r.isArchived);
  const archived = recipients.filter((r) => r.isArchived);
  // Any in-flight mutation disables every reorder arrow, so two reorders can't
  // interleave and corrupt `order`.
  const anyBusy = busyCategory !== null;

  // Reorder via one atomic endpoint: send the full active order with the two
  // neighbours swapped. The server reindexes in a transaction, so orders stay
  // unique and a partial failure can't leave two rows sharing an order. Reuses
  // call() for the busy/error/refetch handling.
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= active.length) return;
    const order = active.map((r) => r.category);
    [order[index], order[target]] = [order[target], order[index]];
    await call("PATCH", { order }, "", "/reorder");
  }

  async function archive(r: Recipient) {
    if (
      !window.confirm(
        `Remove "${r.labelEn || r.category}" from the contact form? Existing submissions keep showing it; you can restore it later.`,
      )
    )
      return;
    await call("PATCH", { category: r.category, isArchived: true }, r.category);
  }

  async function restore(r: Recipient) {
    await call("PATCH", { category: r.category, isArchived: false }, r.category);
  }

  async function remove(r: Recipient) {
    if (
      !window.confirm(
        `Permanently delete "${r.labelEn || r.category}"? This only works when no submissions reference it.`,
      )
    )
      return;
    await call("DELETE", { category: r.category }, r.category);
  }

  async function addType(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const data = await call("POST", newType, "");
    setAdding(false);
    if (data) {
      // A re-added archived type is restored, not created — say so, since it
      // brings back the original's history and recipient routing.
      if (data.restored) {
        setNotice(
          `Restored “${newType.labelEn.trim()}” from the archive — it's active again.`,
        );
      }
      setNewType({ labelEn: "", labelZh: "", email: "" });
    }
  }

  function row(r: Recipient, index: number) {
    const draft = drafts[r.category] ?? { labelEn: "", labelZh: "", email: "" };
    const dirty =
      draft.labelEn !== (r.labelEn || r.category) ||
      draft.labelZh !== r.labelZh ||
      draft.email !== r.email;
    const busy = busyCategory === r.category;
    const justSaved = savedCategory === r.category;
    const setDraft = (patch: Partial<Draft>) =>
      setDrafts((prev) => ({
        ...prev,
        [r.category]: { ...draft, ...patch },
      }));

    return (
      <div key={r.id} className="px-6 py-5 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {!r.isArchived && (
            <div className="flex md:flex-col gap-1">
              <button
                onClick={() => move(index, -1)}
                disabled={anyBusy || index === 0}
                aria-label={`Move ${r.labelEn || r.category} up`}
                className="px-2 py-0.5 rounded-lg text-[#0a4479] bg-[#f5f5f7] hover:bg-[#0a4479]/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold"
              >
                ↑
              </button>
              <button
                onClick={() => move(index, 1)}
                disabled={anyBusy || index === active.length - 1}
                aria-label={`Move ${r.labelEn || r.category} down`}
                className="px-2 py-0.5 rounded-lg text-[#0a4479] bg-[#f5f5f7] hover:bg-[#0a4479]/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold"
              >
                ↓
              </button>
            </div>
          )}
          <div className="grid flex-1 gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-[#0a4479]/70 mb-1 ml-1">Label (English)</p>
              <input
                type="text"
                value={draft.labelEn}
                onChange={(e) => setDraft({ labelEn: e.target.value })}
                className={`${inputClass} w-full`}
                disabled={busy}
              />
            </div>
            <div>
              <p className="text-xs text-[#0a4479]/70 mb-1 ml-1">Label (中文)</p>
              <input
                type="text"
                value={draft.labelZh}
                onChange={(e) => setDraft({ labelZh: e.target.value })}
                className={`${inputClass} w-full`}
                disabled={busy}
              />
            </div>
            <div>
              <p className="text-xs text-[#0a4479]/70 mb-1 ml-1">Recipient email</p>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ email: e.target.value })}
                className={`${inputClass} w-full`}
                disabled={busy}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => save(r)}
              disabled={!dirty || busy}
              className="inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Saving..." : justSaved ? "Saved" : "Save"}
            </button>
            {r.isArchived ? (
              <>
                <button
                  onClick={() => restore(r)}
                  disabled={busy}
                  className="text-sm font-semibold text-[#0a4479] underline underline-offset-2 hover:text-[#083559] disabled:opacity-40"
                >
                  Restore
                </button>
                <button
                  onClick={() => remove(r)}
                  disabled={busy}
                  className="text-sm font-semibold text-red-600 underline underline-offset-2 hover:text-red-700 disabled:opacity-40"
                >
                  Delete
                </button>
              </>
            ) : (
              <button
                onClick={() => archive(r)}
                disabled={busy}
                className="text-sm font-semibold text-red-600 underline underline-offset-2 hover:text-red-700 disabled:opacity-40"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        {r.category !== draft.labelEn && (
          <p className="text-xs text-[#0a4479]/60 ml-1">
            Stored as “{r.category}” on existing submissions — renaming the
            label doesn’t affect them.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[2px] text-[#0a4479]/70">
          Contacts
        </p>
        <h1 className="text-4xl font-extrabold text-[#0c0c48] mt-1 tracking-tight">
          Inquiry types &amp; recipients
        </h1>
        <p className="text-[#0a4479]/80 mt-2 max-w-2xl">
          The contact form’s inquiry dropdown is built from this list. Each
          type routes submissions to its recipient inbox. Removing a type
          hides it from the form — existing submissions are kept.
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6">
          {error}
        </div>
      )}

      {notice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl mb-6">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-12 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-[#0a4479]/20 border-t-[#0a4479] animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] divide-y divide-[#0a4479]/10">
            {active.map((r, i) => row(r, i))}
            {active.length === 0 && (
              <p className="px-6 py-5 text-sm text-[#0a4479]/80">
                No active inquiry types — the contact form is disabled until
                one exists.
              </p>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] px-6 py-5">
            <h2 className="text-lg font-bold text-[#0c0c48] mb-3">
              Add inquiry type
            </h2>
            <form
              onSubmit={addType}
              className="flex flex-col md:flex-row gap-3 md:items-end"
            >
              <div className="grid flex-1 gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-[#0a4479]/70 mb-1 ml-1">
                    Label (English)
                  </p>
                  <input
                    type="text"
                    value={newType.labelEn}
                    onChange={(e) =>
                      setNewType((p) => ({ ...p, labelEn: e.target.value }))
                    }
                    placeholder="e.g. Media Enquiry"
                    className={`${inputClass} w-full`}
                    disabled={adding}
                  />
                </div>
                <div>
                  <p className="text-xs text-[#0a4479]/70 mb-1 ml-1">
                    Label (中文, optional)
                  </p>
                  <input
                    type="text"
                    value={newType.labelZh}
                    onChange={(e) =>
                      setNewType((p) => ({ ...p, labelZh: e.target.value }))
                    }
                    placeholder="e.g. 媒体咨询"
                    className={`${inputClass} w-full`}
                    disabled={adding}
                  />
                </div>
                <div>
                  <p className="text-xs text-[#0a4479]/70 mb-1 ml-1">
                    Recipient email
                  </p>
                  <input
                    type="email"
                    value={newType.email}
                    onChange={(e) =>
                      setNewType((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="inbox@auckland.ac.nz"
                    className={`${inputClass} w-full`}
                    disabled={adding}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={adding || !newType.labelEn.trim() || !newType.email.trim()}
                className="inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {adding ? "Adding..." : "Add type"}
              </button>
            </form>
          </section>

          {archived.length > 0 && (
            <section className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <h2 className="text-lg font-bold text-[#0c0c48] px-6 pt-5">
                Removed from the form
              </h2>
              <p className="text-sm text-[#0a4479]/70 px-6 pb-2">
                Hidden from visitors; their past submissions remain in Contact
                Submissions. Restore to bring one back.
              </p>
              <div className="divide-y divide-[#0a4479]/10">
                {archived.map((r, i) => row(r, i))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
