"use client";

import dynamic from "next/dynamic";
import type { EditorBlock } from "./SortableBlock";

// dnd-kit generates non-deterministic accessibility ids during SSR, causing a
// hydration mismatch (clauderic/dnd-kit#285, #926). The editor is fully
// interactive and gains nothing from SSR, so we render it client-only.
const PageEditor = dynamic(() => import("./PageEditor"), {
  ssr: false,
  loading: () => (
    <p className="mt-6 text-center text-sm text-gray-400">Loading editor…</p>
  ),
});

export default function PageEditorLoader(props: {
  slug: string;
  title: string;
  initialBlocks: EditorBlock[];
  previewHref?: string;
  publishable?: boolean;
  publishedAt?: string | null;
  initialDirty?: boolean;
}) {
  return <PageEditor {...props} />;
}
