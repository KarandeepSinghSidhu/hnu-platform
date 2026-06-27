"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminForm,
  FormField,
  FormCheckbox,
  FormErrorBanner,
} from "@/components/admin/AdminForm";

type Props = {
  params: Promise<{ id: string }>;
};

type Category = { id: number; name: string };

type Form = {
  title: string;
  authorsRaw: string;
  journal: string;
  year: number | "";
  doi: string;
  pubType: string;
  url: string;
  abstract: string;
  affiliation: string;
  status: "Pending" | "Approved" | "Rejected";
  isVisible: boolean;
  hiddenManually: boolean;
  categoryId: number | "";
};

const EMPTY: Form = {
  title: "",
  authorsRaw: "",
  journal: "",
  year: "",
  doi: "",
  pubType: "Journal Article",
  url: "",
  abstract: "",
  affiliation: "",
  status: "Pending",
  isVisible: true,
  hiddenManually: false,
  categoryId: "",
};

export default function EditPublication({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPub, setIsLoadingPub] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<Form>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoadingPub(true);
        const [pubRes, catRes] = await Promise.all([
          fetch(`/api/admin/publications/${id}`),
          fetch("/api/admin/publications/categories"),
        ]);

        if (pubRes.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!pubRes.ok) throw new Error("Failed to load publication");

        const pub = await pubRes.json();
        const cats = catRes.ok ? await catRes.json() : [];

        if (cancelled) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setFormData({
          title: pub.title ?? "",
          authorsRaw: pub.authorsRaw ?? "",
          journal: pub.journal ?? "",
          year: typeof pub.year === "number" ? pub.year : "",
          doi: pub.doi ?? "",
          pubType: pub.pubType ?? "Journal Article",
          url: pub.url ?? "",
          abstract: pub.abstract ?? "",
          affiliation: pub.affiliation ?? "",
          status: pub.status === "Approved" || pub.status === "Rejected"
            ? pub.status
            : "Pending",
          isVisible: pub.isVisible !== false,
          hiddenManually: !!pub.hiddenManually,
          categoryId: typeof pub.categoryId === "number" ? pub.categoryId : "",
        });
        setAuthors(
          Array.isArray(pub.authors)
            ? pub.authors.map(
                (a: { teamMember: { name: string } }) => a.teamMember.name,
              )
            : [],
        );
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!cancelled) setIsLoadingPub(false);
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
            ? value === ""
              ? ""
              : Number(value)
            : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const body = {
        title: formData.title,
        authorsRaw: formData.authorsRaw,
        journal: formData.journal || null,
        year: formData.year === "" ? null : formData.year,
        doi: formData.doi || null,
        pubType: formData.pubType,
        url: formData.url || null,
        abstract: formData.abstract || null,
        affiliation: formData.affiliation || null,
        status: formData.status,
        isVisible: formData.isVisible,
        hiddenManually: formData.hiddenManually,
        categoryId: formData.categoryId === "" ? null : formData.categoryId,
      };
      const res = await fetch(`/api/admin/publications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to update publication" }));
        throw new Error(
          errorData.error || `Failed to update publication (${res.status})`,
        );
      }
      router.push("/admin/publications");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (notFound) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-12 text-center">
        <h1 className="text-2xl font-bold text-[#0c0c48]">
          Publication not found
        </h1>
        <button
          onClick={() => router.push("/admin/publications")}
          className="mt-6 inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors"
        >
          Back to publications
        </button>
      </div>
    );
  }

  if (isLoadingPub) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-12 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#0a4479]/20 border-t-[#0a4479] animate-spin" />
      </div>
    );
  }

  return (
    <AdminForm
      title={formData.title.slice(0, 80) || "Edit publication"}
      kicker="Publications"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitButtonLabel="Save changes"
      cancelHref="/admin/publications"
    >
      {error && <FormErrorBanner message={error} />}

      <FormField
        label="Title"
        id="title"
        value={formData.title}
        onChange={handleChange}
        required
      />

      <FormField
        label="Authors (raw)"
        id="authorsRaw"
        type="textarea"
        rows={2}
        value={formData.authorsRaw}
        onChange={handleChange}
        helper={
          authors.length > 0
            ? `Linked team members: ${authors.join(", ")}`
            : "Comma-separated authors as they should appear publicly."
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Journal"
          id="journal"
          value={formData.journal}
          onChange={handleChange}
        />
        <FormField
          label="Year"
          id="year"
          type="number"
          value={formData.year === "" ? "" : formData.year}
          onChange={handleChange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="DOI"
          id="doi"
          placeholder="10.1234/abc.5678"
          value={formData.doi}
          onChange={handleChange}
        />
        <FormField
          label="External URL"
          id="url"
          type="url"
          value={formData.url}
          onChange={handleChange}
          helper="If both URL and DOI are set, URL wins on the public card."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Publication type"
          id="pubType"
          placeholder="Journal Article, Review, ..."
          value={formData.pubType}
          onChange={handleChange}
        />
        <FormField
          label="Category"
          id="categoryId"
          type="select"
          value={formData.categoryId === "" ? "" : String(formData.categoryId)}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              categoryId: e.target.value === "" ? "" : Number(e.target.value),
            }))
          }
          options={[
            { value: "", label: "Uncategorised" },
            ...categories.map((c) => ({
              value: String(c.id),
              label: c.name,
            })),
          ]}
        />
      </div>

      <FormField
        label="Abstract"
        id="abstract"
        type="textarea"
        rows={5}
        value={formData.abstract}
        onChange={handleChange}
      />

      <FormField
        label="Affiliation"
        id="affiliation"
        value={formData.affiliation}
        onChange={handleChange}
      />

      <FormField
        label="Status"
        id="status"
        type="select"
        value={formData.status}
        onChange={handleChange}
        required
        options={[
          { value: "Pending", label: "Pending — needs review" },
          { value: "Approved", label: "Approved — show on site" },
          { value: "Rejected", label: "Rejected — hide" },
        ]}
        helper="Only Approved publications appear on the public research page."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormCheckbox
          label="Visible to the public"
          id="isVisible"
          checked={formData.isVisible}
          onChange={handleChange}
        />
        <FormCheckbox
          label="Hide manually"
          id="hiddenManually"
          checked={formData.hiddenManually}
          onChange={handleChange}
          helper="Hide this entry even when it's approved — useful for embargoed items."
        />
      </div>
    </AdminForm>
  );
}
