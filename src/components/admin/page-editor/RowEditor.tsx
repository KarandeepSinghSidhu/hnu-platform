"use client";

import { useId, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getBlockDefinition } from "@/lib/blocks/registry";
import {
  type BlockScope,
  type RowChild,
  type RowContent,
  ROW_MAX_CHILDREN_PER_COLUMN,
  ROW_MAX_COLUMNS,
} from "@/lib/blocks/types";
import {
  equalWidths,
  readRowContent,
  widthPresetsFor,
  widthsEqual,
} from "@/lib/blocks/row";
import { Field } from "./fields";
import AddBlockButton from "./AddBlockButton";

// The editor offers the same blocks as its parent builder; only "page"/"study"
// scoped blocks can be children (rows can't nest in rows — see validate.ts).
type ChildScope = "page" | "study";
const CONTAINER_PREFIX = "column:";

function makeChild(type: string): RowChild {
  const def = getBlockDefinition(type);
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, type, content: { ...(def?.defaultContent ?? {}) } };
}

/** Header row shared by the live card and the drag overlay. */
function ChildHeader({
  child,
  handleProps,
  editable,
  editing,
  onToggleEdit,
  onRemove,
}: {
  child: RowChild;
  handleProps?: React.HTMLAttributes<HTMLButtonElement>;
  editable?: boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
  onRemove?: () => void;
}) {
  const def = getBlockDefinition(child.type);
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <button
        type="button"
        className="cursor-grab touch-none rounded px-1 text-gray-400 hover:text-[#0c0c48] active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...handleProps}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
      </button>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#0c0c48]">
        {def?.label ?? child.type}
      </span>
      <div className="flex flex-shrink-0 items-center gap-0.5 text-xs">
        {editable && (
          <button
            type="button"
            onClick={onToggleEdit}
            className="rounded px-2 py-1 font-medium text-[#0c0c48] hover:bg-gray-100"
          >
            {editing ? "Close" : "Edit"}
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded px-2 py-1 font-medium text-red-600 hover:bg-red-50"
            aria-label="Remove block"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function ChildCard({
  child,
  editing,
  onToggleEdit,
  onRemove,
  onContentChange,
}: {
  child: RowChild;
  editing: boolean;
  onToggleEdit: () => void;
  onRemove: () => void;
  onContentChange: (content: Record<string, unknown>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: child.id });
  const def = getBlockDefinition(child.type);
  const canEdit = Boolean(def?.editable) && (def?.fields?.length ?? 0) > 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="rounded-lg border border-gray-200 bg-white"
    >
      <ChildHeader
        child={child}
        handleProps={{ ...attributes, ...listeners }}
        editable={canEdit}
        editing={editing}
        onToggleEdit={onToggleEdit}
        onRemove={onRemove}
      />
      {editing && canEdit && (
        <div className="space-y-3 border-t border-gray-100 bg-gray-50 px-3 py-3">
          {def!.fields.map((field) => (
            <Field
              key={field.key}
              field={field}
              value={child.content[field.key]}
              onChange={(v) =>
                onContentChange({ ...child.content, [field.key]: v })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Column({
  index,
  items,
  childScope,
  full,
  editingId,
  onToggleEdit,
  onAdd,
  onRemove,
  onContentChange,
}: {
  index: number;
  items: RowChild[];
  childScope: ChildScope;
  full: boolean;
  editingId: string | null;
  onToggleEdit: (id: string) => void;
  onAdd: (type: string) => void;
  onRemove: (id: string) => void;
  onContentChange: (id: string, content: Record<string, unknown>) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${CONTAINER_PREFIX}${index}` });
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[220px] flex-1 rounded-lg border bg-gray-50 p-3 transition-colors ${
        isOver ? "border-[#0c0c48]" : "border-gray-200"
      }`}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
        {full ? "Column" : `Column ${index + 1}`}
      </p>
      <SortableContext
        items={items.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {items.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              editing={editingId === child.id}
              onToggleEdit={() => onToggleEdit(child.id)}
              onRemove={() => onRemove(child.id)}
              onContentChange={(content) => onContentChange(child.id, content)}
            />
          ))}
        </div>
      </SortableContext>
      {items.length < ROW_MAX_CHILDREN_PER_COLUMN ? (
        <div className="mt-2">
          <AddBlockButton
            compact
            scope={childScope}
            exclude={["row"]}
            label="+ Add to column"
            onAdd={onAdd}
          />
        </div>
      ) : (
        <p className="mt-2 text-center text-[11px] text-gray-400">
          Column is full ({ROW_MAX_CHILDREN_PER_COLUMN} blocks max)
        </p>
      )}
    </div>
  );
}

export default function RowEditor({
  content,
  onChange,
  scope = "study",
}: {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  // Builder scope; rows are "both", so child blocks follow the parent builder.
  scope?: BlockScope;
}) {
  const childScope: ChildScope = scope === "page" ? "page" : "study";
  const [row, setRow] = useState<RowContent>(() => readRowContent(content));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const beforeDrag = useRef<RowContent | null>(null);
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Single source of truth while editing: update internal state and mirror it to
  // the parent draft so Save persists the latest arrangement.
  const update = (next: RowContent) => {
    setRow(next);
    onChange({ columns: next.columns, widths: next.widths });
  };

  const columnCount = row.columns.length;
  const presets = widthPresetsFor(columnCount);
  const activeChild = activeId
    ? row.columns.flat().find((c) => c.id === activeId) ?? null
    : null;

  const findContainerIndex = (id: string): number => {
    if (id.startsWith(CONTAINER_PREFIX)) {
      return Number(id.slice(CONTAINER_PREFIX.length));
    }
    return row.columns.findIndex((col) => col.some((c) => c.id === id));
  };

  const setColumnCount = (n: number) => {
    if (n === columnCount) return;
    const cur = row.columns.map((c) => [...c]);
    let cols: RowChild[][];
    if (n < columnCount) {
      // Fold removed columns into the last kept one so no blocks are lost.
      cols = cur.slice(0, n);
      const overflow = cur.slice(n).flat();
      cols[cols.length - 1] = [...cols[cols.length - 1], ...overflow];
    } else {
      cols = cur;
      while (cols.length < n) cols.push([]);
    }
    update({ columns: cols, widths: equalWidths(n) });
  };

  const setWidths = (widths: number[]) => update({ ...row, widths });

  const addChild = (colIndex: number, type: string) => {
    const cols = row.columns.map((c) => [...c]);
    if (cols[colIndex].length >= ROW_MAX_CHILDREN_PER_COLUMN) return;
    cols[colIndex] = [...cols[colIndex], makeChild(type)];
    update({ ...row, columns: cols });
  };

  const removeChild = (id: string) => {
    const cols = row.columns.map((c) => c.filter((ch) => ch.id !== id));
    update({ ...row, columns: cols });
  };

  const updateChildContent = (id: string, childContent: Record<string, unknown>) => {
    const cols = row.columns.map((c) =>
      c.map((ch) => (ch.id === id ? { ...ch, content: childContent } : ch)),
    );
    update({ ...row, columns: cols });
  };

  const onDragStart = (event: DragStartEvent) => {
    beforeDrag.current = row;
    setActiveId(String(event.active.id));
  };

  // Cross-column moves happen here (sortable doesn't move items across contexts
  // on its own). We mutate internal state only; the commit to the parent draft
  // happens once on drag end to limit re-renders (clauderic/dnd-kit#1421).
  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const fromCol = findContainerIndex(activeKey);
    const toCol = findContainerIndex(overKey);
    if (fromCol === -1 || toCol === -1 || fromCol === toCol) return;

    setRow((prev) => {
      // Block a cross-column move into a column that's already at the cap the
      // validator enforces on write, so the editor can't reach an unsaveable
      // state. The block stays in its source column until space frees up.
      if (prev.columns[toCol].length >= ROW_MAX_CHILDREN_PER_COLUMN) return prev;
      const cols = prev.columns.map((c) => [...c]);
      const activeIndex = cols[fromCol].findIndex((c) => c.id === activeKey);
      if (activeIndex === -1) return prev;
      const [moved] = cols[fromCol].splice(activeIndex, 1);

      let newIndex = cols[toCol].length;
      if (!overKey.startsWith(CONTAINER_PREFIX)) {
        const overIndex = cols[toCol].findIndex((c) => c.id === overKey);
        if (overIndex !== -1) {
          const activeRect = active.rect.current.translated;
          const overRect = over.rect;
          const isBelow =
            activeRect && overRect
              ? activeRect.top > overRect.top + overRect.height / 2
              : false;
          newIndex = overIndex + (isBelow ? 1 : 0);
        }
      }
      cols[toCol].splice(newIndex, 0, moved);
      return { ...prev, columns: cols };
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    beforeDrag.current = null;
    if (!over) {
      update(row);
      return;
    }
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const col = findContainerIndex(activeKey);
    let finalRow = row;
    if (col !== -1 && !overKey.startsWith(CONTAINER_PREFIX)) {
      const items = row.columns[col];
      const oldIndex = items.findIndex((c) => c.id === activeKey);
      const newIndex = items.findIndex((c) => c.id === overKey);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const cols = row.columns.map((c) => [...c]);
        cols[col] = arrayMove(cols[col], oldIndex, newIndex);
        finalRow = { ...row, columns: cols };
      }
    }
    update(finalRow);
  };

  const onDragCancel = () => {
    setActiveId(null);
    if (beforeDrag.current) update(beforeDrag.current);
    beforeDrag.current = null;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Columns
          </span>
          <div className="flex gap-1">
            {Array.from({ length: ROW_MAX_COLUMNS }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setColumnCount(n)}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  columnCount === n
                    ? "bg-[#0c0c48] text-white"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {presets.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Widths
            </span>
            <div className="flex flex-wrap gap-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setWidths(preset.widths)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    widthsEqual(row.widths, preset.widths)
                      ? "bg-[#0c0c48] text-white"
                      : "border border-gray-300 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <DndContext
        id={`row-editor-${dndId}`}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="flex flex-wrap gap-3">
          {row.columns.map((col, i) => (
            <Column
              key={i}
              index={i}
              items={col}
              childScope={childScope}
              full={columnCount === 1}
              editingId={editingId}
              onToggleEdit={(id) =>
                setEditingId((cur) => (cur === id ? null : id))
              }
              onAdd={(type) => addChild(i, type)}
              onRemove={removeChild}
              onContentChange={updateChildContent}
            />
          ))}
        </div>
        <DragOverlay>
          {activeChild ? (
            <div className="rounded-lg border border-[#0c0c48] bg-white shadow-lg">
              <ChildHeader child={activeChild} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
