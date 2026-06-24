import { ArrowRightIcon, ProgressIcon } from "../icons.jsx";

export function ProgressEmptyState({ emptyState }) {
  return (
    <section className="card progress-empty-card" aria-labelledby="progress-empty-title">
      <div className="progress-empty-card__icon" aria-hidden="true">
        <ProgressIcon />
      </div>

      <div className="progress-empty-card__copy">
        <p className="card-eyebrow card-eyebrow--red">Progress starter</p>
        <h2 id="progress-empty-title">{emptyState.title}</h2>
        <p>{emptyState.message}</p>
      </div>

      <a className="primary-button progress-empty-card__cta" href="/practice">
        <span>{emptyState.cta}</span>
        <ArrowRightIcon />
      </a>
    </section>
  );
}
