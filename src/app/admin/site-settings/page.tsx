"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_FAVICON,
  DEFAULT_LOGO_LIGHT,
  DEFAULT_LOGO_DARK,
  DEFAULT_DONATE_URL,
  type SiteBranding,
} from "@/lib/branding";

type Target = "favicon" | "logoLight" | "logoDark";

// target → the SiteBranding field it edits (shared by storedPath + the cards).
const COLUMN: Record<Target, keyof SiteBranding> = {
  favicon: "faviconPath",
  logoLight: "logoLightPath",
  logoDark: "logoDarkPath",
};

type AssetCard = {
  target: Target;
  title: string;
  description: string;
  accept: string;
  acceptHint: string;
  defaultPath: string;
  // Preview the asset on the background it really sits on (the white-on-dark
  // logo is invisible on white).
  previewOnDark: boolean;
};

const CARDS: AssetCard[] = [
  {
    target: "favicon",
    title: "Favicon",
    description: "The small icon shown in browser tabs and bookmarks.",
    accept: "image/png,image/x-icon,.png,.ico",
    acceptHint: "PNG or ICO, up to 1MB. Square images look best.",
    defaultPath: DEFAULT_FAVICON,
    previewOnDark: true,
  },
  {
    target: "logoLight",
    title: "Logo — light (on dark)",
    description: "The white logo used on the dark desktop navbar.",
    accept: "image/png,image/webp,.png,.webp",
    acceptHint:
      "PNG or WebP with a transparent background, up to 5MB. (SVG uploads aren't allowed for security; resetting restores the built-in SVG.)",
    defaultPath: DEFAULT_LOGO_LIGHT,
    previewOnDark: true,
  },
  {
    target: "logoDark",
    title: "Logo — dark (on light)",
    description: "The blue logo used on the white mobile bar.",
    accept: "image/png,image/webp,.png,.webp",
    acceptHint: "PNG or WebP with a transparent background, up to 5MB.",
    defaultPath: DEFAULT_LOGO_DARK,
    previewOnDark: false,
  },
];

