"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { getBlockDefinition } from "@/lib/blocks/registry";
import { serializeBlockContent } from "@/lib/blocks/validate";
import type { BlockScope } from "@/lib/blocks/types";
import { publicPath } from "@/lib/blocks/page-paths";
import SortableBlock, { type EditorBlock } from "./SortableBlock";
import AddBlockButton from "./AddBlockButton";

type RevisionMeta = {
  id: number;
  label: string | null;
  createdAt: string;
  blockCount: number;
};

export default function PageEditor({
  slug,
  title,
  initialBlocks,
  scope = "page",
  backHref = "/admin/pages",
  backLabel = "← All pages",
  viewHref,
  previewHref,
  headerExtra,
  publishable = false,
  publishedAt = null,
  initialDirty = false,
  fillViewport = true,
}: {
  slug: string;
  title: string;
  initialBlocks: EditorBlock[];
  scope?: "page" | "study";
  backHref?: string;
  backLabel?: string;
  viewHref?: string;
  /** Public URL shown in the in-editor live-preview pane. Omit to hide preview. */
  previewHref?: string;
  headerExtra?: ReactNode;
  /** When true, edits are a draft until "Publish"; shows the publish/history bar. */
  publishable?: boolean;
  /** ISO timestamp of the last publish, or null if never published. */
  publishedAt?: string | null;
  /** Whether the draft already differs from the published version on load. */
  initialDirty?: boolean;
  /**
   * When true (the default), the editor fills the viewport as a fixed-height
   * "canvas": the toolbar stays in view while the block list scrolls and the
   * preview stays pinned beside it. Set false when the editor is rendered below
   * other content (e.g. the study builders), so it falls back to natural flow.
   */
  fillViewport?: boolean;
}) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(initialBlocks);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Draft/publish state (only meaningful when `publishable`).
  const [dirty, setDirty] = useState(initialDirty);
  const [publishedAtState, setPublishedAtState] = useState(publishedAt);
  const [publishing, setPublishing] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState<RevisionMeta[] | null>(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [rebaselining, setRebaselining] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  // Call after any successful block mutation: for publishable pages, mark the
  // draft as having unpublished changes. (The preview opens in its own tab, so
  // there's no in-editor pane to refresh.)
  const onChanged = () => {
    if (publishable) setDirty(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const apiBase = `/api/admin/pages/${slug}/blocks`;
  const childScope: BlockScope = scope;

  async function persistOrder(next: EditorBlock[]) {
    try {
      const res = await fetch(`${apiBase}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((b) => b.id) }),
      });
      if (!res.ok) throw new Error("reorder failed");
      onChanged();
    } catch {
      setError("Failed to save the new order. Reload and try again.");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(blocks, oldIndex, newIndex);
    setBlocks(next);
    void persistOrder(next);
  }

  async function handleSave(id: number, content: Record<string, unknown>) {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("save failed");
      const updated = await res.json();
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, content: updated.content } : b)),
      );
      onChanged();
    } catch {
      setError("Failed to save the section.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleVisible(id: number, isVisible: boolean) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isVisible } : b)),
    );
    try {
      const res = await fetch(`${apiBase}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible }),
      });
      if (!res.ok) throw new Error("toggle failed");
      onChanged();
    } catch {
      setError("Failed to change visibility.");
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isVisible: !isVisible } : b)),
      );
    }
  }

  async function handleDelete(id: number) {
    const prev = blocks;
    setBlocks((p) => p.filter((b) => b.id !== id));
    try {
      const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      onChanged();
    } catch {
      setError("Failed to delete the section.");
      setBlocks(prev);
    }
  }

  async function handleAdd(type: string, position: number) {
    setError(null);
    const def = getBlockDefinition(type);
    const content = def?.defaultContent ?? {};
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content, position }),
      });
      if (!res.ok) throw new Error("create failed");
      const created = await res.json();
      const newBlock: EditorBlock = {
        id: created.id,
        type: created.type,
        content: created.content ?? serializeBlockContent(content),
        isVisible: created.isVisible ?? true,
      };
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(position, 0, newBlock);
        return next;
      });
      onChanged();
    } catch {
      setError("Failed to add the section.");
    }
  }

  async function handleDuplicate(id: number) {
    setError(null);
    try {
      const res = await fetch(`${apiBase}/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("duplicate failed");
      const created = await res.json();
      const newBlock: EditorBlock = {
        id: created.id,
        type: created.type,
        content: created.content,
        isVisible: created.isVisible ?? true,
      };
      setBlocks((prev) => {
        const at = prev.findIndex((b) => b.id === id);
        const next = [...prev];
        next.splice(at < 0 ? prev.length : at + 1, 0, newBlock);
        return next;
      });
      onChanged();
    } catch {
      setError("Failed to duplicate the section.");
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${slug}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("publish failed");
      const data = await res.json();
      setDirty(false);
      setPublishedAtState(data.publishedAt ?? new Date().toISOString());
      if (revisions !== null) setRevisions(null); // force reload next time
    } catch {
      setError("Failed to publish the page.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDiscard() {
    if (
      !window.confirm(
        "Discard all unpublished changes and revert this page to the published version?",
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${slug}/discard`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("discard failed");
      // Reload so the editor reflects the reverted draft blocks.
      window.location.reload();
    } catch {
      setError("Failed to discard changes.");
    }
  }

  async function loadRevisions() {
    setRevisionsLoading(true);
    try {
      const res = await fetch(`/api/admin/pages/${slug}/revisions`);
      if (!res.ok) throw new Error("load failed");
      setRevisions(await res.json());
    } catch {
      setError("Failed to load version history.");
    } finally {
      setRevisionsLoading(false);
    }
  }

  function toggleRevisions() {
    setShowRevisions((open) => {
      const next = !open;
      if (next && revisions === null && !revisionsLoading) void loadRevisions();
      return next;
    });
  }

  async function handleRestore(id: number) {
    if (
      !window.confirm(
        "Restore this version into the editor? It replaces the current draft — review it, then Publish to make it live.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/pages/${slug}/revisions/${id}/restore`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("restore failed");
      window.location.reload();
    } catch {
      setError("Failed to restore that version.");
    }
  }

  // Stamp the current published version as the "Original" baseline in History.
  // Used after a deliberate redesign is final, so "Original" keeps meaning
  // "the page as designed" rather than an outdated layout.
  async function handleRebaseline() {
    if (
      !window.confirm(
        'Make the currently published version the new "Original" in History? The old Original entry is replaced and cannot be brought back.',
      )
    ) {
      return;
    }
    setRebaselining(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${slug}/rebaseline`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("rebaseline failed");
      await loadRevisions();
    } catch {
      setError("Failed to update the Original baseline.");
    } finally {
      setRebaselining(false);
    }
  }

  // Delete every saved version except the "Original" baseline. History fills up
  // fast when an admin publishes repeatedly to view a full draft; this clears
  // the clutter without touching the recoverable Original.
  async function handleClearHistory() {
    if (
      !window.confirm(
        'Clear the version history? Every saved version except "Original" is permanently deleted. This cannot be undone.',
      )
    ) {
      return;
    }
    setClearingHistory(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${slug}/revisions`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("clear failed");
      await loadRevisions();
    } catch {
      setError("Failed to clear the version history.");
    } finally {
      setClearingHistory(false);
    }
  }

  const liveHref = viewHref ?? publicPath(slug);

  // Split History once into the clearable versions and the "Original" baseline,
  // then pin Original to the bottom so it stays the visual anchor even though a
  // rebaseline now stamps it with the current date (which would otherwise sort
  // it to the top).
  const { clearable, original } = (revisions ?? []).reduce<{
    clearable: RevisionMeta[];
    original: RevisionMeta[];
  }>(
    (acc, r) => {
      (r.label === "Original" ? acc.original : acc.clearable).push(r);
      return acc;
    },
    { clearable: [], original: [] },
  );
  const orderedRevisions = revisions ? [...clearable, ...original] : null;
  const clearableCount = clearable.length;
  const clearHistoryTitle =
    revisions === null
      ? "Loading version history…"
      : clearableCount === 0
        ? "Nothing to clear — only the Original baseline remains."
        : 'Delete every saved version except "Original".';

  const editorPane = (
    <>
      <AddBlockButton scope={scope} onAdd={(type) => handleAdd(type, 0)} />

      <DndContext
        id={`page-editor-${slug}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-2">
            {blocks.map((block, i) => (
              <div key={block.id}>
                <SortableBlock
                  block={block}
                  scope={childScope}
                  saving={savingId === block.id}
                  onSave={handleSave}
                  onToggleVisible={handleToggleVisible}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
                <AddBlockButton
                  compact
                  scope={scope}
                  onAdd={(type) => handleAdd(type, i + 1)}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <p className="mt-6 text-center text-sm text-gray-400">
          This page has no blocks yet. Add one above.
        </p>
      )}
    </>
  );

  return (
    // At lg+ the editor is a fixed-height app canvas: the toolbar stays in view
    // while the block list scrolls on its own. (5rem = the admin shell's vertical
    // padding around this content.) When not filling the viewport it falls back
    // to natural flow.
    <div
      className={
        fillViewport
          ? "flex flex-col gap-4 lg:h-[calc(100dvh_-_5rem)]"
          : "flex flex-col gap-4"
      }
    >
      {/* Toolbar */}
      <div className="flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <Link
                href={backHref}
                className="text-xs font-medium text-gray-500 hover:text-[#0c0c48]"
              >
                {backLabel}
              </Link>
              <h1 className="truncate text-2xl font-bold text-[#0c0c48]">
                {title}
              </h1>
            </div>
            {publishable && (
              <span
                className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  dirty
                    ? "bg-amber-100 text-amber-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {dirty ? "● Unpublished changes" : "✓ Published"}
              </span>
            )}
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
            {headerExtra}
            {publishable && (
              <button
                type="button"
                onClick={toggleRevisions}
                aria-pressed={showRevisions}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-[#0c0c48] hover:bg-gray-100"
              >
                History
              </button>
            )}
            {previewHref && (
              <Link
                href={previewHref}
                target="_blank"
                rel="noopener noreferrer"
                title="Open the unpublished draft full-width in a new tab"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#0c0c48] hover:bg-gray-100"
              >
                Show preview ↗
              </Link>
            )}
            <Link
              href={liveHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#0c0c48] hover:bg-gray-100"
            >
              View live ↗
            </Link>
            {publishable && dirty && publishedAtState && (
              <button
                type="button"
                onClick={handleDiscard}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Discard
              </button>
            )}
            {publishable && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={!dirty || publishing}
                className="rounded-lg bg-[#0c0c48] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16166a] disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish"}
              </button>
            )}
          </div>
        </div>

        {publishable && publishedAtState && (
          <p className="mt-1 text-xs text-gray-400">
            Last published{" "}
            {new Date(publishedAtState).toLocaleString("en-NZ", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {publishable && showRevisions && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Version history
              </p>
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                {publishedAtState && (
                  <button
                    type="button"
                    onClick={handleRebaseline}
                    disabled={dirty || rebaselining}
                    title={
                      dirty
                        ? "Publish your changes first — this stamps the published version."
                        : 'Replace the "Original" entry with the currently published version.'
                    }
                    className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-[#0c0c48] hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {rebaselining ? "Updating…" : "Set current as Original"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearHistory}
                  disabled={
                    revisions === null || clearableCount === 0 || clearingHistory
                  }
                  title={clearHistoryTitle}
                  className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-[#0c0c48] hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {clearingHistory ? "Clearing…" : "Clear history"}
                </button>
              </div>
            </div>
            {revisionsLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : orderedRevisions && orderedRevisions.length > 0 ? (
              <ul className="max-h-60 space-y-1 overflow-y-auto">
                {orderedRevisions.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {r.label && (
                        <span
                          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            r.label === "Original"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {r.label}
                        </span>
                      )}
                      <span className="truncate text-[#0c0c48]">
                        {new Date(r.createdAt).toLocaleString("en-NZ", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        <span className="text-gray-400">
                          {" · "}
                          {r.blockCount} section{r.blockCount === 1 ? "" : "s"}
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRestore(r.id)}
                      className="flex-shrink-0 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-[#0c0c48] hover:bg-gray-100"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">
                No published versions yet. Publish to start the history.
              </p>
            )}
            <p className="mt-2 text-[11px] leading-snug text-gray-400">
              &ldquo;Original&rdquo; is the page&rsquo;s approved baseline
              design. When a redesign is published and final, use &ldquo;Set
              current as Original&rdquo; so restoring Original brings back the
              right version.
            </p>
          </div>
        )}
      </div>

      {/* Body — the block list. "Show preview" opens the draft full-width in a
          new tab, so there's no in-editor preview pane to lay out beside it. */}
      <div
        className={
          fillViewport
            ? "min-h-0 flex-1 min-w-0 lg:overflow-y-auto lg:pr-1"
            : "min-w-0"
        }
      >
        {editorPane}
      </div>
    </div>
  );
}
