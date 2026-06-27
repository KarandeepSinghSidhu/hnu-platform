"use client";

import { FormField, FormCheckbox } from "@/components/admin/AdminForm";

export type StudyFormData = {
  slug: string;
  title: string;
  shortDescription: string;
  fullDescriptionEn: string;
  fullDescriptionZh: string;
  eligibilityEn: string;
  eligibilityZh: string;
  compensationEn: string;
  compensationZh: string;
  redcapUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactPhoneZh: string;
  ethicsStatement: string;
  imagePath: string;
  isActive: boolean;
  status: "Recruiting" | "Active" | "Completed";
  category: string;
  publishedAt: string;
  order: number;
};

export const emptyStudyFormData: StudyFormData = {
  slug: "",
  title: "",
  shortDescription: "",
  fullDescriptionEn: "",
  fullDescriptionZh: "",
  eligibilityEn: "",
  eligibilityZh: "",
  compensationEn: "",
  compensationZh: "",
  redcapUrl: "",
  contactEmail: "",
  contactPhone: "",
  contactPhoneZh: "",
  ethicsStatement: "",
  imagePath: "",
  isActive: true,
  status: "Recruiting",
  category: "",
  publishedAt: "",
  order: 0,
};

export function StudyFormFields({
  formData,
  onChange,
}: {
  formData: StudyFormData;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
}) {
  return (
    <>
      <FormField
        label="Slug"
        id="slug"
        placeholder="nz-synergy"
        value={formData.slug}
        onChange={onChange}
        required
        helper="Used in the URL: /studies/<slug>. Lower-case, hyphenated."
      />

      <FormField
        label="Title"
        id="title"
        placeholder="NZ Synergy Study"
        value={formData.title}
        onChange={onChange}
        required
      />

      <FormField
        label="Short description"
        id="shortDescription"
        type="textarea"
        rows={2}
        placeholder="One-line summary shown on the studies index card."
        value={formData.shortDescription}
        onChange={onChange}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          label="Status"
          id="status"
          type="select"
          value={formData.status}
          onChange={onChange}
          required
          options={[
            { value: "Recruiting", label: "Recruiting" },
            { value: "Active", label: "Active" },
            { value: "Completed", label: "Completed" },
          ]}
        />
        <FormField
          label="Category"
          id="category"
          placeholder="e.g. Obesity, Nutrition"
          value={formData.category}
          onChange={onChange}
        />
        <FormField
          label="Order"
          id="order"
          type="number"
          value={formData.order}
          onChange={onChange}
          min={0}
          step={1}
          helper="Lower values appear first."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Full description (English)"
          id="fullDescriptionEn"
          type="textarea"
          rows={6}
          value={formData.fullDescriptionEn}
          onChange={onChange}
          required
        />
        <FormField
          label="Full description (中文)"
          id="fullDescriptionZh"
          type="textarea"
          rows={6}
          value={formData.fullDescriptionZh}
          onChange={onChange}
          required
          helper="Ethics-approved translation only. Do not auto-translate."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Eligibility (English)"
          id="eligibilityEn"
          type="textarea"
          rows={4}
          value={formData.eligibilityEn}
          onChange={onChange}
          required
        />
        <FormField
          label="Eligibility (中文)"
          id="eligibilityZh"
          type="textarea"
          rows={4}
          value={formData.eligibilityZh}
          onChange={onChange}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Compensation (English)"
          id="compensationEn"
          type="textarea"
          rows={3}
          value={formData.compensationEn}
          onChange={onChange}
          required
        />
        <FormField
          label="Compensation (中文)"
          id="compensationZh"
          type="textarea"
          rows={3}
          value={formData.compensationZh}
          onChange={onChange}
          required
        />
      </div>

      <FormField
        label="REDCap URL"
        id="redcapUrl"
        type="url"
        placeholder="https://redcap.auckland.ac.nz/..."
        value={formData.redcapUrl}
        onChange={onChange}
        required
        helper="Where the 'Apply via REDCap' button on the study page links to."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Contact email"
          id="contactEmail"
          type="email"
          placeholder="HNU_STUDY@auckland.ac.nz"
          value={formData.contactEmail}
          onChange={onChange}
          required
        />
        <FormField
          label="Contact phone (English)"
          id="contactPhone"
          placeholder="02109195443"
          value={formData.contactPhone}
          onChange={onChange}
          required
        />
      </div>

      <FormField
        label="Contact phone (中文)"
        id="contactPhoneZh"
        placeholder="02109196703"
        value={formData.contactPhoneZh}
        onChange={onChange}
        helper="Often a different number from the English contact phone."
      />

      <FormField
        label="Ethics statement"
        id="ethicsStatement"
        type="textarea"
        rows={2}
        value={formData.ethicsStatement}
        onChange={onChange}
        required
        helper="The full sentence shown at the bottom of the study page."
      />

      <FormField
        label="Image path"
        id="imagePath"
        placeholder="/NZ Synergy Study.jpg"
        value={formData.imagePath}
        onChange={onChange}
        helper="Path under /public — used by the studies index card."
      />

      <FormField
        label="Published at"
        id="publishedAt"
        type="date"
        value={formData.publishedAt}
        onChange={onChange}
        helper="Optional. Used for sort/filter."
      />

      <FormCheckbox
        label="Show on public site"
        id="isActive"
        checked={formData.isActive}
        onChange={onChange}
        helper="Hide a study without deleting its content."
      />
    </>
  );
}

export function studyToFormData(study: Record<string, unknown>): StudyFormData {
  return {
    ...emptyStudyFormData,
    ...study,
    status:
      typeof study.status === "string" &&
      ["Recruiting", "Active", "Completed"].includes(study.status)
        ? (study.status as StudyFormData["status"])
        : "Recruiting",
    publishedAt:
      typeof study.publishedAt === "string" && study.publishedAt
        ? study.publishedAt.slice(0, 10)
        : "",
    isActive: study.isActive === true,
    order:
      typeof study.order === "number"
        ? study.order
        : Number(study.order ?? 0) || 0,
  } as StudyFormData;
}
