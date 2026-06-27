"use client";

import { useState } from "react";
import PageEditor from "./PageEditor";
import type { EditorBlock } from "./SortableBlock";
import { STUDY_TEMPLATE_SLUG } from "@/components/blocks/study/study-slugs";

export type StudyTemplateStatus = {
  id: number;
  title: string;
  state: "Custom override" | "On template" | "Built-in default";
};

const BADGE: Record<StudyTemplateStatus["state"], string> = {
  "Custom override": "bg-amber-100 text-amber-800",
  "On template": "bg-green-100 text-green-800",
  "Built-in default": "bg-gray-100 text-gray-600",
};

export default function StudyTemplateEditor({
  initialBlocks,
  studies,
}: {
  initialBlocks: EditorBlock[];
  studies: StudyTemplateStatus[];
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resetTemplateToOriginal() {
    if (
      !window.confirm(
        "Replace the SHARED TEMPLATE with the original built-in design? This affects every study that follows the template (not those with their own custom layout).",
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        "/api/admin/study-layouts/__default__/reset-original",
        { method: "POST" },
      );
      if (res.ok) {
        window.location.reload();
        return;
      }
      setMessage("Could not reset the template.");
    } finally {
      setBusy(false);
    }
  }

  const headerExtra = (
    <button
      type="button"
      onClick={resetTemplateToOriginal}
      disabled={busy}
      className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
    >
      Reset template to original default
    </button>
  );

  return (
    <div>
      <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-[#0a4479]">
        This is the shared study layout template. It applies to every study that
        doesn&apos;t have its own custom layout, so editing here changes all of
        those at once. &ldquo;Reset template to original default&rdquo; always
        restores the built-in design.
      </p>
      {message && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-[#0c0c48]">
          {message}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Studies
        </h2>
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          {studies.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2">
              <a
                href={`/admin/studies/${s.id}/layout`}
                className="truncate text-[#0c0c48] hover:underline"
              >
                {s.title}
              </a>
              <span
                className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${BADGE[s.state]}`}
              >
                {s.state}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <PageEditor
        slug={STUDY_TEMPLATE_SLUG}
        title="Shared study template"
        initialBlocks={initialBlocks}
        scope="study"
        backHref="/admin/studies"
        backLabel="← Back to studies"
        headerExtra={headerExtra}
        fillViewport={false}
      />
    </div>
  );
}
