"use client";

import { useRef, useState } from "react";

export type StagedPdf = { title: string; file: File };

// Client-side PDF staging for the *new* study page: a study id doesn't exist yet,
// so files are collected here and uploaded once the study is created. (The edit
// page uses StudyPdfManager, which talks to the server directly against an id.)
export default function StudyPdfStager({
  pdfs,
  onChange,
}: {
  pdfs: StagedPdf[];
  onChange: (next: StagedPdf[]) => void;
}) {
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function add() {
    const file = fileRef.current?.files?.[0];
    if (!file || !title.trim()) return;
    onChange([...pdfs, { title: title.trim(), file }]);
    setTitle("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-[#0c0c48]">
        Downloadable PDFs
      </p>
      <p className="mb-3 text-xs text-[#0a4479]/70">
        Optional. Attach participant info sheets or consent forms — they upload
        when you create the study.
      </p>

      {pdfs.length > 0 && (
        <ul className="mb-3 divide-y divide-[#0a4479]/10 rounded-2xl border border-[#0a4479]/10">
          {pdfs.map((pdf, i) => (
            <li
              key={`${pdf.title}-${i}`}
              className="flex items-center justify-between gap-4 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#0c0c48]">
                  {pdf.title}
                </p>
                <p className="truncate text-xs text-[#0a4479]/70">
                  {pdf.file.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange(pdfs.filter((_, idx) => idx !== i))}
                className="flex-shrink-0 text-sm font-semibold text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="PDF title (e.g. Participant Information Sheet)"
          className="flex-1 rounded-2xl border-2 border-[#cac7c7] px-4 py-2.5 text-base text-[#0c0c48] placeholder:text-[#8e8d8d] focus:border-[#0a4479] focus:outline-none"
        />
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="block text-sm text-[#0c0c48] file:mr-3 file:rounded-full file:border-0 file:bg-[#0a4479] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#083559]"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-full border-2 border-[#0a4479]/20 px-4 py-2 text-sm font-semibold text-[#0a4479] hover:bg-[#0a4479]/5"
        >
          Add PDF
        </button>
      </div>
    </div>
  );
}
