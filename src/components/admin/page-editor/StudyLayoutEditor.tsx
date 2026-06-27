"use client";

import { useState } from "react";
import PageEditor from "./PageEditor";
import type { EditorBlock } from "./SortableBlock";

export default function StudyLayoutEditor({
  studyId,
  studySlug,
  studyTitle,
  overrideSlug,
  initialBlocks,
}: {
  studyId: number;
  studySlug: string;
  studyTitle: string;
  overrideSlug: string;
  initialBlocks: EditorBlock[];
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveAsTemplate() {
    if (
      !window.confirm(
        "Apply this layout to every study that doesn't have its own custom layout?",
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/study-layouts/${studySlug}`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      setMessage(
        res.ok
          ? "Saved. This layout now applies to all studies without their own override."
          : body.error ?? "Could not save the template.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetToTemplate() {
    if (
      !window.confirm(
        "Clear this study's custom layout? It will then use the shared template (or the site's built-in default if there is no template). Your blocks for this study will be removed.",
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/study-layouts/${studySlug}`, {
        method: "DELETE",
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      setMessage("Could not reset the layout.");
    } finally {
      setBusy(false);
    }
  }

  async function resetToOriginal() {
    if (
      !window.confirm(
        "Replace this study's layout with the original built-in design? This always works — even if the shared template has been changed or removed.",
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/study-layouts/${studySlug}/reset-original`,
        { method: "POST" },
      );
      if (res.ok) {
        window.location.reload();
        return;
      }
      setMessage("Could not restore the original layout.");
    } finally {
      setBusy(false);
    }
  }

  const headerExtra = (
    <>
      <button
        type="button"
        onClick={saveAsTemplate}
        disabled={busy}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-[#0c0c48] hover:bg-gray-100 disabled:opacity-60"
      >
        Save as template
      </button>
      <button
        type="button"
        onClick={resetToTemplate}
        disabled={busy}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-[#0c0c48] hover:bg-gray-100 disabled:opacity-60"
      >
        Reset to shared template
      </button>
      <button
        type="button"
        onClick={resetToOriginal}
        disabled={busy}
        className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
      >
        Reset to original default
      </button>
    </>
  );

  return (
    <div>
      <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-[#0a4479]">
        Blocks here render this study&apos;s live data. &ldquo;Save as
        template&rdquo; applies this arrangement to studies without their own.
        &ldquo;Reset to shared template&rdquo; clears this study&apos;s blocks so
        it follows the template; &ldquo;Reset to original default&rdquo; always
        restores the built-in design, even if the template has been changed.
      </p>
      {message && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-[#0c0c48]">
          {message}
        </div>
      )}
      <PageEditor
        slug={overrideSlug}
        title={`Layout: ${studyTitle}`}
        initialBlocks={initialBlocks}
        scope="study"
        backHref={`/admin/studies/${studyId}`}
        backLabel="← Back to study"
        viewHref={`/studies/${studySlug}`}
        previewHref={`/studies/${studySlug}`}
        headerExtra={headerExtra}
        fillViewport={false}
      />
    </div>
  );
}
