import { useEffect, useState } from "react";
import { MascotAnimation } from "../common/MascotAnimation.jsx";
import { ArrowRightIcon, FeedbackIcon, MicIcon, StarIcon, TargetIcon } from "../icons.jsx";
import { createSubmissionPlaybackUrl } from "../../lib/studentSubmissions.js";

function formatTaskType(value) {
  if (!value) {
    return "Practice";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value) {
  if (!value) {
    return "Submitted recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDuration(seconds) {
  if (!seconds) {
    return "Duration not saved";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (!minutes) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function formatStatus(value) {
  if (!value) {
    return "Submitted";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getScoreItems(feedback) {
  return [
    { label: "Clarity", value: feedback?.clarity_score },
    { label: "Confidence", value: feedback?.confidence_score },
    { label: "Accuracy", value: feedback?.accuracy_score }
  ].filter((item) => item.value || item.value === 0);
}

function getApplicationTarget({ correction, nextFocus, teacherComment }) {
  if (correction) {
    return {
      label: "Correction to apply",
      text: correction
    };
  }

  if (nextFocus) {
    return {
      label: "Next focus to apply",
      text: nextFocus
    };
  }

  if (teacherComment) {
    return {
      label: "Feedback to carry forward",
      text: "Use your teacher's note as a guide for your next recording."
    };
  }

  return {
    label: "Next practice target",
    text: "Make one clear answer from beginning to end."
  };
}

function FeedbackScore({ label, value }) {
  return (
    <span>
      {label}: {value}/5
    </span>
  );
}

function CoachingSection({ className = "", eyebrow, title, children, icon }) {
  return (
    <section className={`submission-coaching-section ${className}`.trim()}>
      <div className="submission-coaching-section__header">
        {icon && <span className="submission-coaching-section__icon">{icon}</span>}
        <div>
          {eyebrow && <p>{eyebrow}</p>}
          <h4>{title}</h4>
        </div>
      </div>
      <div className="submission-coaching-section__body">{children}</div>
    </section>
  );
}

function SubmissionFeedback({ feedback }) {
  if (!feedback) {
    return (
      <div className="submission-review submission-review--waiting submission-review--with-mascot">
        <div className="submission-review__copy">
          <p className="submission-review__status">Waiting for teacher review</p>
          <p>Your recording is waiting for teacher review. Keep practicing while you wait.</p>
        </div>
        <MascotAnimation
          type="thinking"
          size="small"
          motion="thinking"
          label="Thinking mascot while waiting for teacher review"
        />
        <a className="secondary-button submission-review__cta" href="/practice">
          Go to Practice
        </a>
      </div>
    );
  }

  const teacherComment = cleanText(feedback.teacher_comment);
  const correction = cleanText(feedback.correction_note);
  const encouragement = cleanText(feedback.encouragement_note);
  const nextFocus = cleanText(feedback.next_focus);
  const scoreItems = getScoreItems(feedback);
  const applicationTarget = getApplicationTarget({ correction, nextFocus, teacherComment });

  return (
    <div className="submission-review submission-review--reviewed">
      <div className="submission-review__hero">
        <div>
          <p className="submission-review__status">Feedback ready</p>
          <h4>Your teacher reviewed your practice</h4>
          <p>Start with one useful correction, then carry it into your next recording.</p>
        </div>
        <MascotAnimation
          type="encouragement"
          size="small"
          motion="idle"
          label="Encouragement mascot for reviewed feedback"
        />
      </div>

      <CoachingSection
        className="submission-coaching-section--well"
        eyebrow="What you did well"
        title="Your effort gave your teacher something real to review."
        icon={<StarIcon />}
      >
        <p>
          {teacherComment ||
            "You completed the practice and gave your teacher something real to review."}
        </p>
      </CoachingSection>

      <CoachingSection
        className="submission-coaching-section--correction"
        eyebrow="Fix this first"
        title="One main correction"
        icon={<TargetIcon />}
      >
        <p>
          {correction ||
            "Your teacher has not added a specific correction yet. For now, review the general feedback and focus on your next practice."}
        </p>
        <span>One useful correction is enough for today.</span>
      </CoachingSection>

      <CoachingSection
        className="submission-coaching-section--model"
        eyebrow="Better model"
        title="Try this in your next answer"
        icon={<FeedbackIcon />}
      >
        <p>{correction ? "Use the correction above in your next answer." : "Use the feedback above in your next answer."}</p>
      </CoachingSection>

      <div className="submission-next-task-focus submission-next-task-focus--with-mascot">
        <div>
          <span>Next focus</span>
          <p>{nextFocus || "In your next practice, focus on making one clear answer from beginning to end."}</p>
          {nextFocus && <strong>{nextFocus}</strong>}
        </div>
        <MascotAnimation
          type="progress"
          size="small"
          motion="progress"
          label="Progress mascot for using feedback in the next task"
        />
      </div>

      <CoachingSection className="submission-coaching-section--encouragement" title="Keep the habit moving">
        <p>
          {encouragement ||
            "Keep going. The goal is not perfection; the goal is one honest attempt and one useful improvement."}
        </p>
      </CoachingSection>

      {scoreItems.length > 0 && (
        <div className="submission-score-block">
          <span>Scores and details</span>
          <div className="submission-score-row" aria-label="Teacher scores">
            {scoreItems.map((item) => (
              <FeedbackScore label={item.label} value={item.value} key={item.label} />
            ))}
          </div>
        </div>
      )}

      <div className="submission-apply-bridge" aria-label="Apply feedback in your next practice">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Apply this next</p>
          <h4>Use one thing in your next recording</h4>
          <span>{applicationTarget.label}</span>
          <strong>{applicationTarget.text}</strong>
          <p>Read it once. Then speak naturally. Your goal is to apply one thing, not sound perfect.</p>
        </div>
        <a className="primary-button" href="/practice">
          <span>Go to Today's Practice</span>
          <ArrowRightIcon />
        </a>
      </div>
    </div>
  );
}

function PrivateAudioPlayback({ submission, currentStudentId }) {
  const [playback, setPlayback] = useState({
    status: submission.audio_path ? "loading" : "missing",
    signedUrl: "",
    error: ""
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadPlaybackUrl() {
      if (!submission.audio_path) {
        setPlayback({
          status: "missing",
          signedUrl: "",
          error: ""
        });
        return;
      }

      if (submission.student_id !== currentStudentId) {
        setPlayback({
          status: "error",
          signedUrl: "",
          error: "You do not have access to this recording."
        });
        return;
      }

      setPlayback({
        status: "loading",
        signedUrl: "",
        error: ""
      });

      const result = await createSubmissionPlaybackUrl({
        submission,
        currentStudentId,
        expiresInSeconds: 300
      });

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setPlayback({
          status: "error",
          signedUrl: "",
          error: result.error
        });
        return;
      }

      setPlayback({
        status: "ready",
        signedUrl: result.signedUrl,
        error: ""
      });
    }

    loadPlaybackUrl();

    return () => {
      isMounted = false;
    };
  }, [currentStudentId, refreshKey, submission]);

  if (!submission.audio_path || playback.status === "missing") {
    return (
      <div className="private-audio-note">
        No recording file was found for this submission.
      </div>
    );
  }

  if (playback.status === "loading") {
    return (
      <div className="private-audio-note">
        Preparing private playback...
      </div>
    );
  }

  if (playback.status === "error") {
    return (
      <div className="private-audio-note private-audio-note--error">
        <p>Could not load private playback. Please try again.</p>
        {playback.error && <span>{playback.error}</span>}
        <button type="button" className="text-button" onClick={() => setRefreshKey((key) => key + 1)}>
          Refresh playback
        </button>
      </div>
    );
  }

  return (
    <div className="private-audio-player">
      <div>
        <p>Your submitted recording</p>
        <span>This private playback link expires shortly.</span>
      </div>
      <audio controls src={playback.signedUrl}>
        Your browser does not support audio playback.
      </audio>
      <button type="button" className="text-button" onClick={() => setRefreshKey((key) => key + 1)}>
        Refresh playback
      </button>
    </div>
  );
}

function SubmissionCard({ submission, currentStudentId }) {
  const task = submission.assignedTask;
  const isReviewed = Boolean(submission.feedback);

  return (
    <article className="feedback-submission-card">
      <div className="feedback-submission-card__top">
        <div className="feedback-submission-card__icon" aria-hidden="true">
          <MicIcon />
        </div>
        <div>
          <h3>{task?.title || "Speaking task"}</h3>
          <p>
            Submitted {formatDateTime(submission.submitted_at)} - {formatDuration(submission.duration_seconds)}
          </p>
        </div>
        <span className={`feedback-status-pill feedback-status-pill--${isReviewed ? "reviewed" : "waiting"}`}>
          {isReviewed ? "Reviewed" : "Pending review"}
        </span>
      </div>

      <div className="feedback-submission-meta">
        <span>{formatStatus(submission.status)}</span>
        <span>{formatTaskType(task?.task_type)}</span>
        {task?.focus && <span>Focus: {task.focus}</span>}
        {task?.due_date && <span>Due: {task.due_date}</span>}
        {task?.status && <span>Task: {formatStatus(task.status)}</span>}
      </div>

      <PrivateAudioPlayback submission={submission} currentStudentId={currentStudentId} />

      <div className="submission-reflection">
        <span>Your self-reflection</span>
        {submission.self_rating && <p>Self-rating: {submission.self_rating}/5</p>}
        {submission.reflection_text ? (
          <p>{submission.reflection_text}</p>
        ) : (
          <p>You submitted the recording without a written reflection.</p>
        )}
      </div>

      <SubmissionFeedback feedback={submission.feedback} />
    </article>
  );
}

export function RecentFeedbackList({ feedback, submissions = [], currentStudentId }) {
  const hasSubmissions = submissions.length > 0;

  return (
    <section className="card recent-feedback-card" aria-labelledby="recent-feedback-title">
      <div className="recent-feedback-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Recent submissions</p>
          <h2 id="recent-feedback-title">
            {hasSubmissions ? "Your submitted recordings" : feedback.title}
          </h2>
        </div>
        <div className="feedback-card-icon" aria-hidden="true">
          <MicIcon />
        </div>
      </div>

      {hasSubmissions ? (
        <div className="feedback-submission-list">
          {submissions.map((submission) => (
            <SubmissionCard
              submission={submission}
              currentStudentId={currentStudentId}
              key={submission.id}
            />
          ))}
        </div>
      ) : (
        <>
          <p>{feedback.message}</p>

          <div className="feedback-placeholder-list" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </>
      )}
    </section>
  );
}
