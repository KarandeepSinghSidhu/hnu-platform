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

export default function EditTeamMember({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMember, setIsLoadingMember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<Form>(EMPTY);
  const [photo, setPhoto] = useState<File | null>(null);
  const [currentPhotoPath, setCurrentPhotoPath] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoadingMember(true);
        const res = await fetch(`/api/admin/team/${id}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load team member");
        const data = await res.json();
        if (cancelled) return;
        setFormData({
          name: data.name ?? "",
          title: data.title ?? "",
          section: data.section ?? "ResearchTeam",
          bio: data.bio ?? "",
          orcidId: data.orcidId ?? "",
          profileUrl: data.profileUrl ?? "",
          yearsActive: data.yearsActive ?? "",
          order: data.order ?? 0,
          isVisible: data.isVisible !== false,
        });
        setCurrentPhotoPath(data.photoPath ?? "");
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!cancelled) setIsLoadingMember(false);
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
      data.append("title", formData.title);
      data.append("section", formData.section);
      data.append("bio", formData.bio);
      data.append("orcidId", formData.orcidId);
      data.append("profileUrl", formData.profileUrl);
      data.append("yearsActive", formData.yearsActive);
      data.append("order", String(formData.order));
      data.append("isVisible", String(formData.isVisible));
      if (photo) data.append("photo", photo);

      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PATCH",
        body: data,
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to update team member" }));
        throw new Error(
          errorData.error || `Failed to update team member (${res.status})`,
        );
      }
      router.push("/admin/team");
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
          Team member not found
        </h1>
        <button
          onClick={() => router.push("/admin/team")}
          className="mt-6 inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors"
        >
          Back to team
        </button>
      </div>
    );
  }

  if (isLoadingMember) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-12 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#0a4479]/20 border-t-[#0a4479] animate-spin" />
      </div>
    );
  }

  return (
    <AdminForm
      title={`Edit ${formData.name || "team member"}`}
      kicker="Team"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitButtonLabel="Save changes"
      cancelHref="/admin/team"
    >
      {error && <FormErrorBanner message={error} />}

      <FormField
        label="Name"
        id="name"
        value={formData.name}
        onChange={handleChange}
        required
      />

      <FormField
        label="Title"
        id="title"
        value={formData.title}
        onChange={handleChange}
        required
        helper="e.g. Managing Director, Senior Lecturer, PhD Candidate"
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
        helper="Optional. Shown on the team detail page if implemented."
      />

      <FormFileField
        label="Photo"
        id="photo"
        accept="image/jpeg,image/png,image/webp"
        helper="JPEG, PNG, or WebP. Max 5MB. Leave blank to keep the current photo."
        currentValue={currentPhotoPath}
        onChange={(e) => setPhoto(e.target.files?.[0] || null)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          label="ORCID ID"
          id="orcidId"
          placeholder="0000-0001-2345-6789"
          value={formData.orcidId}
          onChange={handleChange}
          helper="Drives the publications sync."
        />
        <FormField
          label="Profile URL"
          id="profileUrl"
          type="url"
          placeholder="https://profiles.auckland.ac.nz/..."
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
