"use client";

import { useRef, useState } from "react";
import { listPickableBlockDefinitions } from "@/lib/blocks/registry";
import type { BlockCategory } from "@/lib/blocks/types";
import PopoverMenu from "./PopoverMenu";

const CATEGORY_ORDER: BlockCategory[] = [
  "Generic blocks",
  "Hero",
  "Heading",
  "Layout",
  "Study",
  "Content",
  "Dynamic",
];

export default function AddBlockButton({
  onAdd,
  compact = false,
  scope = "page",
  label = "+ Add block",
  exclude = [],
}: {
  onAdd: (type: string) => void;
  compact?: boolean;
  scope?: "page" | "study";
  label?: string;
  exclude?: string[];
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const defs = listPickableBlockDefinitions(scope, { exclude });

  return (
    <div className="relative flex justify-center">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className={
          compact
            ? "my-1 rounded-full border border-dashed border-gray-300 px-3 py-0.5 text-xs font-medium text-gray-400 hover:border-[#0c0c48] hover:text-[#0c0c48]"
            : "rounded-lg border border-dashed border-gray-400 px-4 py-2 text-sm font-semibold text-[#0c0c48] hover:bg-gray-100"
        }
      >
        {label}
      </button>

      <PopoverMenu
        anchorRef={btnRef}
        open={open}
        onClose={() => setOpen(false)}
        align="center"
        width={288}
      >
        {CATEGORY_ORDER.map((category) => {
          const items = defs.filter((d) => d.category === category);
          if (items.length === 0) return null;
          return (
            <div key={category} className="mb-2 last:mb-0">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                {category}
              </p>
              {items.map((def) => (
                <button
                  key={def.type}
                  type="button"
                  onClick={() => {
                    onAdd(def.type);
                    setOpen(false);
                  }}
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-[#0c0c48] hover:bg-gray-100"
                >
                  {def.label}
                </button>
              ))}
            </div>
          );
        })}
      </PopoverMenu>
    </div>
  );
}
