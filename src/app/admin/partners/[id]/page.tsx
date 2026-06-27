"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminForm,
  FormField,
  FormCheckbox,
  FormFileField,
  FormErrorBanner,
} from "@/components/admin/AdminForm";

type Props = {
  params: Promise<{ id: string }>;
};

type Form = {
  name: string;
  websiteUrl: string;
  group: "Collaborating" | "Industry";
  isPlaceholder: boolean;
  order: number;
};

const EMPTY: Form = {
  name: "",
  websiteUrl: "",
  group: "Collaborating",
  isPlaceholder: false,
  order: 0,
};

export default function EditPartner({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPartner, setIsLoadingPartner] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<Form>(EMPTY);
  const [logo, setLogo] = useState<File | null>(null);
  const [currentLogoPath, setCurrentLogoPath] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoadingPartner(true);
        const res = await fetch(`/api/admin/partner-logos/${id}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load partner");
        const data = await res.json();
        if (cancelled) return;
        setFormData({
          name: data.name ?? "",
          websiteUrl: data.websiteUrl ?? "",
          group: data.group === "Industry" ? "Industry" : "Collaborating",
          isPlaceholder: !!data.isPlaceholder,
          order: data.order ?? 0,
        });
        setCurrentLogoPath(data.logoPath ?? "");
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!cancelled) setIsLoadingPartner(false);
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
      const data = new FormData();
      data.append("name", formData.name);
      data.append("websiteUrl", formData.websiteUrl);
      data.append("group", formData.group);
      data.append("isPlaceholder", String(formData.isPlaceholder));
      data.append("order", String(formData.order));
      if (logo) data.append("file", logo);

      const res = await fetch(`/api/admin/partner-logos/${id}`, {
        method: "PATCH",
        body: data,
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to update partner" }));
        throw new Error(
          errorData.error || `Failed to update partner (${res.status})`,
        );
      }
      router.push("/admin/partners");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (notFound) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-12 text-center">
        <h1 className="text-2xl font-bold text-[#0c0c48]">Partner not found</h1>
        <button
          onClick={() => router.push("/admin/partners")}
          className="mt-6 inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors"
        >
          Back to partners
        </button>
      </div>
    );
  }

  if (isLoadingPartner) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-12 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#0a4479]/20 border-t-[#0a4479] animate-spin" />
      </div>
    );
  }

  return (
    <AdminForm
      title={`Edit ${formData.name || "partner"}`}
      kicker="Partners"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitButtonLabel="Save changes"
      cancelHref="/admin/partners"
    >
      {error && <FormErrorBanner message={error} />}

      <FormField
        label="Name"
        id="name"
        placeholder="University of Auckland"
        value={formData.name}
        onChange={handleChange}
        required
      />

      <FormField
        label="Website URL"
        id="websiteUrl"
        type="url"
        placeholder="https://example.com"
        value={formData.websiteUrl}
        onChange={handleChange}
        helper="Optional. If provided, the logo will link to this URL."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Group"
          id="group"
          type="select"
          value={formData.group}
          onChange={handleChange}
          required
          options={[
            { value: "Collaborating", label: "Collaborating partner" },
            { value: "Industry", label: "Industry partner" },
          ]}
          helper="Drives which marquee the logo appears in."
        />
        <FormField
          label="Order"
          id="order"
          type="number"
          value={formData.order}
          onChange={handleChange}
          min={0}
          step={1}
        />
      </div>

      <FormFileField
        label="Logo"
        id="logo"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        helper="PNG, JPEG, WebP, GIF, or SVG. Max 5MB. Leave blank to keep the current logo."
        currentValue={currentLogoPath}
        onChange={(e) => setLogo(e.target.files?.[0] || null)}
      />

      <FormCheckbox
        label="Placeholder slot"
        id="isPlaceholder"
        checked={formData.isPlaceholder}
        onChange={handleChange}
        helper="Reserve a slot for a partner whose artwork hasn't arrived yet."
      />
    </AdminForm>
  );
}
