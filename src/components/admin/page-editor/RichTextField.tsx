"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";

// Tiptap WYSIWYG field. Output is HTML (sanitized server-side on render by
// <RichText/>, and again on write). Lazy-loaded by fields.tsx so the editor
// bundle isn't paid for unless a rich-text field is shown.

const btnClass = (active: boolean) =>
  `rounded px-2 py-1 text-xs font-medium ${
    active ? "bg-[#0c0c48] text-white" : "text-gray-600 hover:bg-gray-100"
  }`;

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = (editor.getAttributes("link").href as string) ?? "";
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
      <button
        type="button"
        className={btnClass(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Bold
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        Italic
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive("link"))}
        onClick={setLink}
      >
        Link
      </button>
      <button
        type="button"
        className={btnClass(false)}
        onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()
        }
        title="Clear formatting"
      >
        Clear
      </button>
    </div>
  );
}

export default function RichTextField({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    // Required under Next/React 19 to avoid an SSR hydration mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] px-3 py-2 text-sm leading-relaxed text-[#0c0c48] focus:outline-none [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-700 [&_a]:underline [&_strong]:font-semibold",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Reflect external value changes (e.g. switching which block is edited)
  // without disrupting the cursor while the user is typing.
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-gray-300 focus-within:border-[#0c0c48] focus-within:ring-1 focus-within:ring-[#0c0c48]">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
