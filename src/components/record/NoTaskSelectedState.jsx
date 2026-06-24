import { MascotAnimation } from "../common/MascotAnimation.jsx";

export function NoTaskSelectedState({ emptyState }) {
  const isLoading = emptyState.title?.toLowerCase().includes("loading");

  return (
    <section
      className={`card no-task-state mascot-empty-state ${isLoading ? "branded-loading-state" : ""}`}
      aria-labelledby="no-task-title"
    >
      <div className="mascot-empty-state__visual">
        {isLoading ? (
          <img className="branded-loading-state__icon" src="/app-icon.png" alt="" decoding="async" />
        ) : (
          <MascotAnimation
            type="thinking"
            size="hero"
            motion="thinking"
            label="Thinking mascot for choosing a recording task"
          />
        )}
      </div>
      <h2 id="no-task-title">{emptyState.title}</h2>
      <p>{emptyState.message}</p>
      <p className="no-task-state__support">Your speaking practice starts with one small recording.</p>
      {emptyState.cta && (
        <a className="primary-button" href="/practice">
          {emptyState.cta}
        </a>
      )}
    </section>
  );
}
