"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaAsset } from "./MediaPicker";
import { primeMediaCache } from "./useMediaResolver";

type MediaUsage = {
  kind: "block" | "team" | "partner" | "study";
  label: string;
  pageSlug: string;
  pageTitle: string;
  blockType: string;
  blockId: number;
};

// "Managed" = a file this library owns on disk (under /uploads/media), so deleting
// it removes the file. Everything else (cataloged /public images) is a "site
// image": replaceable in place, but delete only clears the catalog entry.
function isManagedPath(filePath: string): boolean {
  return filePath.replace(/^\/+/, "").startsWith("uploads/media");
}

export default function MediaLibrary() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [usage, setUsage] = useState<MediaUsage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  // Load "where is this used" whenever the selected asset changes.
  useEffect(() => {
    const id = selected?.id;
    if (!id) {
      setUsage([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/media/${id}/usage`)
      .then((r) => (r.ok ? r.json() : { usage: [] }))
      .then((d) => {
        if (!cancelled) setUsage(Array.isArray(d.usage) ? d.usage : []);
      })
      .catch(() => {
        if (!cancelled) setUsage([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
        primeMediaCache(data);
      } else setError("Could not load media.");
    } catch {
      setError("Could not load media.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/media", { method: "POST", body: fd });
        if (res.ok) {
          const asset = (await res.json()) as MediaAsset;
          setAssets((prev) => {
            const next = [asset, ...prev];
            primeMediaCache(next);
            return next;
          });
        } else {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? "Upload failed.");
        }
      }
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function saveMetadata() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/media/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          altText: selected.altText,
          caption: selected.caption,
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as MediaAsset;
        setAssets((prev) => {
          const next = prev.map((a) => (a.id === updated.id ? updated : a));
          primeMediaCache(next);
          return next;
        });
        // Close the panel on a successful save so it's clear the change took effect.
        setSelected(null);
      } else {
        setError("Could not save changes.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteAsset(id: number, force = false) {
    if (!force) {
      const asset = assets.find((a) => a.id === id);
      const managed = asset ? isManagedPath(asset.filePath) : true;
      const message = managed
        ? "Delete this image permanently? This removes the file."
        : "Remove this site image from the library? The file in /public stays on the site (it may be referenced in code) — this only clears its catalog entry.";
      if (!window.confirm(message)) return;
    }
    const res = await fetch(`/api/admin/media/${id}${force ? "?force=1" : ""}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setAssets((prev) => {
        const next = prev.filter((a) => a.id !== id);
        primeMediaCache(next);
        return next;
      });
      setSelected((s) => (s?.id === id ? null : s));
      setError(null);
      return;
    }
    if (res.status === 409) {
      // In use — let the admin confirm a forced delete after the warning.
      const body = await res.json().catch(() => ({}));
      const count = Array.isArray(body.usage) ? body.usage.length : 0;
      if (
        window.confirm(
          `This image is used in ${count} place(s). Deleting it will leave those blocks without an image. Delete anyway?`,
        )
      ) {
        await deleteAsset(id, true);
      }
      return;
    }
    setError("Could not delete image.");
  }

  async function replaceAsset(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setReplacing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/media/${selected.id}/replace`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const updated = (await res.json()) as MediaAsset;
        setAssets((prev) => {
          const next = prev.map((a) => (a.id === updated.id ? updated : a));
          primeMediaCache(next);
          return next;
        });
        setSelected(updated);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Replace failed.");
      }
    } finally {
      setReplacing(false);
      if (replaceInput.current) replaceInput.current.value = "";
    }
  }

  const filtered = assets.filter((a) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      a.originalName.toLowerCase().includes(q) ||
      a.altText.toLowerCase().includes(q)
    );
  });

  const selectedManaged = selected ? isManagedPath(selected.filePath) : false;

  return (
    // At lg+ this is a fixed-height canvas: the toolbar/search stay in view and
    // the image grid scrolls in its own pane, so the details panel beside it
    // stays put — clicking an image never jumps the page to the top.
    // (5rem = the admin shell's vertical padding around this content.)
    <div className="lg:flex lg:h-[calc(100dvh_-_5rem)] lg:flex-col">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 lg:flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#0c0c48]">Media library</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and manage images. Stored images can be reused on any page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-[#0c0c48] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16166a] disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Upload images"}
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 lg:flex-shrink-0">
          {error}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or alt text…"
        className="mb-4 w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0c0c48] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0c0c48] lg:flex-shrink-0"
      />

      <div className="flex gap-6 lg:min-h-0 lg:flex-1">
        <div className="flex-1 lg:overflow-y-auto lg:pr-1">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400">
              {assets.length === 0
                ? "No images yet. Upload some to get started."
                : "No images match your search."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() =>
                    setSelected((cur) => (cur?.id === asset.id ? null : asset))
                  }
                  className={`overflow-hidden rounded-lg border text-left ${
                    selected?.id === asset.id
                      ? "border-[#0c0c48] ring-2 ring-[#0c0c48]/30"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  title={asset.originalName}
                >
                  <div className="flex h-28 items-center justify-center bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.filePath}
                      alt={asset.altText}
                      className="max-h-28 max-w-full object-contain"
                    />
                  </div>
                  <p className="truncate px-2 py-1 text-[11px] text-gray-500">
                    {asset.originalName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <aside
            className="w-72 flex-shrink-0 self-start rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:max-h-full lg:overflow-y-auto"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500">
                Image details
              </p>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close image details"
                title="Close"
                className="-mr-1 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="mb-3 flex h-40 items-center justify-center rounded-lg bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.filePath}
                alt={selected.altText}
                className="max-h-40 max-w-full object-contain"
              />
            </div>
            <p className="mb-2 break-all text-xs text-gray-400">
              {selected.filePath}
            </p>
            {selected.width != null && selected.height != null ? (
              <p className="mb-3 text-xs text-gray-400">
                {selected.width} × {selected.height} px
              </p>
            ) : null}
            {!selectedManaged && (
              <p
                className="mb-3 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
                title="A pre-existing file in /public. Replacing it updates everywhere it's used; deleting only removes this library entry — the file stays on the site."
              >
                Site image
              </p>
            )}
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Used in {usage.length} place{usage.length === 1 ? "" : "s"}
              </p>
              {usage.length > 0 && (
                <ul className="mt-1 max-h-24 list-disc overflow-y-auto pl-4 text-xs text-gray-500">
                  {usage.map((u) => (
                    <li
                      key={`${u.kind}-${u.blockId}`}
                      className="truncate"
                      title={u.label}
                    >
                      {u.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Alt text
            </label>
            <input
              type="text"
              value={selected.altText}
              onChange={(e) =>
                setSelected({ ...selected, altText: e.target.value })
              }
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0c0c48] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0c0c48]"
            />
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Caption
            </label>
            <textarea
              value={selected.caption}
              onChange={(e) =>
                setSelected({ ...selected, caption: e.target.value })
              }
              rows={2}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0c0c48] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0c0c48]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveMetadata}
                disabled={saving}
                className="flex-1 rounded-lg bg-[#0c0c48] px-3 py-2 text-sm font-semibold text-white hover:bg-[#16166a] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => replaceInput.current?.click()}
                disabled={replacing}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-[#0c0c48] hover:bg-gray-100 disabled:opacity-60"
              >
                {replacing ? "…" : "Replace"}
              </button>
              <button
                type="button"
                onClick={() => deleteAsset(selected.id)}
                title={
                  selectedManaged
                    ? "Delete image and file"
                    : "Remove from library (the file stays on the site)"
                }
                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                {selectedManaged ? "Delete" : "Remove"}
              </button>
            </div>
            <input
              ref={replaceInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              onChange={replaceAsset}
              className="hidden"
            />
          </aside>
        )}
      </div>
    </div>
  );
}
