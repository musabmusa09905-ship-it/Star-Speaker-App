import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { ArticleIcon, BookIcon, ProfileIcon, SearchIcon, TargetIcon } from "../icons.jsx";
import {
  createLibraryResource,
  getAdminLibraryResources,
  libraryResourceTypes,
  maxLibraryPdfBytes,
  parseResourceTags,
  updateLibraryResource,
  updateLibraryResourceActive
} from "../../lib/adminLibraryResources.js";
import { formatLevelForStaff, heartOfEnglishLevels } from "../../lib/heartOfEnglishLevels.js";
import { createLibraryResourceSignedUrl } from "../../lib/libraryResources.js";

const filters = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" }
];

function formatLabel(value) {
  if (!value) {
    return "Not set";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function createInitialForm() {
  return {
    title: "",
    description: "",
    resource_type: "pdf",
    category: "",
    focus: "",
    level: "",
    tags: "",
    content: "",
    url: "",
    pdf_file: null,
    file_path: "",
    file_mime_type: "",
    file_size_bytes: "",
    active: true,
    is_global: true
  };
}

function createFormFromResource(resource) {
  if (!resource) {
    return createInitialForm();
  }

  return {
    title: resource.title || "",
    description: resource.description || "",
    resource_type: resource.resource_type || "pdf",
    category: resource.category || "",
    focus: resource.focus || "",
    level: resource.level || "",
    tags: Array.isArray(resource.tags) ? resource.tags.join("\n") : "",
    content: resource.content || "",
    url: resource.url || "",
    pdf_file: null,
    file_path: resource.file_path || "",
    file_mime_type: resource.file_mime_type || "",
    file_size_bytes: resource.file_size_bytes || "",
    active: resource.active !== false,
    is_global: resource.is_global !== false
  };
}

function getResourceSearchText(resource) {
  return [
    resource.title,
    resource.description,
    resource.content,
    resource.resource_type,
    resource.category,
    resource.focus,
    resource.level,
    resource.file_path,
    ...(resource.tags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function formatBytes(value) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AdminLibraryState({ title, message }) {
  return (
    <section className="card admin-state-card" aria-labelledby="admin-library-state-title">
      <div className="admin-state-card__icon" aria-hidden="true">
        <BookIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Library manager</p>
        <h2 id="admin-library-state-title">{title}</h2>
        <p>{message}</p>
      </div>
    </section>
  );
}

function AdminLibraryStats({ resources }) {
  const stats = [
    {
      label: "Resources",
      value: resources.length,
      icon: <BookIcon />
    },
    {
      label: "Active",
      value: resources.filter((resource) => resource.active).length,
      icon: <TargetIcon />
    },
    {
      label: "School-wide",
      value: resources.filter((resource) => resource.is_global).length,
      icon: <ProfileIcon />
    },
    {
      label: "Inactive",
      value: resources.filter((resource) => !resource.active).length,
      icon: <ArticleIcon />
    }
  ];

  return (
    <section className="admin-stats-grid" aria-label="Library resource stats">
      {stats.map((stat) => (
        <article className="card admin-stat-card" key={stat.label}>
          <div aria-hidden="true">{stat.icon}</div>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </article>
      ))}
    </section>
  );
}

function AdminLibraryFilters({ activeFilter, typeFilter, search, onFilterChange, onTypeChange, onSearchChange }) {
  return (
    <section className="card admin-library-controls" aria-labelledby="admin-library-filters-title">
      <div className="admin-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Find resources</p>
          <h2 id="admin-library-filters-title">Search and filter</h2>
        </div>
      </div>

      <label className="admin-library-search">
        <SearchIcon />
        <span className="sr-only">Search resources</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search resources..."
        />
      </label>

      <div className="admin-filter-row" aria-label="Resource status filters">
        {filters.map((filter) => (
          <button
            type="button"
            className={activeFilter === filter.value ? "is-active" : ""}
            onClick={() => onFilterChange(filter.value)}
            key={filter.value}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <label className="admin-library-type-filter">
        Type
        <select value={typeFilter} onChange={(event) => onTypeChange(event.target.value)}>
          <option value="all">All resource types</option>
          {libraryResourceTypes.map((type) => (
            <option value={type} key={type}>
              {formatLabel(type)}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function AdminLibraryForm({ form, status, profile, editingResource, onChange, onSubmit, onCancelEdit }) {
  const isSubmitting = status.type === "submitting";
  const isEditing = Boolean(editingResource);
  const isAdmin = profile?.role === "admin";
  const isPdf = form.resource_type === "pdf";
  const selectedFileName = form.pdf_file?.name || "";
  const existingPdfLabel = form.file_path ? `Current PDF: ${form.file_path.split("/").pop()}` : "";

  return (
    <section className="card admin-library-form-card" aria-labelledby="admin-library-form-title">
      <div className="admin-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">{isEditing ? "Edit resource" : "Add PDF Resource"}</p>
          <h2 id="admin-library-form-title">
            {isEditing ? "Update this library resource" : "Add PDF Resource"}
          </h2>
          <p className="admin-library-form-intro">
            Upload a focused PDF for students to read, prepare, and use in speaking or writing practice.
          </p>
        </div>
      </div>

      <form className="admin-library-form" onSubmit={onSubmit}>
        <div className="admin-library-form-grid">
          <label>
            Title
            <input
              type="text"
              value={form.title}
              disabled={isSubmitting}
              onChange={(event) => onChange("title", event.target.value)}
              placeholder="Weekend Reflection Builder"
              required
            />
          </label>

          <label>
            Resource type
            <select
              value={form.resource_type}
              disabled={isSubmitting}
              onChange={(event) => {
                const nextType = event.target.value;
                onChange("resource_type", nextType);
                if (nextType !== "pdf") {
                  onChange("pdf_file", null);
                }
              }}
              required
            >
              {libraryResourceTypes.map((type) => (
                <option value={type} key={type}>
                  {formatLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Resource category
            <select
              value=""
              disabled={isSubmitting}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  return;
                }

                const categoryMap = {
                  pdf: { type: "pdf", tag: "PDF", category: "Reading" },
                  speaking: { type: "speaking_prompt", tag: "Speaking" },
                  pronunciation: { type: "pronunciation_drill", tag: "Pronunciation" },
                  vocabulary: { type: "speaking_prompt", tag: "Vocabulary" },
                  ielts: { type: "speaking_prompt", tag: "IELTS" },
                  reading: { type: "article", tag: "Reading" },
                  listening: { type: "video", tag: "Listening" },
                  video: { type: "video", tag: "Video URL" }
                };
                const next = categoryMap[value];
                const currentTags = parseResourceTags(form.tags);
                const tags = currentTags.includes(next.tag) ? currentTags : [...currentTags, next.tag];
                onChange("resource_type", next.type);
                onChange("tags", tags.join("\n"));
                if (next.category) {
                  onChange("category", next.category);
                }
              }}
            >
              <option value="">Choose quick category</option>
              <option value="pdf">PDF Resource</option>
              <option value="speaking">Speaking</option>
              <option value="pronunciation">Pronunciation</option>
              <option value="vocabulary">Vocabulary</option>
              <option value="ielts">IELTS</option>
              <option value="reading">Reading</option>
              <option value="listening">Listening</option>
              <option value="video">Video URL</option>
            </select>
            <small>Categories map to existing database resource types and focus tags.</small>
          </label>

          <label>
            Category
            <input
              type="text"
              value={form.category}
              disabled={isSubmitting}
              onChange={(event) => onChange("category", event.target.value)}
              placeholder="Reading"
            />
          </label>

          <label>
            Focus
            <input
              type="text"
              value={form.focus}
              disabled={isSubmitting}
              onChange={(event) => onChange("focus", event.target.value)}
              placeholder="Weekend reflection"
            />
          </label>

          <label>
            Description
            <textarea
              rows="3"
              value={form.description}
              disabled={isSubmitting}
              onChange={(event) => onChange("description", event.target.value)}
              placeholder="A short speaking guide for clearer details."
            />
          </label>

          <label>
            Level
            <select
              value={form.level}
              disabled={isSubmitting}
              onChange={(event) => onChange("level", event.target.value)}
            >
              <option value="">No level selected</option>
              {heartOfEnglishLevels.map((level) => (
                <option value={level.code} key={level.code}>
                  {level.staffLabel}
                </option>
              ))}
              {form.level && !heartOfEnglishLevels.some((level) => level.code === form.level) && (
                <option value={form.level}>{formatLevelForStaff(form.level)}</option>
              )}
            </select>
          </label>

          <label>
            Focus tags
            <textarea
              rows="3"
              value={form.tags}
              disabled={isSubmitting}
              onChange={(event) => onChange("tags", event.target.value)}
              placeholder={"Fluency\nPast tense\nIELTS"}
            />
            <small>One tag per line or comma-separated. These power Library filters and task prefill focus.</small>
          </label>

          <label>
            Resource URL
            <input
              type="url"
              value={form.url}
              disabled={isSubmitting}
              onChange={(event) => onChange("url", event.target.value)}
              placeholder="https://..."
            />
            <small>Use URLs for video or external resources. Uploaded PDFs use private signed links.</small>
          </label>

          {isPdf && (
            <label className="admin-library-upload-field">
              PDF file
              <span className="admin-library-upload-box">
                <ArticleIcon />
                <span>
                  {selectedFileName || existingPdfLabel || "Choose a PDF file"}
                  <small>PDF only. Maximum {Math.round(maxLibraryPdfBytes / (1024 * 1024))} MB.</small>
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={isSubmitting}
                  onChange={(event) => onChange("pdf_file", event.target.files?.[0] || null)}
                />
              </span>
            </label>
          )}

          <label className="admin-library-content-field">
            Content
            <textarea
              rows="5"
              value={form.content}
              disabled={isSubmitting}
              onChange={(event) => onChange("content", event.target.value)}
              placeholder="Use this structure: what happened, who you were with, how you felt, and what you learned."
            />
          </label>
        </div>

        <div className="admin-library-checks">
          <label>
            <input
              type="checkbox"
              checked={form.active}
              disabled={isSubmitting}
              onChange={(event) => onChange("active", event.target.checked)}
            />
            Active
          </label>
          {isAdmin && (
            <label>
              <input
                type="checkbox"
                checked={form.is_global}
                disabled={isSubmitting}
                onChange={(event) => onChange("is_global", event.target.checked)}
              />
              School-wide resource
            </label>
          )}
        </div>

        <p className="admin-note">
          Active resources appear in student Library and teacher assignment after the library resource policies are applied. PDFs open through short-lived private links.
        </p>

        <div className="admin-library-form-actions">
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving resource..." : isEditing ? "Save Resource" : "Create Resource"}
          </button>
          {isEditing && (
            <button className="secondary-button" type="button" disabled={isSubmitting} onClick={onCancelEdit}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {status.message && (
        <div className={`admin-message admin-message--${status.type}`}>
          <p>{status.message}</p>
          {status.detail && <span>{status.detail}</span>}
        </div>
      )}
    </section>
  );
}

function canManageResource(profile, resource) {
  if (profile?.role === "admin") {
    return true;
  }

  return profile?.role === "teacher" && resource.created_by === profile.id;
}

function AdminOpenPdfButton({ resource }) {
  const [status, setStatus] = useState({
    type: "idle",
    message: ""
  });

  async function handleOpenPdf() {
    if (!resource.file_path) {
      setStatus({
        type: "error",
        message: "No PDF file is connected to this resource."
      });
      return;
    }

    const pdfWindow = window.open("about:blank", "_blank");

    setStatus({
      type: "loading",
      message: "Preparing PDF..."
    });

    const result = await createLibraryResourceSignedUrl(resource.file_path);

    if (result.error || !result.signedUrl) {
      pdfWindow?.close();
      setStatus({
        type: "error",
        message: result.error || "Could not open this PDF. Please try again."
      });
      return;
    }

    if (pdfWindow) {
      pdfWindow.location.href = result.signedUrl;
    } else {
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    }
    setStatus({
      type: "idle",
      message: ""
    });
  }

  return (
    <div className="admin-library-pdf-action">
      <button
        className="secondary-button"
        type="button"
        disabled={status.type === "loading"}
        onClick={handleOpenPdf}
      >
        {status.type === "loading" ? "Opening PDF..." : "Open PDF"}
      </button>
      {status.message && <span className={`admin-library-pdf-action__status is-${status.type}`}>{status.message}</span>}
    </div>
  );
}

function AdminResourceList({ resources, profile, onEdit, onToggleActive, togglingId }) {
  return (
    <section className="card admin-list-card" aria-labelledby="admin-library-list-title">
      <div className="admin-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Resources</p>
          <h2 id="admin-library-list-title">Library Resources</h2>
        </div>
        <span>{resources.length} shown</span>
      </div>

      {!resources.length ? (
        <p className="admin-note">No resources match this filter.</p>
      ) : (
        <div className="admin-library-resource-list">
          {resources.map((resource) => (
            <article className="admin-library-resource-row" key={resource.id}>
              <div className="admin-library-resource-row__icon" aria-hidden="true">
                {resource.resource_type === "article" || resource.resource_type === "story" || resource.resource_type === "pdf" ? (
                  <ArticleIcon />
                ) : (
                  <BookIcon />
                )}
              </div>

              <div className="admin-library-resource-row__body">
                <div className="admin-library-resource-row__header">
                  <div>
                    <span>{formatLabel(resource.resource_type)}</span>
                    <h3>{resource.title}</h3>
                  </div>
                  <strong className={resource.active ? "is-active" : ""}>
                    {resource.active ? "Active" : "Inactive"}
                  </strong>
                </div>

                {resource.description && <p>{resource.description}</p>}
                {!resource.description && resource.content && <p>{resource.content}</p>}

                <div className="admin-user-meta">
                  {resource.level && <span>{formatLevelForStaff(resource.level)}</span>}
                  {resource.category && <span>Category: {resource.category}</span>}
                  {resource.focus && <span>Focus: {resource.focus}</span>}
                  {resource.tags?.length > 0 && <span>Focus: {resource.tags.join(", ")}</span>}
                  {resource.file_size_bytes && <span>PDF: {formatBytes(resource.file_size_bytes)}</span>}
                  {resource.is_global && <span>School-wide</span>}
                  <span>Created {formatDate(resource.created_at)}</span>
                  <span>Updated {formatDate(resource.updated_at)}</span>
                </div>

                {resource.url && (
                  <a href={resource.url} target="_blank" rel="noreferrer">
                    Open resource URL
                  </a>
                )}
                {resource.resource_type === "pdf" && <AdminOpenPdfButton resource={resource} />}
              </div>

              {canManageResource(profile, resource) ? (
                <div className="admin-library-resource-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onEdit(resource)}
                  >
                    Edit
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={togglingId === resource.id}
                    onClick={() => onToggleActive(resource)}
                  >
                    {togglingId === resource.id
                      ? "Updating..."
                      : resource.active
                        ? "Mark inactive"
                        : "Mark active"}
                  </button>
                </div>
              ) : (
                <span className="admin-library-readonly">Read only</span>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminLibraryPage({ user, profile, managerRole = "admin" }) {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState(createInitialForm());
  const [editingResource, setEditingResource] = useState(null);
  const [formStatus, setFormStatus] = useState({
    type: "idle",
    message: "",
    detail: ""
  });
  const [togglingId, setTogglingId] = useState("");

  async function loadResources() {
    setIsLoading(true);
    setLoadError("");
    const result = await getAdminLibraryResources();
    setIsLoading(false);

    if (result.error) {
      setLoadError(result.error);
      setResources([]);
    } else {
      setResources(result.resources);
    }
  }

  useEffect(() => {
    if (profile?.role === "admin" || profile?.role === "teacher") {
      loadResources();
    }
  }, [profile?.role]);

  const visibleResources = useMemo(() => {
    const query = search.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesSearch = query ? getResourceSearchText(resource).includes(query) : true;
      const matchesStatus =
        activeFilter === "all" ||
        (activeFilter === "active" && resource.active) ||
        (activeFilter === "inactive" && !resource.active);
      const matchesType = typeFilter === "all" || resource.resource_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [activeFilter, resources, search, typeFilter]);

  function updateFormField(field, value) {
    setFormStatus({
      type: "idle",
      message: "",
      detail: ""
    });
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleEditResource(resource) {
    setEditingResource(resource);
    setForm(createFormFromResource(resource));
    setFormStatus({
      type: "idle",
      message: "",
      detail: ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingResource(null);
    setForm(createInitialForm());
    setFormStatus({
      type: "idle",
      message: "",
      detail: ""
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormStatus({
      type: "submitting",
      message: editingResource ? "Saving resource..." : "Creating resource...",
      detail: ""
    });

    const result = editingResource
      ? await updateLibraryResource({
        profile,
        resource: editingResource,
        values: form
      })
      : await createLibraryResource({
        profile,
        values: form
      });

    if (result.error) {
      setFormStatus({
        type: "error",
        message: editingResource
          ? "Could not update resource. Please try again."
          : "Could not create resource. Please try again.",
        detail: result.error
      });
      return;
    }

    setResources((current) => {
      if (editingResource) {
        return current.map((resource) => (resource.id === result.resource.id ? result.resource : resource));
      }

      return [result.resource, ...current];
    });
    setForm(createInitialForm());
    setEditingResource(null);
    setFormStatus({
      type: "success",
      message: editingResource ? "Resource updated successfully." : "Resource created successfully.",
      detail: `${result.resource.title} is now saved in public.library_resources.`
    });
  }

  async function handleToggleActive(resource) {
    if (!canManageResource(profile, resource)) {
      setFormStatus({
        type: "error",
        message: "You can only update resources you created.",
        detail: ""
      });
      return;
    }

    setTogglingId(resource.id);
    const result = await updateLibraryResourceActive({
      resourceId: resource.id,
      active: !resource.active
    });
    setTogglingId("");

    if (result.error) {
      setFormStatus({
        type: "error",
        message: "Could not update resource status.",
        detail: result.error
      });
      return;
    }

    setResources((current) => current.map((item) => (item.id === result.resource.id ? result.resource : item)));
    setFormStatus({
      type: "success",
      message: "Resource status updated.",
      detail: `${result.resource.title} is now ${result.resource.active ? "active" : "inactive"}.`
    });
  }

  const isAllowed =
    (managerRole === "admin" && profile?.role === "admin") ||
    (managerRole === "teacher" && profile?.role === "teacher");

  if (!isAllowed) {
    return (
      <div className="admin-library-page">
        <Header user={user} title="Library Manager" subtitle="Create focused learning resources." />
        <AdminLibraryState
          title={
            managerRole === "admin"
              ? "Library management is only available for admin accounts."
              : "Library management is only available for teacher accounts."
          }
          message={
            managerRole === "admin"
              ? "Use an admin account to create and manage school resources."
              : "Use a teacher account to create resources for speaking practice."
          }
        />
      </div>
    );
  }

  const pageTitle = managerRole === "admin" ? "Admin Library" : "Teacher Library";

  return (
    <div className="admin-library-page">
      <Header
        user={user}
        title={pageTitle}
        subtitle="Create focused materials students can use before speaking practice."
      />

      {isLoading ? (
        <AdminLibraryState title="Loading library resources..." message="Please wait while we load school materials." />
      ) : loadError ? (
        <AdminLibraryState title="Could not load library resources." message={loadError} />
      ) : (
        <div className="admin-library-grid">
          <AdminLibraryStats resources={resources} />
          <AdminLibraryForm
            form={form}
            status={formStatus}
            profile={profile}
            editingResource={editingResource}
            onChange={updateFormField}
            onSubmit={handleSubmit}
            onCancelEdit={handleCancelEdit}
          />
          <AdminLibraryFilters
            activeFilter={activeFilter}
            typeFilter={typeFilter}
            search={search}
            onFilterChange={setActiveFilter}
            onTypeChange={setTypeFilter}
            onSearchChange={setSearch}
          />
          <AdminResourceList
            resources={visibleResources}
            profile={profile}
            onEdit={handleEditResource}
            onToggleActive={handleToggleActive}
            togglingId={togglingId}
          />
        </div>
      )}
    </div>
  );
}
