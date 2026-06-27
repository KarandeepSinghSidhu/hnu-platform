"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminForm,
  FormField,
  FormCheckbox,
  FormFileField,
  FormErrorBanner,
} from "@/components/admin/AdminForm";

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

export default function NewPartner() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Form>(EMPTY);
  const [logo, setLogo] = useState<File | null>(null);

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

      const res = await fetch("/api/admin/partner-logos", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to create partner" }));
        throw new Error(
          errorData.error || `Failed to create partner (${res.status})`,
        );
      }
      router.push("/admin/partners");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminForm
      title="New partner"
      kicker="Partners"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitButtonLabel="Create"
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
        helper="Optional. If provided, the logo will link here."
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
        helper="PNG, JPEG, WebP, GIF, or SVG. Max 5MB. Optional — if missing, the entry is marked as a placeholder."
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
