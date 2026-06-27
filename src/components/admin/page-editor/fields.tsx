"use client";

import dynamic from "next/dynamic";

import type {
  BlockField,
  FaqItem,
  StatItem,
  StudyCardContent,
  UpdateItem,
} from "@/lib/blocks/types";
import MediaPicker from "@/components/admin/media/MediaPicker";
import { useMediaResolver } from "@/components/admin/media/useMediaResolver";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#0c0c48] focus:border-[#0c0c48] focus:outline-none focus:ring-1 focus:ring-[#0c0c48]";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1";

// Lazy-load the Tiptap editor so its bundle is only fetched when a rich-text
// field is actually shown; the rest of the editor stays lightweight.
const RichTextField = dynamic(() => import("./RichTextField"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-400">
      Loading editor…
    </div>
  ),
});

const IMAGE_POSITIONS = ["center", "right", "left", "top", "bottom"] as const;

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// A single image field: text path + library picker + preview.
function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { resolve } = useMediaResolver();
  const preview = resolve(value);
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-start gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-16 w-16 flex-shrink-0 rounded-lg border border-gray-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
            No image
          </div>
        )}
        <div className="flex-1 space-y-2">
          <input
            type="text"
            className={inputClass}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/path/to/image.jpg or https://…"
          />
          <MediaPicker onSelect={(path) => onChange(path)} />
        </div>
      </div>
    </div>
  );
}

function ParagraphArrayField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const items = Array.isArray(value) ? value : [];
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="space-y-2">
        {items.map((para, i) => (
          <div key={i} className="flex gap-2">
            <textarea
              className={inputClass}
              rows={3}
              value={para}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="self-start rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              aria-label="Remove paragraph"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-[#0c0c48] hover:bg-gray-100"
        >
          + Add paragraph
        </button>
      </div>
    </div>
  );
}

function ImageArrayField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const items = Array.isArray(value) ? value : [];
  const { resolve } = useMediaResolver();
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="space-y-2">
        {items.map((src, i) => {
          const preview = resolve(src);
          return (
          <div key={i} className="flex items-center gap-2">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                className="h-12 w-12 flex-shrink-0 rounded border border-gray-200 object-contain"
              />
            ) : (
              <div className="h-12 w-12 flex-shrink-0 rounded border border-dashed border-gray-300" />
            )}
            <input
              type="text"
              className={inputClass}
              value={src}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
          );
        })}
        <MediaPicker
          label="+ Add image from library"
          onSelect={(path) => onChange([...items, path])}
        />
      </div>
    </div>
  );
}

function StudyCardsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StudyCardContent[];
  onChange: (v: StudyCardContent[]) => void;
}) {
  const cards = Array.isArray(value) ? value : [];
  const update = (i: number, patch: Partial<StudyCardContent>) => {
    const next = cards.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    onChange(next);
  };
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="space-y-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                Card {i + 1}
              </span>
              <button
                type="button"
                onClick={() => onChange(cards.filter((_, idx) => idx !== i))}
                className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                Remove
              </button>
            </div>
            <input
              className={inputClass}
              placeholder="Title"
              value={asString(card.title)}
              onChange={(e) => update(i, { title: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Subtitle"
              value={asString(card.subtitle)}
              onChange={(e) => update(i, { subtitle: e.target.value })}
            />
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Description"
              value={asString(card.description)}
              onChange={(e) => update(i, { description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputClass}
                placeholder="Button label"
                value={asString(card.buttonLabel)}
                onChange={(e) => update(i, { buttonLabel: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Button link"
                value={asString(card.buttonHref)}
                onChange={(e) => update(i, { buttonHref: e.target.value })}
              />
            </div>
            <ImageField
              label="Card image"
              value={asString(card.imageSrc)}
              onChange={(v) => update(i, { imageSrc: v })}
            />
            <div>
              <label
                htmlFor={`card-alt-${i}`}
                className="block text-xs font-semibold text-[#0c0c48] mb-1"
              >
                Image alt text{" "}
                <span className="font-normal text-gray-500">
                  (describe the image for screen readers; leave empty only if it’s purely decorative)
                </span>
              </label>
              <input
                id={`card-alt-${i}`}
                className={inputClass}
                placeholder="e.g. Researcher preparing a meal in the metabolic kitchen"
                value={asString(card.imageAlt)}
                onChange={(e) => update(i, { imageAlt: e.target.value })}
                aria-describedby={
                  asString(card.imageSrc) && !asString(card.imageAlt).trim()
                    ? `card-alt-warn-${i}`
                    : undefined
                }
              />
              {asString(card.imageSrc) && !asString(card.imageAlt).trim() && (
                <p
                  id={`card-alt-warn-${i}`}
                  className="mt-1 text-xs text-amber-700"
                >
                  ⚠ This image has no alt text. Add a description, or confirm it’s
                  purely decorative. (The media library’s alt text is used as a
                  fallback if set.)
                </p>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange([
              ...cards,
              {
                title: "",
                subtitle: "",
                description: "",
                buttonLabel: "Find out more >",
                buttonHref: "",
                imageSrc: "",
                imageAlt: "",
                imagePosition: "center",
              },
            ])
          }
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-[#0c0c48] hover:bg-gray-100"
        >
          + Add card
        </button>
      </div>
    </div>
  );
}

function UpdatesField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: UpdateItem[];
  onChange: (v: UpdateItem[]) => void;
}) {
  // Per-item noun, e.g. "Updates" -> "Update", "Announcements" -> "Announcement".
  const itemNoun = label.replace(/s$/, "") || "Item";
  // Persisted block JSON is untrusted, so normalize each entry to a clean
  // UpdateItem. A malformed payload (e.g. [null] or a string) then can't crash
  // the editor — it just shows empty fields the admin can fix or remove.
  const raw: unknown[] = Array.isArray(value) ? value : [];
  const items: UpdateItem[] = raw.map((entry) => {
    const o =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? (entry as Record<string, unknown>)
        : {};
    return {
      title: typeof o.title === "string" ? o.title : "",
      date: typeof o.date === "string" ? o.date : "",
      paragraphs: Array.isArray(o.paragraphs)
        ? o.paragraphs.filter((p): p is string => typeof p === "string")
        : [],
    };
  });
  const update = (i: number, patch: Partial<UpdateItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                {itemNoun} {i + 1}
              </span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                Remove
              </button>
            </div>
            <input
              className={inputClass}
              placeholder="Title"
              aria-label={`${itemNoun} ${i + 1} title`}
              value={asString(item.title)}
              onChange={(e) => update(i, { title: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Date (e.g. May 2026)"
              aria-label={`${itemNoun} ${i + 1} date`}
              value={asString(item.date)}
              onChange={(e) => update(i, { date: e.target.value })}
            />
            <ParagraphArrayField
              label="Paragraphs"
              value={Array.isArray(item.paragraphs) ? item.paragraphs : []}
              onChange={(v) => update(i, { paragraphs: v })}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange([...items, { title: "", date: "", paragraphs: [""] }])
          }
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-[#0c0c48] hover:bg-gray-100"
        >
          + Add update
        </button>
      </div>
    </div>
  );
}

function FaqField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FaqItem[];
  onChange: (v: FaqItem[]) => void;
}) {
  const itemNoun = label.replace(/s$/, "") || "Question";
  // Untrusted persisted JSON — normalize each entry so a malformed payload can't
  // crash the editor.
  const raw: unknown[] = Array.isArray(value) ? value : [];
  const items: FaqItem[] = raw.map((entry) => {
    const o =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? (entry as Record<string, unknown>)
        : {};
    return {
      question: typeof o.question === "string" ? o.question : "",
      answer: typeof o.answer === "string" ? o.answer : "",
    };
  });
  const update = (i: number, patch: Partial<FaqItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                {itemNoun} {i + 1}
              </span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                Remove
              </button>
            </div>
            <input
              className={inputClass}
              placeholder="Question"
              aria-label={`${itemNoun} ${i + 1}`}
              value={asString(item.question)}
              onChange={(e) => update(i, { question: e.target.value })}
            />
            <textarea
              className={inputClass}
              rows={3}
              placeholder="Answer"
              aria-label={`Answer ${i + 1}`}
              value={asString(item.answer)}
              onChange={(e) => update(i, { answer: e.target.value })}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, { question: "", answer: "" }])}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-[#0c0c48] hover:bg-gray-100"
        >
          + Add question
        </button>
      </div>
    </div>
  );
}

function StatField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StatItem[];
  onChange: (v: StatItem[]) => void;
}) {
  const raw: unknown[] = Array.isArray(value) ? value : [];
  const items: StatItem[] = raw.map((entry) => {
    const o =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? (entry as Record<string, unknown>)
        : {};
    return {
      value: typeof o.value === "string" ? o.value : "",
      label: typeof o.label === "string" ? o.label : "",
    };
  });
  const update = (i: number, patch: Partial<StatItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <input
              className={inputClass}
              placeholder="Value (e.g. 500+)"
              aria-label={`Stat ${i + 1} value`}
              value={asString(item.value)}
              onChange={(e) => update(i, { value: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Label (e.g. Participants)"
              aria-label={`Stat ${i + 1} label`}
              value={asString(item.label)}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              aria-label="Remove stat"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, { value: "", label: "" }])}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-[#0c0c48] hover:bg-gray-100"
        >
          + Add stat
        </button>
      </div>
    </div>
  );
}

export function Field({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case "text":
    case "url":
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <input
            type="text"
            className={inputClass}
            value={asString(value)}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.help && (
            <p className="mt-1 text-xs text-gray-400">{field.help}</p>
          )}
        </div>
      );
    case "textarea":
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <textarea
            className={inputClass}
            rows={4}
            value={asString(value)}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.help && (
            <p className="mt-1 text-xs text-gray-400">{field.help}</p>
          )}
        </div>
      );
    case "richText":
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <RichTextField
            value={asString(value)}
            onChange={(html) => onChange(html)}
          />
          {field.help && (
            <p className="mt-1 text-xs text-gray-400">{field.help}</p>
          )}
        </div>
      );
    case "enum":
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <select
            className={inputClass}
            value={asString(value)}
            onChange={(e) => onChange(e.target.value)}
          >
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm text-[#0c0c48]">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          {field.label}
        </label>
      );
    case "image":
      return (
        <ImageField
          label={field.label}
          value={asString(value)}
          onChange={onChange}
        />
      );
    case "imageArray":
      return (
        <ImageArrayField
          label={field.label}
          value={(value as string[]) ?? []}
          onChange={onChange}
        />
      );
    case "paragraphArray":
      return (
        <ParagraphArrayField
          label={field.label}
          value={(value as string[]) ?? []}
          onChange={onChange}
        />
      );
    case "studyCards":
      return (
        <StudyCardsField
          label={field.label}
          value={(value as StudyCardContent[]) ?? []}
          onChange={(v) => onChange(v)}
        />
      );
    case "updatesList":
      return (
        <UpdatesField
          label={field.label}
          value={(value as UpdateItem[]) ?? []}
          onChange={(v) => onChange(v)}
        />
      );
    case "faqList":
      return (
        <FaqField
          label={field.label}
          value={(value as FaqItem[]) ?? []}
          onChange={(v) => onChange(v)}
        />
      );
    case "statList":
      return (
        <StatField
          label={field.label}
          value={(value as StatItem[]) ?? []}
          onChange={(v) => onChange(v)}
        />
      );
    default:
      return null;
  }
}

export { IMAGE_POSITIONS };
