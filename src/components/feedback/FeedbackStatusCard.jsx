import { MascotAnimation } from "../common/MascotAnimation.jsx";
import { ArrowRightIcon } from "../icons.jsx";

export function FeedbackStatusCard({ title, message, note, cta, href = "/practice" }) {
  const isLoading = title?.toLowerCase().includes("loading");
  const mascotType = title?.toLowerCase().includes("ready") ? "encouragement" : "thinking";

  return (
    <section
      className={`card feedback-empty-card mascot-card mascot-card--compact ${isLoading ? "branded-loading-state" : ""}`}
      aria-labelledby="feedback-status-title"
    >
      <div className="feedback-empty-card__copy mascot-card-content">
        <p className="card-eyebrow card-eyebrow--red">Feedback status</p>
        <h2 id="feedback-status-title">{title}</h2>
        <p>{message}</p>
      </div>

      <div className="mascot-card-visual">
        {isLoading ? (
          <img className="branded-loading-state__icon" src="/app-icon.png" alt="" decoding="async" />
        ) : (
          <MascotAnimation
            type={mascotType}
            size="small"
            motion={mascotType === "thinking" ? "thinking" : "idle"}
            label={`${title} feedback mascot`}
          />
        )}
      </div>

      {cta && (
        <a className="primary-button feedback-empty-card__cta" href={href}>
          <span>{cta}</span>
          <ArrowRightIcon />
        </a>
      )}

      {note && <p className="feedback-empty-card__note">{note}</p>}
    </section>
  );
}
