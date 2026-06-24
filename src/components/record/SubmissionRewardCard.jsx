import { ClockIcon, FeedbackIcon, TargetIcon } from "../icons.jsx";

function formatTaskType(value) {
  if (!value) {
    return "Practice";
  }

  return String(value)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDuration(seconds) {
  const value = Number(seconds || 0);

  if (!value) {
    return "";
  }

  if (value < 60) {
    return `${value} seconds`;
  }

  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;

  return remainingSeconds
    ? `${minutes} min ${remainingSeconds} sec`
    : `${minutes} min`;
}

function formatSubmittedAt(value) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Submitted";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function SubmissionRewardCard({
  task,
  status = "submitted",
  durationSeconds = 0,
  submittedAt = "",
  detail = "",
  children
}) {
  const isReviewed = status === "reviewed";
  const isPartial = status === "partial";
  const duration = formatDuration(durationSeconds);
  const title = task?.title || "Submitted practice";
  const taskType = formatTaskType(task?.task_type);
  const submittedLabel = formatSubmittedAt(submittedAt);

  return (
    <section
      className={`card submission-reward-card submission-reward-card--${isReviewed ? "reviewed" : "submitted"}`}
      aria-labelledby="submission-reward-title"
    >
      <div className="submission-reward-card__hero">
        <div className="submission-reward-card__icon" aria-hidden="true">
          {isReviewed ? <FeedbackIcon /> : <TargetIcon />}
        </div>
        <div>
          <p className="card-eyebrow card-eyebrow--red">
            {isReviewed ? "Feedback ready" : "Practice complete"}
          </p>
          <h2 id="submission-reward-title">
            {isReviewed ? "This task has been reviewed." : "Today's speaking habit is protected."}
          </h2>
          <p>
            {isReviewed
              ? "Your teacher left feedback. Choose one correction and carry it into your next answer."
              : "One honest attempt counts. Your recording has been submitted."}
          </p>
        </div>
      </div>

      <div className="submission-reward-card__section">
        <strong>{isReviewed ? "Feedback is ready" : "Today counts"}</strong>
        <p>
          {isReviewed
            ? "You do not need to submit this task again."
            : "Your teacher can now review this attempt. You do not need to be perfect for today to count."}
        </p>
      </div>

      <div className="submission-reward-card__section">
        <strong>What you submitted</strong>
        <div className="submission-reward-card__facts">
          <span>Task: {title}</span>
          <span>Type: {taskType}</span>
          {task?.focus && <span>Focus: {task.focus}</span>}
          <span>Submitted: {submittedLabel}</span>
          {duration && (
            <span>
              <ClockIcon />
              Recording: {duration}
            </span>
          )}
        </div>
      </div>

      {children}

      <div className="submission-reward-card__section">
        <strong>What happens next</strong>
        <p>
          {isReviewed
            ? "Open Feedback to read the correction and next focus from your teacher."
            : "Feedback will appear when your teacher reviews your recording, usually as one useful correction and one next focus."}
        </p>
        {isPartial && detail && (
          <p className="submission-reward-card__detail">{detail}</p>
        )}
      </div>

      <div className="submission-reward-card__actions" aria-label="Next actions">
        <a className="primary-button" href={isReviewed ? "/feedback" : "/home"}>
          {isReviewed ? "View Feedback" : "Back to Home"}
        </a>
        {!isReviewed && (
          <>
            <a className="secondary-button" href="/practice">
              View Today&apos;s Practice
            </a>
            <a className="text-button" href="/feedback">
              Go to Feedback
            </a>
          </>
        )}
      </div>
    </section>
  );
}