export default function AdminSiteSettings() {
  const [settings, setSettings] = useState<SiteBranding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyTarget, setBusyTarget] = useState<Target | null>(null);
  const [savedTarget, setSavedTarget] = useState<Target | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRefs = useRef<Partial<Record<Target, HTMLInputElement | null>>>({});

  // The donation link is a text setting (not a file), so it has its own small
  // bit of state alongside the image cards.
  const [donateInput, setDonateInput] = useState("");
  const [donateBusy, setDonateBusy] = useState(false);
  const [donateSaved, setDonateSaved] = useState(false);
  const donateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchSettings();
    return () => {
      if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
      if (donateTimerRef.current !== null) clearTimeout(donateTimerRef.current);
    };
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/site-settings");
      if (!res.ok) throw new Error("Failed to load site settings");
      const data = await res.json();
      setSettings(data);
      // Show the *effective* link in the field (the custom one, or the built-in
      // default) so the admin can always see and edit the current value rather
      // than an empty box.
      setDonateInput(data.donateUrl || DEFAULT_DONATE_URL);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  function storedPath(target: Target): string {
    return settings ? settings[COLUMN[target]] : "";
  }

  async function submit(target: Target, body: FormData) {
    setBusyTarget(target);
    setError(null);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update site settings");
      }
      setSettings(await res.json());
      const input = fileInputRefs.current[target];
      if (input) input.value = "";
      if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
      setSavedTarget(target);
      savedTimerRef.current = setTimeout(
        () => setSavedTarget((prev) => (prev === target ? null : prev)),
        2500,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setBusyTarget(null);
    }
  }

  function upload(target: Target, file: File) {
    const body = new FormData();
    body.set("target", target);
    body.set("file", file);
    void submit(target, body);
  }

  function reset(target: Target) {
    const body = new FormData();
    body.set("target", target);
    body.set("reset", "true");
    void submit(target, body);
  }

  async function submitDonate(body: FormData) {
    setDonateBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update donation link");
      }
      const data = await res.json();
      setSettings(data);
      setDonateInput(data.donateUrl || DEFAULT_DONATE_URL);
      if (donateTimerRef.current !== null) clearTimeout(donateTimerRef.current);
      setDonateSaved(true);
      donateTimerRef.current = setTimeout(() => setDonateSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDonateBusy(false);
    }
  }

  function saveDonate() {
    const body = new FormData();
    body.set("target", "donateUrl");
    body.set("value", donateInput);
    void submitDonate(body);
  }

  function resetDonate() {
    const body = new FormData();
    body.set("target", "donateUrl");
    body.set("reset", "true");
    void submitDonate(body);
  }

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[2px] text-[#0a4479]/70">
          Logos
        </p>
        <h1 className="text-4xl font-extrabold text-[#0c0c48] mt-1 tracking-tight">
          Branding
        </h1>
        <p className="text-[#0a4479]/80 mt-2 max-w-2xl">
          The favicon and the two navbar logo variants. Uploading replaces the
          asset site-wide; Reset restores the built-in default. Browsers cache
          favicons aggressively — the new one can take a hard refresh to show.
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6">
          {error}
        </div>
      )}

      {!settings ? (
        <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-12 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-[#0a4479]/20 border-t-[#0a4479] animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {CARDS.map((card) => {
            const stored = storedPath(card.target);
            const isDefault = stored === "";
            const shownPath = stored || card.defaultPath;
            const busy = busyTarget === card.target;
            const justSaved = savedTarget === card.target;
            return (
              <section
                key={card.target}
                className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6 flex flex-col gap-4"
              >
                <div>
                  <h2 className="text-lg font-bold text-[#0c0c48]">
                    {card.title}
                  </h2>
                  <p className="text-sm text-[#0a4479]/80 mt-1">
                    {card.description}
                  </p>
                </div>

                <div
                  className={`rounded-xl flex items-center justify-center h-32 px-4 ${
                    card.target === "favicon"
                      ? // Browser tabs can be light or dark, so preview the favicon
                        // on a split background — visible whatever colour it is.
                        "border-2 border-[#cac7c7] bg-[linear-gradient(to_right,#0c0c48_50%,#ffffff_50%)]"
                      : card.previewOnDark
                        ? "bg-[#0c0c48]"
                        : "bg-white border-2 border-[#cac7c7]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- raw preview of an admin-managed asset; next/image is configured unoptimized anyway */}
                  <img
                    src={shownPath}
                    alt={`${card.title} preview`}
                    className={
                      card.target === "favicon"
                        ? "h-12 w-12 object-contain"
                        : "max-h-20 max-w-full object-contain"
                    }
                  />
                </div>

                <p className="text-xs text-[#0a4479]/70">
                  {isDefault ? "Using the built-in default." : `Custom upload: ${stored}`}
                </p>

                <label className="inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors cursor-pointer w-fit">
                  {busy ? "Working..." : justSaved ? "Saved" : "Upload new"}
                  <input
                    ref={(el) => {
                      fileInputRefs.current[card.target] = el;
                    }}
                    type="file"
                    accept={card.accept}
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) upload(card.target, file);
                    }}
                  />
                </label>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-[#0a4479]/60 flex-1">
                    {card.acceptHint}
                  </p>
                  <button
                    onClick={() => reset(card.target)}
                    disabled={busy || isDefault}
                    className="text-sm font-semibold text-[#0a4479] underline underline-offset-2 hover:text-[#083559] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    Reset to default
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {settings && (
        <section className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6 mt-6 flex flex-col gap-4 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-[#0c0c48]">Donation link</h2>
            <p className="text-sm text-[#0a4479]/80 mt-1">
              The web address the Donations button in the navbar opens (desktop
              top bar and mobile menu). Update it any time. No developer needed.
            </p>
          </div>

          <input
            type="url"
            inputMode="url"
            value={donateInput}
            onChange={(e) => setDonateInput(e.target.value)}
            placeholder={DEFAULT_DONATE_URL}
            disabled={donateBusy}
            className="w-full rounded-xl border-2 border-[#cac7c7] px-4 py-2.5 text-sm text-[#0c0c48] focus:border-[#0a4479] focus:outline-none disabled:opacity-60"
          />

          <p className="text-xs text-[#0a4479]/70">
            {settings.donateUrl === ""
              ? "This is the built-in default (the University of Auckland giving page). Edit it above to point the button somewhere else."
              : "Using a custom link. Reset to restore the University of Auckland giving page."}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={saveDonate}
              disabled={donateBusy}
              className="inline-flex items-center justify-center bg-[#0a4479] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {donateBusy ? "Saving..." : donateSaved ? "Saved" : "Save link"}
            </button>
            <button
              onClick={resetDonate}
              disabled={donateBusy || settings.donateUrl === ""}
              className="text-sm font-semibold text-[#0a4479] underline underline-offset-2 hover:text-[#083559] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Reset to default
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
