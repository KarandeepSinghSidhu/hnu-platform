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
  title: string;
  section: "BoardOfDirectors" | "ResearchTeam" | "Alumni";
  bio: string;
  orcidId: string;
  profileUrl: string;
  yearsActive: string;
  order: number;
  isVisible: boolean;
};

const EMPTY: Form = {
  name: "",
  title: "",
  section: "ResearchTeam",
  bio: "",
  orcidId: "",
  profileUrl: "",
  yearsActive: "",
  order: 0,
  isVisible: true,
};

export default function NewTeamMember() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Form>(EMPTY);
  const [photo, setPhoto] = useState<File | null>(null);

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
      data.append("title", formData.title);
      data.append("section", formData.section);
      data.append("bio", formData.bio);
      data.append("orcidId", formData.orcidId);
      data.append("profileUrl", formData.profileUrl);
      data.append("yearsActive", formData.yearsActive);
      data.append("order", String(formData.order));
      data.append("isVisible", String(formData.isVisible));
      if (photo) data.append("photo", photo);

      const res = await fetch("/api/admin/team", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to create team member" }));
        throw new Error(
          errorData.error || `Failed to create team member (${res.status})`,
        );
      }
      router.push("/admin/team");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminForm
      title="New team member"
      kicker="Team"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitButtonLabel="Create"
      cancelHref="/admin/team"
    >
      {error && <FormErrorBanner message={error} />}

      <FormField
        label="Name"
        id="name"
        placeholder="Dr Jane Doe"
        value={formData.name}
        onChange={handleChange}
        required
      />

      <FormField
        label="Title"
        id="title"
        placeholder="Senior Lecturer"
        value={formData.title}
        onChange={handleChange}
        required
      />

      <FormField
        label="Section"
        id="section"
        type="select"
        value={formData.section}
        onChange={handleChange}
        required
        options={[
          { value: "BoardOfDirectors", label: "Board of Directors" },
          { value: "ResearchTeam", label: "Research Team" },
          { value: "Alumni", label: "Alumni" },
        ]}
      />

      <FormField
        label="Biography"
        id="bio"
        type="textarea"
        rows={5}
        value={formData.bio}
        onChange={handleChange}
      />

      <FormFileField
        label="Photo"
        id="photo"
        accept="image/jpeg,image/png,image/webp"
        helper="JPEG, PNG, or WebP. Max 5MB. Optional — defaults to a placeholder."
        onChange={(e) => setPhoto(e.target.files?.[0] || null)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          label="ORCID ID"
          id="orcidId"
          placeholder="0000-0001-2345-6789"
          value={formData.orcidId}
          onChange={handleChange}
        />
        <FormField
          label="Profile URL"
          id="profileUrl"
          type="url"
          value={formData.profileUrl}
          onChange={handleChange}
        />
        <FormField
          label="Years active"
          id="yearsActive"
          placeholder="2018–present"
          value={formData.yearsActive}
          onChange={handleChange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Order"
          id="order"
          type="number"
          value={formData.order}
          onChange={handleChange}
          min={0}
          step={1}
        />
        <FormCheckbox
          label="Show on public site"
          id="isVisible"
          checked={formData.isVisible}
          onChange={handleChange}
        />
      </div>
    </AdminForm>
  );
}
