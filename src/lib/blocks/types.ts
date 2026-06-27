// Shared types for the block-based page builder.
// This module is imported by both server (rendering) and client (admin editor)
// code, so it must contain types and plain data only — no React component imports.

export type BlockCategory =
  | "Generic blocks"
  | "Hero"
  | "Content"
  | "Dynamic"
  | "Heading"
  | "Study"
  | "Layout";

// Where a block type may be used. "page" blocks appear in the page builder,
// "study" blocks in the study-layout builder, "both" in either.
export type BlockScope = "page" | "study" | "both";

export type FieldType =
  | "text"
  | "textarea"
  | "paragraphArray"
  | "image"
  | "imageArray"
  | "url"
  | "enum"
  | "boolean"
  | "studyCards"
  | "updatesList"
  | "faqList"
  | "statList"
  | "richText";

export interface BlockField {
  key: string;
  label: string;
  type: FieldType;
  /** Allowed values for an "enum" field. */
  options?: readonly string[];
  help?: string;
}

export interface BlockDefinition {
  /** Registry key, also stored in PageBlock.type. */
  type: string;
  /** Human-readable name shown in the admin block picker and card header. */
  label: string;
  category: BlockCategory;
  /** Which builder(s) this block is available in. Defaults to "page". */
  scope?: BlockScope;
  /**
   * When false the block has no editable content (it is "content-frozen"):
   * it can be reordered, hidden, or deleted, but renders fixed markup.
   */
  editable: boolean;
  /**
   * When true the block is kept out of the "Add block" picker but its renderer
   * still works, so existing pages that use it keep rendering. Used to retire a
   * block type from new use without breaking published content.
   */
  hidden?: boolean;
  fields: readonly BlockField[];
  /** Starting content used when an admin inserts a new instance of this block. */
  defaultContent: Record<string, unknown>;
}

/** A single item in an `updates` block's carousel. */
export interface UpdateItem {
  title: string;
  date?: string;
  paragraphs: string[];
}

/** One question/answer pair in an `accordion` (FAQ) block's `faqList` field. */
export interface FaqItem {
  question: string;
  answer: string;
}

/** One stat in a `statHighlights` block's `statList` field. `value` is the big
 *  number/figure (e.g. "500+"), `label` the caption beneath it. */
export interface StatItem {
  value: string;
  label: string;
}

/** Shape of a single card inside a `homepageStudies` block. */
export interface StudyCardContent {
  title: string;
  subtitle?: string;
  description: string;
  buttonLabel?: string;
  buttonHref?: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: "center" | "right" | "left" | "top" | "bottom";
}

/** A child block nested inside a `row` column. Rows may not contain rows. */
export interface RowChild {
  id: string;
  type: string;
  content: Record<string, unknown>;
}

/**
 * Content of a `row` block: 1–3 columns, each an ordered list of children, plus
 * a relative width (flex weight) per column. `widths` always has the same length
 * as `columns`. Legacy rows stored a `variant` flag and a fixed two-column
 * tuple; those are read tolerantly into this shape (see `lib/blocks/row.ts`).
 */
export interface RowContent {
  columns: RowChild[][];
  widths: number[];
}

/** Hard limits for row content, enforced on write to bound payloads. */
export const ROW_MAX_CHILDREN_PER_COLUMN = 20;
export const ROW_MIN_COLUMNS = 1;
export const ROW_MAX_COLUMNS = 3;
