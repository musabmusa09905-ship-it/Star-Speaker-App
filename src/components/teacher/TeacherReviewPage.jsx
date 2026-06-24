import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { MicIcon } from "../icons.jsx";
import {
  createTeacherPlaybackUrl,
  getTeacherReviewSubmissions,
  submitTeacherFeedback
} from "../../lib/teacherReview.js";

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

  return minutes
    ? `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`
    : `${remainingSeconds}s`;
}

function formatLabel(value) {
  if (!value) {
    return "Practice";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function TeacherAccessState({ title, message }) {
  return (
    <section className="card teacher-review-state" aria-labelledby="teacher-review-state-title">
      <div className="teacher-review-state__icon" aria-hidden="true">
        <MicIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Teacher review</p>
        <h2 id="teacher-review-state-title">{title}</h2>
        <p>{message}</p>
      </div>
    </section>
  );
}

function TeacherAudioPlayer({ submission, teacherId }) {
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

      setPlayback({
        status: "loading",
        signedUrl: "",
        error: ""
      });

      const result = await createTeacherPlaybackUrl({
        submission,
        teacherId,
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
  }, [refreshKey, submission, teacherId]);

  if (playback.status === "missing") {
    return <div className="teacher-audio-note">No recording file found for this submission.</div>;
  }

  if (playback.status === "loading") {
    return <div className="teacher-audio-note">Preparing private playback...</div>;
  }

  if (playback.status === "error") {
    return (
      <div className="teacher-audio-note teacher-audio-note--error">
        <p>Could not load private playback.</p>
        {playback.error && <span>{playback.error}</span>}
        <button type="button" className="text-button" onClick={() => setRefreshKey((key) => key + 1)}>
          Refresh playback
        </button>
      </div>
    );
  }

  return (
    <div className="teacher-audio-player">
      <div>
        <p>Student recording</p>
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

function ScoreInput({ label, value, onChange, disabled }) {
  return (
    <div className="teacher-score-input">
      <span>{label}</span>
      <div>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            type="button"
            className={score === value ? "is-selected" : ""}
            disabled={disabled}
            onClick={() => onChange(score)}
            aria-pressed={score === value}
            key={score}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

const initialFeedbackForm = {
  teacher_comment: "",
  correction_note: "",
  encouragement_note: "",
  next_focus: "",
  clarity_score: 0,
  confidence_score: 0,
  accuracy_score: 0
};

const feedbackHelperGroups = [
  {
    key: "success",
    title: "Success starters",
    targetField: "teacher_comment",
    actionLabel: "Insert success",
    phrases: [
      "You answered with good effort and stayed understandable.",
      "You kept speaking even when the answer was difficult.",
      "Your idea was clear, and that is the most important first step.",
      "You used the target structure more confidently this time.",
      "You completed the task honestly, and that builds consistency."
    ]
  },
  {
    key: "correction",
    title: "Correction starters",
    targetField: "correction_note",
    actionLabel: "Insert correction",
    phrases: [
      "Focus on word order here:",
      "The main issue is verb tense:",
      "Be careful with this phrase:",
      "Try to make this sentence simpler and clearer:",
      "Your idea is good, but the structure needs adjustment:"
    ]
  },
  {
    key: "model",
    title: "Model sentence starters",
    targetField: "correction_note",
    actionLabel: "Insert model",
    helper: "No separate model field exists, so this inserts into One correction.",
    phrases: [
      "A clearer version would be:",
      "You can say it like this:",
      "Try this sentence next time:",
      "A more natural version is:",
      "Use this model in your next recording:"
    ]
  },
  {
    key: "next",
    title: "Next-focus starters",
    targetField: "next_focus",
    actionLabel: "Insert next focus",
    phrases: [
      "Next time, focus on giving one clear reason.",
      "Next time, focus on using connectors naturally.",
      "Next time, focus on speaking in shorter sentences.",
      "Next time, focus on answering without translating first.",
      "Next time, focus on clarity before advanced vocabulary."
    ]
  },
  {
    key: "encouragement",
    title: "Encouragement starters",
    targetField: "encouragement_note",
    actionLabel: "Insert encouragement",
    phrases: [
      "Do not worry about perfection. This attempt gives us something real to improve.",
      "Keep submitting. One useful correction at a time is enough.",
      "Your consistency matters more than sounding perfect today.",
      "This is the kind of practice that builds speaking confidence.",
      "Come back tomorrow and apply just one correction."
    ]
  }
];

const feedbackChecklistItems = [
  "Notice one success",
  "Correct one main issue",
  "Give a better model",
  "Set one next focus",
  "Encourage tomorrow's attempt"
];

function appendFeedbackText(currentValue, phrase) {
  const current = String(currentValue || "").trim();

  if (!current) {
    return phrase;
  }

  if (current.includes(phrase)) {
    return current;
  }

  return `${current}\n${phrase}`;
}

function QuickFeedbackHelper({ disabled, onInsert }) {
  return (
    <details className="teacher-feedback-helper">
      <summary>
        <span>Quick feedback helper</span>
        <small>Use one correction only</small>
      </summary>

      <div className="teacher-feedback-helper__body">
        <div className="teacher-feedback-checklist" aria-label="Feedback quality checklist">
          <p>Feedback checklist</p>
          <ul>
            {feedbackChecklistItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="teacher-feedback-template-groups">
          {feedbackHelperGroups.map((group) => (
            <section className="teacher-feedback-template-group" aria-label={group.title} key={group.key}>
              <div>
                <h3>{group.title}</h3>
                {group.helper && <p>{group.helper}</p>}
              </div>
              <div className="teacher-feedback-template-buttons">
                {group.phrases.map((phrase) => (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onInsert(group.targetField, phrase)}
                    key={phrase}
                  >
                    <span>{group.actionLabel}</span>
                    {phrase}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}

function TeacherFeedbackForm({ submission, teacherId, onSubmitted }) {
  const [values, setValues] = useState(initialFeedbackForm);
  const [status, setStatus] = useState({
    type: "idle",
    message: ""
  });
  const isSubmitting = status.type === "submitting";

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value
    }));
  }

  function insertTemplatePhrase(field, phrase) {
    setValues((current) => ({
      ...current,
      [field]: appendFeedbackText(current[field], phrase)
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({
      type: "submitting",
      message: "Submitting feedback..."
    });

    const result = await submitTeacherFeedback({
      teacherId,
      submission,
      values
    });

    if (result.error) {
      setStatus({
        type: "error",
        message: result.error
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Feedback submitted."
    });
    onSubmitted(result.feedback);
  }

  return (
    <form className="teacher-feedback-form" onSubmit={handleSubmit}>
      <QuickFeedbackHelper
        disabled={isSubmitting}
        onInsert={insertTemplatePhrase}
      />

      <div className="teacher-feedback-form__grid">
        <label>
          Teacher comment
          <textarea
            rows="3"
            value={values.teacher_comment}
            disabled={isSubmitting}
            onChange={(event) => updateField("teacher_comment", event.target.value)}
            placeholder="What did the student do well?"
          />
        </label>
        <label>
          One correction
          <textarea
            rows="3"
            value={values.correction_note}
            disabled={isSubmitting}
            onChange={(event) => updateField("correction_note", event.target.value)}
            placeholder="Give one focused correction."
          />
        </label>
        <label>
          Encouragement note
          <textarea
            rows="3"
            value={values.encouragement_note}
            disabled={isSubmitting}
            onChange={(event) => updateField("encouragement_note", event.target.value)}
            placeholder="Keep the tone supportive and specific."
          />
        </label>
        <label>
          Next focus
          <textarea
            rows="2"
            value={values.next_focus}
            disabled={isSubmitting}
            onChange={(event) => updateField("next_focus", event.target.value)}
            placeholder="What should they improve next?"
          />
        </label>
      </div>

      <div className="teacher-score-grid" aria-label="Feedback scores">
        <ScoreInput
          label="Clarity"
          value={values.clarity_score}
          disabled={isSubmitting}
          onChange={(score) => updateField("clarity_score", score)}
        />
        <ScoreInput
          label="Confidence"
          value={values.confidence_score}
          disabled={isSubmitting}
          onChange={(score) => updateField("confidence_score", score)}
        />
        <ScoreInput
          label="Accuracy"
          value={values.accuracy_score}
          disabled={isSubmitting}
          onChange={(score) => updateField("accuracy_score", score)}
        />
      </div>

      <button className="primary-button teacher-feedback-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting feedback..." : "Submit Feedback"}
      </button>
      {status.message && (
        <p className={`teacher-form-note teacher-form-note--${status.type}`}>{status.message}</p>
      )}
    </form>
  );
}

function ReviewedFeedback({ feedback }) {
  return (
    <div className="teacher-reviewed-feedback">
      <p className="teacher-reviewed-feedback__badge">Reviewed</p>
      {feedback.teacher_comment && (
        <div>
          <span>Teacher comment</span>
          <p>{feedback.teacher_comment}</p>
        </div>
      )}
      {feedback.correction_note && (
        <div>
          <span>One correction</span>
          <p>{feedback.correction_note}</p>
        </div>
      )}
      {feedback.encouragement_note && (
        <div>
          <span>Encouragement</span>
          <p>{feedback.encouragement_note}</p>
        </div>
      )}
      {feedback.next_focus && (
        <div>
          <span>Next focus</span>
          <p>{feedback.next_focus}</p>
        </div>
      )}
      <div className="teacher-reviewed-score-row">
        {feedback.clarity_score && <span>Clarity {feedback.clarity_score}/5</span>}
        {feedback.confidence_score && <span>Confidence {feedback.confidence_score}/5</span>}
        {feedback.accuracy_score && <span>Accuracy {feedback.accuracy_score}/5</span>}
      </div>
    </div>
  );
}

function TeacherSubmissionCard({ submission, teacherId, onFeedbackSubmitted }) {
  const studentName = submission.student?.full_name || "Student";
  const task = submission.assignedTask;

  return (
    <article className="card teacher-submission-card">
      <div className="teacher-submission-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">{submission.feedback ? "Reviewed" : "Pending review"}</p>
          <h2>{task?.title || "Speaking task"}</h2>
          <p>
            {studentName}
            {submission.student?.email ? ` - ${submission.student.email}` : ""}
          </p>
        </div>
        <span className={`teacher-review-pill ${submission.feedback ? "is-reviewed" : ""}`}>
          {submission.feedback ? "Reviewed" : "Pending"}
        </span>
      </div>

      <div className="teacher-submission-meta">
        <span>Submitted {formatDateTime(submission.submitted_at)}</span>
        <span>{formatDuration(submission.duration_seconds)}</span>
        <span>{formatLabel(task?.task_type)}</span>
        {task?.focus && <span>Focus: {task.focus}</span>}
        {task?.due_date && <span>Due: {task.due_date}</span>}
      </div>

      <TeacherAudioPlayer submission={submission} teacherId={teacherId} />

      {(submission.self_rating || submission.reflection_text) && (
        <div className="teacher-student-reflection">
          <p>Student reflection</p>
          {submission.self_rating && <span>Self-rating: {submission.self_rating}/5</span>}
          {submission.reflection_text && <span>{submission.reflection_text}</span>}
        </div>
      )}

      {submission.feedback ? (
        <ReviewedFeedback feedback={submission.feedback} />
      ) : (
        <TeacherFeedbackForm
          submission={submission}
          teacherId={teacherId}
          onSubmitted={(feedback) => onFeedbackSubmitted(submission.id, feedback)}
        />
      )}
    </article>
  );
}

export function TeacherReviewPage({ user, profile }) {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    let isMounted = true;

    async function loadTeacherSubmissions() {
      setSubmissions([]);
      setError("");

      if (profile?.role !== "teacher") {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await getTeacherReviewSubmissions(profile.id);

      if (!isMounted) {
        return;
      }

      setIsLoading(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSubmissions(result.submissions);
    }

    loadTeacherSubmissions();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, profile?.role]);

  function handleFeedbackSubmitted(submissionId, feedback) {
    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === submissionId
          ? {
              ...submission,
              status: "reviewed",
              feedback,
              assignedTask: submission.assignedTask
                ? {
                    ...submission.assignedTask,
                    status: "reviewed"
                  }
                : submission.assignedTask
            }
          : submission
      )
    );
  }

  const filteredSubmissions = useMemo(() => {
    if (filter === "reviewed") {
      return submissions.filter((submission) => submission.feedback);
    }

    return submissions.filter((submission) => !submission.feedback);
  }, [filter, submissions]);
  const pendingCount = submissions.filter((submission) => !submission.feedback).length;
  const reviewedCount = submissions.filter((submission) => submission.feedback).length;

  if (profile?.role === "student") {
    return (
      <div className="teacher-review-page">
        <Header user={user} title="Teacher Review" subtitle="Review student recordings and give focused feedback." />
        <TeacherAccessState
          title="Teacher review is only available for teacher accounts."
          message="Use a teacher account to review submitted recordings."
        />
      </div>
    );
  }

  if (profile?.role === "admin") {
    return (
      <div className="teacher-review-page">
        <Header user={user} title="Teacher Review" subtitle="Review student recordings and give focused feedback." />
        <TeacherAccessState
          title="Review is handled by teacher accounts."
          message="Use a teacher account linked to students to review submitted recordings."
        />
      </div>
    );
  }

  return (
    <div className="teacher-review-page">
      <Header user={user} title="Teacher Review" subtitle="Review student recordings and give focused feedback." />

      <div className="teacher-review-toolbar" aria-label="Review filters">
        <button
          type="button"
          className={filter === "pending" ? "is-active" : ""}
          onClick={() => setFilter("pending")}
        >
          Pending review <span>{pendingCount}</span>
        </button>
        <button
          type="button"
          className={filter === "reviewed" ? "is-active" : ""}
          onClick={() => setFilter("reviewed")}
        >
          Reviewed <span>{reviewedCount}</span>
        </button>
      </div>

      {isLoading ? (
        <TeacherAccessState
          title="Loading submissions..."
          message="Please wait while we open your assigned student submissions."
        />
      ) : error ? (
        <TeacherAccessState
          title="Could not load submissions."
          message={error}
        />
      ) : !submissions.length ? (
        <TeacherAccessState
          title="No submissions to review yet."
          message="When your students submit speaking tasks, they will appear here."
        />
      ) : !filteredSubmissions.length ? (
        <TeacherAccessState
          title={filter === "pending" ? "No pending reviews." : "No reviewed submissions yet."}
          message={
            filter === "pending"
              ? "All visible submissions have already been reviewed."
              : "Reviewed submissions will appear here after you submit feedback."
          }
        />
      ) : (
        <div className="teacher-submission-list">
          {filteredSubmissions.map((submission) => (
            <TeacherSubmissionCard
              submission={submission}
              teacherId={profile.id}
              onFeedbackSubmitted={handleFeedbackSubmitted}
              key={submission.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
