import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { MascotAnimation } from "../common/MascotAnimation.jsx";
import { ArticleIcon, SearchIcon, TargetIcon, VideoIcon } from "../icons.jsx";
import { createLibraryResourceSignedUrl, getActiveLibraryResources } from "../../lib/libraryResources.js";

const filters = ["All", "PDF", "Speaking", "Pronunciation", "Vocabulary", "IELTS", "Reading", "Listening"];

function formatLabel(value) {
  if (!value) {
    return "Resource";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function previewText(value, maxLength = 160) {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
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
    ...(resource.tags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesFilter(resource, filter) {
  if (filter === "All") {
    return true;
  }

  const text = getResourceSearchText(resource);
  const normalizedFilter = filter.toLowerCase();

  if (normalizedFilter === "speaking") {
    return text.includes("speaking") || resource.resource_type === "speaking_prompt";
  }

  if (normalizedFilter === "pronunciation") {
    return text.includes("pronunciation") || resource.resource_type === "pronunciation_drill";
  }

  if (normalizedFilter === "vocabulary") {
    return text.includes("vocabulary");
  }

  if (normalizedFilter === "reading") {
    return resource.resource_type === "article" || resource.resource_type === "story" || text.includes("reading");
  }

  if (normalizedFilter === "pdf") {
    return resource.resource_type === "pdf";
  }

  return text.includes(normalizedFilter);
}

function isPdfResource(resource) {
  return resource.resource_type === "pdf" || Boolean(resource.file_path);
}

function isVideoResource(resource) {
  const text = getResourceSearchText(resource);
  return resource.resource_type === "video" || resource.resource_type === "video_url" || text.includes("video");
}

function LibraryState({ title, message }) {
  const isEmpty = title.toLowerCase().includes("empty") || title.toLowerCase().includes("no resources");
  const isSearch = title.toLowerCase().includes("match");
  const isLoading = title.toLowerCase().includes("loading");

  return (
    <section
      className={`card library-state-card mascot-card mascot-card--compact ${isLoading ? "branded-loading-state" : ""}`}
      aria-labelledby="library-state-title"
    >
      <div className="mascot-card-content">
        <p className="card-eyebrow card-eyebrow--red">Library</p>
        <h2 id="library-state-title">{title}</h2>
        <p>{message}</p>
        {isEmpty && <p className="library-state-card__note">Choose one resource, then use it in your next recording.</p>}
      </div>
      <div className="mascot-card-visual">
        {isLoading ? (
          <img className="branded-loading-state__icon" src="/app-icon.png" alt="" decoding="async" />
        ) : (
          <MascotAnimation
            type={isSearch ? "thinking" : isEmpty ? "welcome" : "thinking"}
            size="small"
            motion={isSearch ? "thinking" : isEmpty ? "idle" : "thinking"}
            label="Library support mascot"
          />
        )}
      </div>
    </section>
  );
}

function LibraryRoleNote({ role }) {
  if (role === "teacher") {
    return (
      <section className="card library-role-note">
        <p className="card-eyebrow card-eyebrow--red">Teacher note</p>
        <h2>Use school resources for speaking practice.</h2>
        <p>Create and manage your teaching resources from the teacher Library Manager.</p>
        <a className="secondary-button library-resource-link" href="/teacher/library">
          Open Teacher Library
        </a>
      </section>
    );
  }

  if (role === "admin") {
    return (
      <section className="card library-role-note">
        <p className="card-eyebrow card-eyebrow--red">Admin note</p>
        <h2>Manage school-wide resources from Admin Library.</h2>
        <p>This page shows active resources exactly as students and teachers see them.</p>
        <a className="secondary-button library-resource-link" href="/admin/library">
          Open Admin Library
        </a>
      </section>
    );
  }

  return null;
}

function LibraryControls({ search, activeFilter, onSearchChange, onFilterChange }) {
  return (
    <section className="library-search-card" aria-labelledby="library-search-title">
      <h2 id="library-search-title" className="sr-only">
        Search and filter library resources
      </h2>

      <label className="library-search-field">
        <SearchIcon />
        <span className="sr-only">Search resources</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by title, focus, level, or speaking need..."
        />
      </label>

      <div className="library-filter-chips" aria-label="Resource filters">
        {filters.map((filter) => (
          <button
            type="button"
            className={filter === activeFilter ? "is-active" : ""}
            aria-pressed={filter === activeFilter}
            onClick={() => onFilterChange(filter)}
            key={filter}
          >
            {filter}
          </button>
        ))}
      </div>
    </section>
  );
}

function ResourceCard({ resource }) {
  const [pdfStatus, setPdfStatus] = useState({
    type: "idle",
    message: ""
  });
  const tags = resource.tags || [];
  const description = resource.description || "";
  const contentPreview = previewText(resource.content, 180);
  const isPdf = isPdfResource(resource);
  const typeLabel = isPdf ? "PDF Resource" : formatLabel(resource.resource_type);

  async function handleOpenPdf() {
    if (!resource.file_path) {
      setPdfStatus({
        type: "error",
        message: "PDF file is not available for this resource yet."
      });
      return;
    }

    const pdfWindow = window.open("about:blank", "_blank");

    setPdfStatus({
      type: "loading",
      message: "Preparing PDF..."
    });

    const result = await createLibraryResourceSignedUrl(resource.file_path);

    if (result.error || !result.signedUrl) {
      pdfWindow?.close();
      setPdfStatus({
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
    setPdfStatus({
      type: "idle",
      message: ""
    });
  }

  return (
    <article className={`card library-resource-card ${resource.url || isPdf ? "library-resource-card--has-link" : ""} ${isPdf ? "library-resource-card--pdf" : ""}`}>
      <div className="library-resource-card__icon" aria-hidden="true">
        {isPdf ? (
          <ArticleIcon />
        ) : isVideoResource(resource) ? (
          <VideoIcon />
        ) : resource.resource_type === "article" || resource.resource_type === "story" ? (
          <ArticleIcon />
        ) : (
          <TargetIcon />
        )}
      </div>
      <div className="library-resource-card__content">
        <div className="library-resource-card__header">
          <div>
            <p className="card-eyebrow card-eyebrow--red">{formatLabel(resource.resource_type)}</p>
            <h2>{resource.title}</h2>
          </div>
          {resource.level && <span>{resource.level}</span>}
        </div>

        {description && <p className="library-resource-card__description">{description}</p>}

        {contentPreview && (
          <div className="library-resource-preview">
            <span>Use this in practice</span>
            <p>{contentPreview}</p>
          </div>
        )}

        <div className="library-resource-meta">
          <span>{typeLabel}</span>
          {resource.category && <span>Category: {resource.category}</span>}
          {resource.focus && <span>Focus: {resource.focus}</span>}
          {tags.length > 0 && <span>Focus: {tags.join(", ")}</span>}
          {resource.created_at && <span>Added {formatDate(resource.created_at)}</span>}
          {resource.is_global && <span>School resource</span>}
        </div>

        {isPdf && resource.file_path ? (
          <button
            className="secondary-button library-resource-link"
            type="button"
            onClick={handleOpenPdf}
            disabled={pdfStatus.type === "loading"}
          >
            {pdfStatus.type === "loading" ? "Opening PDF..." : "Open PDF"}
          </button>
        ) : resource.url ? (
          <a className="secondary-button library-resource-link" href={resource.url} target="_blank" rel="noreferrer">
            Open resource
          </a>
        ) : isPdf ? (
          <p className="library-resource-card__file-status">PDF file is not available for this resource yet.</p>
        ) : null}
        {pdfStatus.message && <p className={`library-resource-card__file-status is-${pdfStatus.type}`}>{pdfStatus.message}</p>}
      </div>
    </article>
  );
}

function LibraryMethodCard() {
  return (
    <section className="card library-method-card" aria-labelledby="library-method-title">
      <div className="library-method-card__intro">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Active learning</p>
          <h2 id="library-method-title">Prepare before you speak.</h2>
          <p>Choose one resource, then use it in your next recording. Prepare, speak, improve.</p>
        </div>
        <MascotAnimation
          type="explaining"
          size="small"
          motion="idle"
          label="Explaining mascot for active library learning"
        />
      </div>
      <div className="library-method-steps">
        <div className="library-method-step">
          <span>1</span>
          <div>
            <h3>Learn</h3>
            <p>Review one focused idea before practice.</p>
          </div>
        </div>
        <div className="library-method-step">
          <span>2</span>
          <div>
            <h3>Speak</h3>
            <p>Use the idea in a short recording.</p>
          </div>
        </div>
        <div className="library-method-step">
          <span>3</span>
          <div>
            <h3>Get feedback</h3>
            <p>Apply your teacher's next correction.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LibraryPage({ user, profile }) {
  const [state, setState] = useState({
    isLoading: true,
    error: "",
    resources: []
  });
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    let isMounted = true;

    async function loadResources() {
      setState({
        isLoading: true,
        error: "",
        resources: []
      });

      const result = await getActiveLibraryResources();

      if (!isMounted) {
        return;
      }

      setState({
        isLoading: false,
        error: result.error || "",
        resources: result.resources
      });
    }

    loadResources();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleResources = useMemo(() => {
    const query = search.trim().toLowerCase();

    return state.resources.filter((resource) => {
      const matchesSearch = query ? getResourceSearchText(resource).includes(query) : true;
      return matchesSearch && matchesFilter(resource, activeFilter);
    });
  }, [activeFilter, search, state.resources]);

  return (
    <div className="library-page">
      <Header
        user={user}
        title="Library"
        subtitle="Prepare, speak, and improve with focused resources."
      />

      <div className="library-grid">
        <LibraryRoleNote role={profile?.role} />
        <LibraryControls
          search={search}
          activeFilter={activeFilter}
          onSearchChange={setSearch}
          onFilterChange={setActiveFilter}
        />

        {state.isLoading ? (
          <LibraryState title="Loading library resources..." message="Please wait while we open your school library." />
        ) : state.error ? (
          <LibraryState title="Could not load the library." message={state.error} />
        ) : state.resources.length === 0 ? (
          <LibraryState
            title="No resources yet"
            message="Your teacher will add reading and writing materials here."
          />
        ) : visibleResources.length === 0 ? (
          <LibraryState
            title="No resources match this search."
            message="Try another search term, focus, or resource type."
          />
        ) : (
          <section className="library-resource-list" aria-label="Library resources">
            {visibleResources.map((resource) => (
              <ResourceCard resource={resource} key={resource.id} />
            ))}
          </section>
        )}

        <LibraryMethodCard />
      </div>
    </div>
  );
}
