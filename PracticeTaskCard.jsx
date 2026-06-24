import { ClockIcon, IconByName } from "../icons.jsx";

export function PracticeTaskCard({ task }) {
  const statusClass = task.status.toLowerCase().replaceAll("_", "-");
  const isStartable = ["assigned", "in_progress"].includes(task.status);
  const isReviewed = task.status === "reviewed";

  return (
    <article className="card practice-task-card">
      <div className="practice-task-card__icon" aria-hidden="true">
        <IconByName name={task.icon} />
      </div>
      <div className="practice-task-card__copy">
        <div className="practice-task-card__heading">
          <h3>{task.title}</h3>
          <span className={`status-badge status-badge--${statusClass}`}>
            {task.statusLabel || task.status}
          </span>
        </div>
        <p>{task.description}</p>

        <div className="practice-task-card__meta" aria-label="Task details">
          <span>{task.typeLabel}</span>
          {task.level && <span>{task.level}</span>}
          {task.focus && <span>{task.focus}</span>}
          <span>{task.dueDateLabel}</span>
        </div>

        <span className="practice-task-card__time">
          <ClockIcon />
          {task.time}
        </span>
      </div>
      {isStartable ? (
        <a className="primary-button" href={task.href || "/record"}>
          Start
        </a>
      ) : isReviewed ? (
        <a className="secondary-button" href="/feedback">
          View Feedback
        </a>
      ) : (
        <button className="secondary-button" type="button" disabled>
          Submitted
        </button>
      )}
    </article>
  );
}
