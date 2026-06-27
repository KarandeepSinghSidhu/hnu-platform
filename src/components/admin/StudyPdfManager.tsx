"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StudyPdf = {
  id: number;
  studyId: number;
  title: string;
  fileName: string;
  order: number;
  uploadedAt: string;
};

export default function StudyPdfManager({ studyId }: { studyId: number }) {
  const [pdfs, setPdfs] = useState<StudyPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/studies/${studyId}/pdfs`);
      if (!res.ok) throw new Error("Failed to load PDFs");
      const data = await res.json();
      setPdfs(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PDFs");
    } finally {
      setLoading(false);
    }
  }, [studyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF file to upload.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("order", String(order));
    formData.append("file", file);

    try {
      setUploading(true);
      setError(null);
      const res = await fetch(`/api/admin/studies/${studyId}/pdfs`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Upload failed");
      }
      setTitle("");
      setOrder(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(pdfId: number, pdfTitle: string) {
    if (!confirm(`Delete "${pdfTitle}"? This removes the file.`)) return;
    try {
      const res = await fetch(
        `/api/admin/studies/${studyId}/pdfs/${pdfId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Delete failed");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-8 max-w-3xl mt-8">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-[#0c0c48]">Downloadable PDFs</h2>
        <p className="text-sm text-[#0a4479]/80 mt-1">
          Attach participant info sheets, consent forms, or other PDFs. They
          appear as a download list on the study page.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-4"
        >
          {error}
        </div>
      )}

      <div className="border border-[#0a4479]/10 rounded-2xl divide-y divide-[#0a4479]/10 mb-6">
        {loading ? (
          <div className="p-6 text-sm text-[#0a4479]/70">Loading…</div>
        ) : pdfs.length === 0 ? (
          <div className="p-6 text-sm text-[#0a4479]/70">
            No PDFs uploaded yet.
          </div>
        ) : (
          pdfs.map((pdf) => (
            <div
              key={pdf.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-[#0c0c48] truncate">
                  {pdf.title}
                </p>
                <p className="text-xs text-[#0a4479]/70 mt-0.5">
                  Order: {pdf.order} · Uploaded{" "}
                  {new Date(pdf.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <a
                  href={`/api/studies/pdf/${pdf.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0a4479] hover:underline font-semibold text-sm"
                >
                  View
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(pdf.id, pdf.title)}
                  className="text-red-600 hover:text-red-800 font-semibold text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label
            htmlFor="pdf-title"
            className="block text-sm font-semibold text-[#0c0c48] mb-2"
          >
            Title <span className="text-red-600">*</span>
          </label>
          <input
            id="pdf-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Participant Information Sheet"
            className="w-full px-4 py-2.5 bg-white border-2 border-[#cac7c7] rounded-2xl text-base text-[#0c0c48] placeholder:text-[#8e8d8d] focus:outline-none focus:border-[#0a4479] transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="pdf-order"
            className="block text-sm font-semibold text-[#0c0c48] mb-2"
          >
            Order
          </label>
          <input
            id="pdf-order"
            type="number"
            step={1}
            value={order}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isNaN(next)) {
                setOrder(0);
                return;
              }
              setOrder(next);
            }}
            className="w-full px-4 py-2.5 bg-white border-2 border-[#cac7c7] rounded-2xl text-base text-[#0c0c48] focus:outline-none focus:border-[#0a4479] transition-colors"
          />
          <p className="text-xs text-[#0a4479]/70 mt-1.5">
            Lower values appear first in the download list.
          </p>
        </div>

        <div>
          <label
            htmlFor="pdf-file"
            className="block text-sm font-semibold text-[#0c0c48] mb-2"
          >
            PDF file <span className="text-red-600">*</span>
          </label>
          <input
            id="pdf-file"
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="block w-full text-sm text-[#0c0c48] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#0a4479] file:text-white hover:file:bg-[#083559] file:cursor-pointer"
          />
          <p className="text-xs text-[#0a4479]/70 mt-1.5">Max 20MB.</p>
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="inline-flex items-center justify-center bg-[#0a4479] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading…" : "Upload PDF"}
        </button>
      </form>
    </div>
  );
}
