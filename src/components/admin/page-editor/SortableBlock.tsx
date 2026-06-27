"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getBlockDefinition } from "@/lib/blocks/registry";
import type { BlockScope } from "@/lib/blocks/types";
import { parseBlockContent } from "@/lib/blocks/validate";
import BlockEditForm from "./BlockEditForm";
import PopoverMenu from "./PopoverMenu";

export type EditorBlock = {
  id: number;
  type: string;
  content: string;
  isVisible: boolean;
};

function summarize(type: string, content: Record<string, unknown>): string {
  const candidates = [
    content.title,
    content.leftTitle,
    content.text,
    content.breadcrumbLabel,
  ];
  const found = candidates.find((c) => typeof c === "string" && c.trim());
  if (typeof found === "string") return found;
  if (Array.isArray(content.cards)) return `${content.cards.length} card(s)`;
  return getBlockDefinition(type)?.label ?? type;
}

export default function SortableBlock({
  block,
  onSave,
  onToggleVisible,
  onDelete,
  onDuplicate,
  saving,
  scope = "page",
}: {
  block: EditorBlock;
  onSave: (id: number, content: Record<string, unknown>) => Promise<void>;
  onToggleVisible: (id: number, isVisible: boolean) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  saving: boolean;
  scope?: BlockScope;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const def = getBlockDefinition(block.type);
  const content = parseBlockContent(block.content);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : block.isVisible ? 1 : 0.55,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          className="cursor-grab touch-none rounded px-1 text-gray-400 hover:text-[#0c0c48] active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#0c0c48]">
            {summarize(block.type, content)}
          </p>
          <p className="truncate text-xs text-gray-400">
            {def?.label ?? block.type}
            {!block.isVisible && " · hidden"}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          {def?.editable && (
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#0c0c48] hover:bg-gray-100"
            >
              {editing ? "Close" : "Edit"}
            </button>
          )}
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More actions"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-[#0c0c48]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
          </button>

          <PopoverMenu
            anchorRef={menuBtnRef}
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            align="end"
            width={184}
          >
            <button
              type="button"
              onClick={() => {
                onDuplicate(block.id);
                setMenuOpen(false);
              }}
              className="block w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-[#0c0c48] hover:bg-gray-100"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleVisible(block.id, !block.isVisible);
                setMenuOpen(false);
              }}
              className="block w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-[#0c0c48] hover:bg-gray-100"
            >
              {block.isVisible ? "Hide from page" : "Show on page"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                if (
                  window.confirm(
                    "Delete this section? This removes it from the live page.",
                  )
                ) {
                  onDelete(block.id);
                }
              }}
              className="block w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </PopoverMenu>
        </div>
      </div>

      {editing && def?.editable && (
        <BlockEditForm
          def={def}
          initialContent={content}
          saving={saving}
          scope={scope}
          onSave={async (c) => {
            await onSave(block.id, c);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}
