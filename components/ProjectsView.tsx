"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/supabase";
import { Icons } from "./icons";

interface Props {
  initialProjects: Project[];
  dbError: string;
}

interface FormState {
  id: string | null;
  title: string;
  category: string;
  description: string;
  image_url: string;
  project_url: string;
}

const EMPTY: FormState = {
  id: null,
  title: "",
  category: "",
  description: "",
  image_url: "",
  project_url: "",
};

export default function ProjectsView({ initialProjects, dbError }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function notify(type: "ok" | "err", text: string) {
    setToast({ type, text });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (deleting) setDeleting(null);
        else if (formOpen) setFormOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleting, formOpen]);

  useEffect(() => {
    if (formOpen) {
      const t = setTimeout(() => titleRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [formOpen]);

  function openAdd() {
    setForm(EMPTY);
    setFormOpen(true);
  }

  function openEdit(project: Project) {
    setForm({
      id: project.id,
      title: project.title,
      category: project.category ?? "",
      description: project.description ?? "",
      image_url: project.image_url ?? "",
      project_url: project.project_url ?? "",
    });
    setFormOpen(true);
  }

  function closeForm() {
    if (busy) return;
    setFormOpen(false);
    setForm(EMPTY);
  }

  function update(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function refresh() {
    const res = await fetch("/api/projects", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setProjects(json.projects);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);

    const payload = {
      title: form.title,
      category: form.category,
      description: form.description,
      image_url: form.image_url,
      project_url: form.project_url,
    };

    try {
      const res = form.id
        ? await fetch(`/api/projects/${form.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error ?? "Something went wrong.");
        return;
      }

      notify("ok", form.id ? "Project updated successfully." : "Project created successfully.");
      setForm(EMPTY);
      setFormOpen(false);
      await refresh();
    } catch {
      notify("err", "Could not save the project. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        notify("err", json.error ?? "Delete failed.");
      } else {
        notify("ok", "Project deleted.");
        setProjects((prev) => prev.filter((p) => p.id !== deleting.id));
      }
    } catch {
      notify("err", "Could not delete the project.");
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  return (
    <div>
      {dbError && (
        <div className="banner error" role="alert">
          <span className="banner-icon">{Icons.alert}</span>
          <span>
            <strong>Database error:</strong> {dbError}
          </span>
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <h2>All projects</h2>
          <span className="count-pill">{projects.length}</span>
          <div className="card-action">
            <button type="button" className="btn" onClick={openAdd}>
              {Icons.plus}
              <span>Add Project</span>
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{Icons.image}</div>
            <h3>No projects yet</h3>
            <p>Add your first project and it will appear in the portfolio on the website.</p>
            <button type="button" className="btn" onClick={openAdd}>
              {Icons.plus}
              <span>Add your first project</span>
            </button>
          </div>
        ) : (
          <>
            <div className="list-head" style={{ gridTemplateColumns: "minmax(0, 2.2fr) 1fr 1.4fr auto" }}>
              <div>Project</div>
              <div>Category</div>
              <div>Link</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>
            {projects.map((project) => (
              <div className="list-row" style={{ gridTemplateColumns: "minmax(0, 2.2fr) 1fr 1.4fr auto" }} key={project.id}>
                <div className="event-title-cell">
                  {project.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="event-thumb" src={project.image_url} alt="" />
                  ) : (
                    <span className="event-thumb">{Icons.image}</span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div className="event-title">{project.title}</div>
                    {project.description && (
                      <div className="event-desc">{project.description}</div>
                    )}
                  </div>
                </div>
                <div className="event-cell">
                  {project.category ? (
                    <span className="badge upcoming">
                      <span className="badge-dot" />
                      {project.category}
                    </span>
                  ) : (
                    <span className="event-cell muted">—</span>
                  )}
                </div>
                <div className="event-cell muted">
                  {project.project_url ? (
                    <a
                      href={project.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--color-primary-600)", fontWeight: 600 }}
                    >
                      Visit link
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="row-actions">
                  <button type="button" className="btn ghost sm" onClick={() => openEdit(project)}>
                    {Icons.edit}
                    <span>Edit</span>
                  </button>
                  <button type="button" className="btn danger-ghost sm" onClick={() => setDeleting(project)}>
                    {Icons.trash}
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </section>

      {formOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-form-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h2 id="project-form-title">{form.id ? "Edit project" : "Add project"}</h2>
              <button type="button" className="modal-close" onClick={closeForm} aria-label="Close">
                {Icons.x}
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="field">
                  <label htmlFor="title">
                    Project title <span className="req">*</span>
                  </label>
                  <input
                    ref={titleRef}
                    id="title"
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. Sacco Online Banking Platform"
                    required
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="category">Category</label>
                    <input
                      id="category"
                      value={form.category}
                      onChange={(e) => update("category", e.target.value)}
                      placeholder="e.g. Web Development"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="image_url">Thumbnail URL</label>
                    <input
                      id="image_url"
                      value={form.image_url}
                      onChange={(e) => update("image_url", e.target.value)}
                      placeholder="https://.../photo.jpg"
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="project_url">Project URL</label>
                  <input
                    id="project_url"
                    value={form.project_url}
                    onChange={(e) => update("project_url", e.target.value)}
                    placeholder="https://... (where visitors can view it)"
                  />
                </div>
                <div className="field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Short summary of the project"
                  />
                  <div className="hint">A short summary shown on the website.</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn ghost" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Saving..." : form.id ? "Save changes" : "Add project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div
          className="modal-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleting(null);
          }}
        >
          <div className="modal small">
            <div className="modal-header">
              <h2 id="delete-dialog-title">Delete project?</h2>
              <button type="button" className="modal-close" onClick={() => setDeleting(null)} aria-label="Close">
                {Icons.x}
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: "var(--color-muted)", fontSize: 14 }}>
                <strong style={{ color: "var(--color-text)" }}>{deleting.title}</strong> will be
                permanently removed from the portfolio. This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn ghost" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button type="button" className="btn danger-ghost" onClick={confirmDelete} disabled={busy}>
                {Icons.trash}
                <span>{busy ? "Deleting..." : "Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.type === "ok" ? Icons.check : Icons.alert}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
