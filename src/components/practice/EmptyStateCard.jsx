import { MascotAnimation } from "../common/MascotAnimation.jsx";

export function EmptyStateCard({ title, message, cta }) {
  const isLoading = title.toLowerCase().includes("loading");

  return (
    <article className={`card practice-empty-card mascot-card mascot-card--compact ${isLoading ? "branded-loading-state" : ""}`}>
      <div className="practice-empty-card__copy mascot-card-content">
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
      <div className="mascot-card-visual">
        {isLoading ? (
          <img className="branded-loading-state__icon" src="/app-icon.png" alt="" decoding="async" />
        ) : (
          <MascotAnimation
            type="thinking"
            size="small"
            motion="thinking"
            label="Thinking mascot for practice empty state"
          />
        )}
      </div>
      <button className="secondary-button" type="button" disabled>
        {cta}
      </button>
    </article>
  );
}
