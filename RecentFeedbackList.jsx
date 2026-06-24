import { useEffect, useState } from "react";
import { MicIcon } from "../icons.jsx";
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

function FeedbackScore({ label, value }) {
  return (
    <span>
      {label}: {value ? `${value}/5` : "Not added"}
    </span>
  );
}

function FeedbackNote({ label, value }) {
  return (
    <div className="submission-review-note">
      <span>{label}</span>
      <p>{value || "Your teacher has not added this note yet."}</p>
    </div>
  );
}

function SubmissionFeedback({ feedback }) {
  if (!feedback) {
    return (
      <div className="submission-review submission-review--waiting">
        <p className="submission-review__status">Waiting for teacher review</p>
        <p>Teacher comments and corrections will appear here after review.</p>
      </div>
    );
  }

  return (
    <div className="submission-review submission-review--reviewed">
      <p className="submission-review__status">Reviewed</p>
      <FeedbackNote label="Teacher feedback" value={feedback.teacher_comment} />
      <FeedbackNote label="One correction" value={feedback.correction_note} />
      <FeedbackNote label="Encouragement" value={feedback.encouragement_note} />
      <FeedbackNote label="Next focus" value={feedback.next_focus} />
      <div className="submission-score-row" aria-label="Teacher scores">
        <FeedbackScore label="Clarity" value={feedback.clarity_score} />
        <FeedbackScore label="Confidence" value={feedback.confidence_score} />
        <FeedbackScore label="Accuracy" value={feedback.accuracy_score} />
      </div>
      {feedback.next_focus && (
        <div className="submission-next-task-focus">
          <span>Use this feedback in your next task</span>
          <p>{feedback.next_focus}</p>
        </div>
      )}
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
        No recording file found for this submission.
      </div>
    );
  }

  if (playback.status === "loading") {
    return (
      <div className="private-audio-note">
        Preparing playback...
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
        <span>Private playback link expires shortly.</span>
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
          {isReviewed ? "Reviewed" : "Waiting"}
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
        <span>Student self-reflection</span>
        <p>{submission.self_rating ? `Self-rating: ${submission.self_rating}/5` : "Self-rating not added."}</p>
        <p>{submission.reflection_text || "No reflection was added with this submission."}</p>
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
