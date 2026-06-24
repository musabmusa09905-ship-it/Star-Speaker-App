import { MascotAnimation } from "../common/MascotAnimation.jsx";
import { ArrowRightIcon } from "../icons.jsx";

export function FeedbackEmptyState({ emptyState }) {
  return (
    <section className="card feedback-empty-card mascot-card mascot-card--compact" aria-labelledby="feedback-empty-title">
      <div className="feedback-empty-card__copy mascot-card-content">
        <p className="card-eyebrow card-eyebrow--red">Feedback status</p>
        <h2 id="feedback-empty-title">{emptyState.title}</h2>
        <p>{emptyState.message}</p>
      </div>

      <div className="mascot-card-visual">
        <MascotAnimation
          type="thinking"
          size="small"
          motion="thinking"
          label="Feedback waiting mascot"
        />
      </div>

      <a className="primary-button feedback-empty-card__cta" href="/practice">
        <span>{emptyState.cta}</span>
        <ArrowRightIcon />
      </a>

      <p className="feedback-empty-card__note">{emptyState.note}</p>
    </section>
  );
}
