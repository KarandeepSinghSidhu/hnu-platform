"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminForm, FormErrorBanner } from "@/components/admin/AdminForm";
import {
  StudyFormFields,
  emptyStudyFormData,
  studyToFormData,
  type StudyFormData,
} from "@/components/admin/StudyFormFields";
import StudyPdfManager from "@/components/admin/StudyPdfManager";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditStudy({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStudy, setIsLoadingStudy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<StudyFormData>(emptyStudyFormData);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoadingStudy(true);
        const res = await fetch(`/api/admin/studies/${id}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load study");
        const data = await res.json();
        if (!cancelled) setFormData(studyToFormData(data));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "An error occurred");
        }
      } finally {
        if (!cancelled) setIsLoadingStudy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
      const res = await fetch(`/api/admin/studies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to update study" }));
        throw new Error(
          errorData.error || `Failed to update study (${res.status})`,
        );
      }
      router.push("/admin/studies");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (notFound) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-12 text-center">
        <h1 className="text-2xl font-bold text-[#0c0c48]">Study not found</h1>
        <p className="text-[#0a4479]/80 mt-3">
          That study may have been deleted, or the ID is wrong.
        </p>
        <button
          onClick={() => router.push("/admin/studies")}
          className="mt-6 inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors"
        >
          Back to studies
        </button>
      </div>
    );
  }

  if (isLoadingStudy) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-12 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#0a4479]/20 border-t-[#0a4479] animate-spin" />
      </div>
    );
  }

  const numericId = Number(id);

  return (
    <>
      <AdminForm
        title={`Edit ${formData.title || "study"}`}
        kicker="Studies"
        description="Update any of the fields below. Changes are visible on the public study page immediately after saving."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        formId="study-edit-form"
        hideFooter
      >
        {error && <FormErrorBanner message={error} />}
        <StudyFormFields formData={formData} onChange={handleChange} />
      </AdminForm>
      {Number.isInteger(numericId) && numericId > 0 && (
        <StudyPdfManager studyId={numericId} />
      )}
      {Number.isInteger(numericId) && numericId > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#0a4479]/15 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
          <div>
            <h2 className="text-lg font-bold text-[#0c0c48]">Page layout</h2>
            <p className="mt-1 text-sm text-[#0a4479]/80">
              Rearrange this study page into custom sections and columns, or
              leave it on the default layout.
            </p>
          </div>
          <Link
            href={`/admin/studies/${numericId}/layout`}
            className="inline-flex items-center justify-center rounded-full bg-[#0a4479] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#083559] transition-colors"
          >
            Customize layout →
          </Link>
        </div>
      )}
      <div className="mt-8 flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl border border-[#0a4479]/15 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <button
          type="submit"
          form="study-edit-form"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-full bg-[#0a4479] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#083559] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Saving..." : "Save changes"}
        </button>
        <Link
          href="/admin/studies"
          className="inline-flex items-center justify-center rounded-full border-2 border-[#0a4479]/20 bg-white px-6 py-2.5 text-sm font-semibold text-[#0a4479] transition-colors hover:bg-[#0a4479]/5"
        >
          Cancel
        </Link>
      </div>
    </>
  );
}
