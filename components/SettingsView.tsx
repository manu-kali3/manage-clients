"use client";

import { useEffect, useRef, useState } from "react";
import {
  SITE_IMAGE_FIELDS,
  SITE_IMAGE_SECTIONS,
} from "@/lib/site-settings";

interface Props {
  initialSettings: Record<string, string>;
  dbError: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brevannew.vercel.app";

export default function SettingsView({ initialSettings, dbError }: Props) {
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetKey, setTargetKey] = useState<string | null>(null);

  function notify(type: "ok" | "err", text: string) {
    setToast({ type, text });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function resetToDefault(key: string) {
    const field = SITE_IMAGE_FIELDS.find((f) => f.key === key);
    if (field) update(key, field.defaultValue);
  }

  function previewUrl(value: string): string | null {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    return SITE_URL + value;
  }

  function openUpload(key: string) {
    setTargetKey(key);
    fileInputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !targetKey) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error ?? "Upload failed.");
        return;
      }
      update(targetKey, json.url as string);
      notify("ok", "Image uploaded. Click Save to apply it to the website.");
    } catch {
      notify("err", "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      setTargetKey(null);
    }
  }

  async function handleSave() {
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error ?? "Could not save settings.");
        return;
      }
      notify("ok", "Images saved. They will appear on the website on the next page load.");
    } catch {
      notify("err", "Could not save settings. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {dbError && (
        <div className="banner error" role="alert">
          <span className="banner-icon">{'\u26a0'}</span>
          <span>
            <strong>Database error:</strong> {dbError}
          </span>
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <h2>Site images</h2>
          <div className="card-action">
            <button type="button" className="btn" onClick={handleSave} disabled={busy}>
              {busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
        <div className="card-body">
          <p style={{ marginTop: 0, color: "var(--color-muted)", fontSize: 14 }}>
            Upload an image to copy its link into the field, or paste a full URL
            (a Supabase storage or hosting link) / a bundled file path like{" "}
            <code style={{ background: "var(--color-bg)", padding: "2px 6px", borderRadius: 4 }}>
              /assets/images/name.jpg
            </code>
            . Uploaded images are stored in Supabase Storage and stay public.
            Changes apply on the next page load.
          </p>
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {SITE_IMAGE_SECTIONS.map((section) => {
        const fields = SITE_IMAGE_FIELDS.filter((f) => f.section === section.id);
        if (fields.length === 0) return null;
        return (
          <section className="card" key={section.id}>
            <div className="card-header">
              <h2>{section.label}</h2>
            </div>
            <div className="card-body">
              <div className="field-row" style={{ alignItems: "flex-end" }}>
                {fields.map((field) => (
                  <div className="field settings-field" key={field.key}>
                    <label htmlFor={`img-${field.key}`}>{field.label}</label>
                    <div className="settings-control">
                      <div className="settings-preview">
                        {settings[field.key] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl(settings[field.key]) ?? ""}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.style.visibility = "hidden";
                            }}
                          />
                        ) : (
                          <span className="settings-preview-empty">no image</span>
                        )}
                      </div>
                      <div className="settings-input-row">
                        <input
                          id={`img-${field.key}`}
                          type="text"
                          value={settings[field.key] ?? ""}
                          onChange={(e) => update(field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => openUpload(field.key)}
                          disabled={busy}
                          title="Upload an image"
                        >
                          Upload
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => resetToDefault(field.key)}
                          title="Reset to bundled default"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    {field.hint && <div className="hint">{field.hint}</div>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="card">
        <div className="card-footer" style={{ justifyContent: "flex-end", paddingBottom: 22 }}>
          <button type="button" className="btn" onClick={handleSave} disabled={busy}>
            {busy ? "Saving..." : "Save all changes"}
          </button>
        </div>
      </section>

      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
