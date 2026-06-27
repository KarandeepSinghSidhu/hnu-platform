"use client";

import { useState } from "react";
import type { BlockDefinition, BlockScope } from "@/lib/blocks/types";
import { Field } from "./fields";
import RowEditor from "./RowEditor";

export default function BlockEditForm({
  def,
  initialContent,
  onSave,
  onCancel,
  saving,
  scope = "page",
}: {
  def: BlockDefinition;
  initialContent: Record<string, unknown>;
  onSave: (content: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
  scope?: BlockScope;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(initialContent);

  const setField = (key: string, value: unknown) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4 rounded-b-xl border-t border-gray-200 bg-gray-50 px-5 py-4">
      {def.type === "row" ? (
        <RowEditor content={draft} onChange={setDraft} scope={scope} />
      ) : (
        def.fields.map((field) => (
          <Field
            key={field.key}
            field={field}
            value={draft[field.key]}
            onChange={(v) => setField(field.key, v)}
          />
        ))
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={saving}
          className="rounded-lg bg-[#0c0c48] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16166a] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
