import { ClockIcon, IconByName } from "../icons.jsx";
import { buildTaskClarity } from "../../lib/taskClarity.js";
import { MinimumPracticeDetails } from "../common/MinimumPracticeDetails.jsx";

export function PracticeTaskCard({ task }) {
  const statusClass = task.status.toLowerCase().replaceAll("_", "-");
  const isStartable = ["assigned", "in_progress"].includes(task.status);
  const isReviewed = task.status === "reviewed";
  const isSubmitted = task.status === "submitted";
  const roleClass = task.priorityRole ? ` practice-task-card--${task.priorityRole}` : "";
  const startButtonClass = task.actionTone === "secondary" ? "secondary-button" : "primary-button";
  const startButtonLabel = task.actionLabel || (task.priorityRole === "current" ? "Start Today's Practice" : "Start Practice");
  const clarity = buildTaskClarity(task);
  const hasSupport = clarity.supportItems.length > 0;

  return (
    <article className={`card practice-task-card practice-task-card--${statusClass}${roleClass}${task.isDueToday ? " is-due-today" : ""}`}>
      <div className="practice-task-card__icon" aria-hidden="true">
        <IconByName name={task.icon} />
      </div>
      <div className="practice-task-card__copy">
        <div className="practice-task-card__heading">
          <h3>{task.title}</h3>
          <div className="practice-task-card__badges">
            {task.contextLabel && <span className="practice-context-badge">{task.contextLabel}</span>}
            {task.isDueToday && <span className="due-today-badge">Due today</span>}
            <span className={`status-badge status-badge--${statusClass}`}>
              {task.statusLabel || task.status}
            </span>
          </div>
        </div>
        <div className="task-clarity-mini">
          <p className="task-clarity-mini__label">Your Mission</p>
          <p>{clarity.mission}</p>
        </div>

        {isStartable ? (
          <a className={`${startButtonClass} practice-task-card__mobile-action`} href={task.href || "/record"}>
            {startButtonLabel}
          </a>
        ) : isReviewed ? (
          <a className="secondary-button practice-task-card__mobile-action" href="/feedback">
            View Feedback
          </a>
        ) : (
          <button className="secondary-button practice-task-card__mobile-action" type="button" disabled>
            {isSubmitted ? "Submitted" : "Completed"}
          </button>
        )}

        <div className="practice-task-card__meta" aria-label="Task details">
          <span>{task.typeLabel}</span>
          {task.focus && <span>{task.focus}</span>}
          <span>{task.dueDateLabel}</span>
        </div>

        <span className="practice-task-card__time">
          <ClockIcon />
          {task.time}
        </span>

        <div className="task-finish-line task-finish-line--compact" aria-label="Finish line">
          <strong>Finish Line</strong>
          <ul>
            {clarity.finishLine.slice(0, 2).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {!isStartable && (
          <div className={`practice-submission-state ${isReviewed ? "is-reviewed" : "is-submitted"}`}>
            <strong>{isReviewed ? "Feedback ready" : "Waiting for teacher feedback"}</strong>
            <p>
              {isReviewed
                ? "Your teacher reviewed this task. Open Feedback and choose one next focus."
                : "This task is complete. You do not need to submit again unless your teacher asks."}
            </p>
          </div>
        )}

      </div>
      {isStartable ? (
        <a className={`${startButtonClass} practice-task-card__desktop-action`} href={task.href || "/record"}>
          {startButtonLabel}
        </a>
      ) : isReviewed ? (
        <a className="secondary-button practice-task-card__desktop-action" href="/feedback">
          View Feedback
        </a>
      ) : (
        <button className="secondary-button practice-task-card__desktop-action" type="button" disabled>
          {isSubmitted ? "Submitted" : "Completed"}
        </button>
      )}
      {isStartable && <MinimumPracticeDetails task={task} compact />}
      {hasSupport && isStartable && (
        <details className="task-support-details">
          <summary>Need help? Optional support</summary>
          <div>
            {clarity.supportItems.slice(0, 2).map((item) => (
              <p key={item.label}>
                <strong>{item.label}:</strong> {item.value}
              </p>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}
