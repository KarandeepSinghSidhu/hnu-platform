"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminForm, FormErrorBanner } from "@/components/admin/AdminForm";
import {
  StudyFormFields,
  emptyStudyFormData,
  type StudyFormData,
} from "@/components/admin/StudyFormFields";
import StudyPdfStager, {
  type StagedPdf,
} from "@/components/admin/StudyPdfStager";

export default function NewStudy() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<StudyFormData>(emptyStudyFormData);
  const [pdfs, setPdfs] = useState<StagedPdf[]>([]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const target = e.target as HTMLInputElement;
    const { name, type, value, checked } = target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? Number(value)
            : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const body = {
        ...formData,
        publishedAt: formData.publishedAt || null,
      };
      const res = await fetch("/api/admin/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to create study" }));
        throw new Error(
          errorData.error || `Failed to create study (${res.status})`,
        );
      }

      const created = await res.json();

      // Upload any staged PDFs against the new study id. If some fail, the study
      // still exists — send the admin to its edit page to finish there.
      let pdfFailed = false;
      for (let i = 0; i < pdfs.length; i++) {
        const fd = new FormData();
        fd.append("title", pdfs[i].title);
        fd.append("order", String(i));
        fd.append("file", pdfs[i].file);
        const pdfRes = await fetch(`/api/admin/studies/${created.id}/pdfs`, {
          method: "POST",
          body: fd,
        });
        if (!pdfRes.ok) pdfFailed = true;
      }

      router.push(pdfFailed ? `/admin/studies/${created.id}` : "/admin/studies");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminForm
      title="New study"
      kicker="Studies"
      description="Fill in the details a participant sees on the public study page, plus the recruitment status the studies index uses to display the right call-to-action."
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitButtonLabel="Create study"
      cancelHref="/admin/studies"
    >
      {error && <FormErrorBanner message={error} />}
      <StudyFormFields formData={formData} onChange={handleChange} />
      <StudyPdfStager pdfs={pdfs} onChange={setPdfs} />
    </AdminForm>
  );
}
