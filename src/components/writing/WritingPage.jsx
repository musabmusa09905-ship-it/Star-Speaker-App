import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { ArticleIcon, FeedbackIcon, ProgressIcon, SendIcon, TargetIcon } from "../icons.jsx";
import {
  createWritingTask,
  getWritingManagementData,
  getWritingStudentOverview,
  reviewWritingSubmission,
  submitWritingAnswer
} from "../../lib/writingPractice.js";

const emptyTaskForm = {
  student_id: "",
  title: "",
  prompt: "",
  instructions: "",
  level: "",
  focus: "",
  due_date: "",
  min_words: 80
};

const emptySubmissionForm = {
  answer_text: "",
  self_reflection: ""
};

const emptyReviewForm = {
  teacher_feedback: "",
  one_correction: "",
  corrected_version: "",
  encouragement: "",
  next_focus: "",
  clarity_score: "",
  accuracy_score: "",
  structure_score: ""
};

const scoreOptions = [1, 2, 3, 4, 5];

function formatDate(value) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  if (!value) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatStatus(value) {
  if (!value) {
    return "Assigned";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function previewText(value, maxLength = 150) {
  if (!value || value.length <= maxLength) {
    return value || "";
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function countWords(value) {
  return (value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getCorrection(submission) {
  return submission?.one_correction || submission?.correction_note || "";
}

function getEncouragement(submission) {
  return submission?.encouragement || submission?.encouragement_note || "";
}

function WritingScoreList({ submission }) {
  const scores = [
    { label: "Clarity", value: submission?.clarity_score },
    { label: "Accuracy", value: submission?.accuracy_score },
    { label: "Structure", value: submission?.structure_score }
  ].filter((score) => score.value !== null && score.value !== undefined);

  if (!scores.length) {
    return null;
  }

  return (
    <div className="writing-score-list" aria-label="Writing review scores">
      {scores.map((score) => (
        <span key={score.label}>
          {score.label}: <strong>{score.value}/5</strong>
        </span>
      ))}
    </div>
  );
}

function WritingStateCard({ title, message, action }) {
  return (
    <section className="card writing-state-card" aria-labelledby="writing-state-title">
      <div className="writing-state-card__icon" aria-hidden="true">
        <ArticleIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Writing Practice</p>
        <h2 id="writing-state-title">{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </section>
  );
}

function WritingInlineState({ title, message, action }) {
  return (
    <div className="writing-inline-state">
      <ArticleIcon aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
        {action}
      </div>
    </div>
  );
}

function WritingStats({ stats }) {
  const items = [
    { label: "Assigned", value: stats.totalTasks, icon: <ArticleIcon /> },
    { label: "Waiting for you", value: stats.assignedTasks, icon: <TargetIcon /> },
    { label: "Submitted", value: stats.submittedTasks, icon: <SendIcon /> },
    { label: "Reviewed", value: stats.reviewedTasks, icon: <FeedbackIcon /> }
  ];

  return (
    <section className="writing-stat-grid" aria-label="Writing task summary">
      {items.map((item) => (
        <article className="card writing-stat-card" key={item.label}>
          <div aria-hidden="true">{item.icon}</div>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

function StudentTaskList({ tasks, selectedTaskId, onSelectTask }) {
  return (
    <section className="card writing-task-list" aria-labelledby="writing-task-list-title">
      <div className="writing-card-header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Assigned writing</p>
          <h2 id="writing-task-list-title">Your tasks</h2>
        </div>
        <ArticleIcon aria-hidden="true" />
      </div>

      <div className="writing-task-list__items">
        {tasks.map((task) => {
          const isSelected = task.id === selectedTaskId;
          const submission = task.latestSubmission;
          const status = submission?.status || task.status;

          return (
            <button
              className={`writing-task-card ${isSelected ? "is-selected" : ""}`}
              type="button"
              key={task.id}
              onClick={() => onSelectTask(task.id)}
            >
              <span>{formatStatus(status)}</span>
              <strong>{task.title}</strong>
              <p>{previewText(task.prompt, 110)}</p>
              <small>
                {task.focus || "Writing practice"} - {task.level || "Any level"} - Due {formatDate(task.due_date)}
              </small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SubmittedWritingPanel({ task, submission }) {
  const isReviewed = submission?.status === "reviewed" || task.status === "reviewed";

  return (
    <div className="writing-submitted-panel">
      <div className={isReviewed ? "writing-review-pill is-reviewed" : "writing-review-pill"}>
        {isReviewed ? "Reviewed" : "Waiting for teacher review"}
      </div>
      <h3>{isReviewed ? "Teacher feedback" : "Your writing is submitted"}</h3>
      <p>
        {isReviewed
          ? submission.teacher_feedback || "Your teacher has not added a general note yet."
          : "Your teacher can now read and review your writing."}
      </p>
      {submission?.answer_text && (
        <details className="writing-answer-preview">
          <summary>Your submitted answer</summary>
          <p>{submission.answer_text}</p>
        </details>
      )}
      {isReviewed && (
        <>
          <div className="writing-feedback-notes">
            <div>
              <span>One correction</span>
              <p>{getCorrection(submission) || "Your teacher has not added this note yet."}</p>
            </div>
            <div>
              <span>Encouragement</span>
              <p>{getEncouragement(submission) || "Your teacher has not added this note yet."}</p>
            </div>
            <div>
              <span>Next focus</span>
              <p>{submission.next_focus || "Your next writing focus will appear after teacher review."}</p>
            </div>
          </div>
          {submission.corrected_version && (
            <details className="writing-answer-preview">
              <summary>Corrected version</summary>
              <p>{submission.corrected_version}</p>
            </details>
          )}
          <WritingScoreList submission={submission} />
        </>
      )}
      <a className="secondary-button" href="/feedback">
        Go to Feedback
      </a>
    </div>
  );
}

function StudentWritingEditor({ task, onSubmit, isSubmitting, submitMessage }) {
  const [form, setForm] = useState(emptySubmissionForm);
  const wordCount = countWords(form.answer_text);

  useEffect(() => {
    setForm(emptySubmissionForm);
  }, [task?.id]);

  if (!task) {
    return (
      <section className="card writing-editor-card">
        <WritingInlineState
          title="Choose a writing task"
          message="Select an assigned writing task to begin."
        />
      </section>
    );
  }

  if (task.latestSubmission || task.status !== "assigned") {
    return (
      <section className="card writing-editor-card" aria-labelledby="writing-editor-title">
        <div className="writing-card-header">
          <div>
            <p className="card-eyebrow card-eyebrow--red">Selected task</p>
            <h2 id="writing-editor-title">{task.title}</h2>
          </div>
          <span className="writing-review-pill">{formatStatus(task.latestSubmission?.status || task.status)}</span>
        </div>
        <SubmittedWritingPanel task={task} submission={task.latestSubmission} />
      </section>
    );
  }

  return (
    <section className="card writing-editor-card" aria-labelledby="writing-editor-title">
      <div className="writing-card-header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Writing task</p>
          <h2 id="writing-editor-title">{task.title}</h2>
        </div>
        <span className="writing-review-pill">{task.min_words || 80}+ words</span>
      </div>

      <div className="writing-task-brief">
        <p>{task.prompt}</p>
        {task.instructions && <span>{task.instructions}</span>}
        <div>
          {task.focus && <small>Focus: {task.focus}</small>}
          {task.level && <small>{task.level}</small>}
          <small>Due {formatDate(task.due_date)}</small>
        </div>
      </div>

      <form
        className="writing-answer-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <label>
          Your answer
          <textarea
            value={form.answer_text}
            onChange={(event) => setForm((current) => ({ ...current, answer_text: event.target.value }))}
            placeholder="Write your answer here. Focus on clear ideas, examples, and complete sentences."
            rows={12}
            maxLength={3000}
          />
        </label>
        <div className="writing-editor-meta">
          <span>{wordCount} words</span>
          <span>{form.answer_text.length}/3000 characters</span>
        </div>
        <label>
          Reflection after writing
          <textarea
            value={form.self_reflection}
            onChange={(event) => setForm((current) => ({ ...current, self_reflection: event.target.value }))}
            placeholder="What felt easy or difficult?"
            rows={3}
          />
        </label>
        {submitMessage && <p className="writing-form-note">{submitMessage}</p>}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Writing"}
        </button>
      </form>
    </section>
  );
}

function StudentWritingView({ user, profile }) {
  const [state, setState] = useState({
    isLoading: true,
    error: "",
    tasks: [],
    submissions: [],
    stats: { totalTasks: 0, assignedTasks: 0, submittedTasks: 0, reviewedTasks: 0, waitingForReview: 0 }
  });
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  async function loadWriting() {
    setState((current) => ({ ...current, isLoading: true, error: "" }));
    const result = await getWritingStudentOverview(profile.id);
    setState({
      isLoading: false,
      error: result.error || "",
      tasks: result.tasks,
      submissions: result.submissions,
      stats: result.stats
    });

    if (!selectedTaskId && result.tasks.length) {
      const nextTask = result.tasks.find((task) => task.status === "assigned" && !task.latestSubmission) || result.tasks[0];
      setSelectedTaskId(nextTask.id);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const result = await getWritingStudentOverview(profile.id);

      if (!isMounted) {
        return;
      }

      setState({
        isLoading: false,
        error: result.error || "",
        tasks: result.tasks,
        submissions: result.submissions,
        stats: result.stats
      });

      if (result.tasks.length) {
        const nextTask = result.tasks.find((task) => task.status === "assigned" && !task.latestSubmission) || result.tasks[0];
        setSelectedTaskId(nextTask.id);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  const selectedTask = useMemo(
    () => state.tasks.find((task) => task.id === selectedTaskId) || null,
    [selectedTaskId, state.tasks]
  );

  async function handleSubmit(values) {
    setIsSubmitting(true);
    setSubmitMessage("");
    const result = await submitWritingAnswer({
      studentId: profile.id,
      task: selectedTask,
      values
    });
    setIsSubmitting(false);

    if (result.error) {
      setSubmitMessage(result.error);
      return;
    }

    setSubmitMessage("Writing submitted successfully. Your teacher can now review it.");
    await loadWriting();
  }

  return (
    <div className="writing-page">
      <Header user={user} title="Writing Practice" subtitle="Build clear English by writing a little, often." />

      {state.isLoading ? (
        <WritingStateCard title="Loading writing practice..." message="Please wait while we gather your writing tasks." />
      ) : state.error ? (
        <WritingStateCard
          title="Writing practice could not load"
          message="Please ask your teacher to check your access."
          action={<a className="secondary-button" href="/practice">Go to Practice</a>}
        />
      ) : !state.tasks.length ? (
        <WritingStateCard
          title="No writing task assigned yet"
          message="Your teacher will assign a writing task when it is ready."
          action={<a className="secondary-button" href="/practice">Go to Practice</a>}
        />
      ) : (
        <>
          <WritingStats stats={state.stats} />
          <div className="writing-grid">
            <StudentTaskList
              tasks={state.tasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
            />
            <StudentWritingEditor
              task={selectedTask}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitMessage={submitMessage}
            />
          </div>
        </>
      )}
    </div>
  );
}

function WritingTaskForm({ profile, students, onCreated }) {
  const [form, setForm] = useState(emptyTaskForm);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    const result = await createWritingTask({ profile, values: form });
    setIsSaving(false);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setMessage("Writing task assigned successfully.");
    setForm((current) => ({
      ...emptyTaskForm,
      student_id: current.student_id
    }));
    onCreated();
  }

  return (
    <section className="card writing-form-card" aria-labelledby="writing-assign-title">
      <div className="writing-card-header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Assign writing</p>
          <h2 id="writing-assign-title">Assign Writing Task</h2>
        </div>
        <TargetIcon aria-hidden="true" />
      </div>
      <p className="writing-task-form-helper">
        Create a focused written prompt for one assigned student. Students submit from their Writing page.
      </p>
      <form className="writing-management-form" onSubmit={handleSubmit}>
        <label>
          Student
          <select
            value={form.student_id}
            onChange={(event) => setForm((current) => ({ ...current, student_id: event.target.value }))}
            required
          >
            <option value="">Choose student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name || student.email}
              </option>
            ))}
          </select>
        </label>
        <label>
          Task title
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Weekend reflection paragraph"
            required
          />
        </label>
        <label>
          Prompt
          <textarea
            value={form.prompt}
            onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
            placeholder="Write about one thing you did, how you felt, and one detail you remember."
            rows={5}
            required
          />
        </label>
        <label>
          Instructions
          <textarea
            value={form.instructions}
            onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))}
            placeholder="Use past tense, write 80-120 words, and check punctuation."
            rows={3}
          />
        </label>
        <div className="writing-management-form__grid">
          <label>
            Focus
            <input
              value={form.focus}
              onChange={(event) => setForm((current) => ({ ...current, focus: event.target.value }))}
              placeholder="Past tense clarity"
            />
          </label>
          <label>
            Level
            <input
              value={form.level}
              onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}
              placeholder="Intermediate"
            />
          </label>
          <label>
            Due date
            <input
              type="date"
              value={form.due_date}
              onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
            />
          </label>
          <label>
            Minimum words
            <input
              type="number"
              min="1"
              value={form.min_words}
              onChange={(event) => setForm((current) => ({ ...current, min_words: event.target.value }))}
            />
          </label>
        </div>
        {message && <p className="writing-form-note">{message}</p>}
        <button className="primary-button" type="submit" disabled={isSaving || !students.length}>
          {isSaving ? "Assigning..." : "Assign Writing Task"}
        </button>
      </form>
    </section>
  );
}

function WritingReviewCard({ submission, onReviewed, profile }) {
  const [form, setForm] = useState(emptyReviewForm);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const task = submission.task;
  const student = submission.student;
  const isReviewed = submission.status === "reviewed";

  async function handleReview(event) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    const result = await reviewWritingSubmission({ profile, submission, values: form });
    setIsSaving(false);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setMessage("Writing feedback saved.");
    onReviewed();
  }

  return (
    <article className="card writing-submission-card">
      <div className="writing-submission-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">{student?.full_name || "Student"}</p>
          <h2>{task?.title || "Writing task"}</h2>
          <p>{formatDateTime(submission.submitted_at)}</p>
        </div>
        <span className={isReviewed ? "writing-review-pill is-reviewed" : "writing-review-pill"}>
          {isReviewed ? "Reviewed" : "Pending review"}
        </span>
      </div>

      <div className="writing-submission-answer">
        {task?.prompt && (
          <>
            <span>Prompt</span>
            <p>{task.prompt}</p>
          </>
        )}
        {task?.instructions && <small>Instructions: {task.instructions}</small>}
        <span>Student answer</span>
        <p>{submission.answer_text}</p>
        {submission.self_reflection && (
          <small>Reflection: {submission.self_reflection}</small>
        )}
      </div>

      {isReviewed ? (
        <>
          <div className="writing-feedback-notes">
            <div>
              <span>Feedback</span>
              <p>{submission.teacher_feedback || "No general feedback note added."}</p>
            </div>
            <div>
              <span>One correction</span>
              <p>{getCorrection(submission) || "No correction note added."}</p>
            </div>
            <div>
              <span>Encouragement</span>
              <p>{getEncouragement(submission) || "No encouragement note added."}</p>
            </div>
            <div>
              <span>Next focus</span>
              <p>{submission.next_focus || "No next focus added."}</p>
            </div>
          </div>
          {submission.corrected_version && (
            <details className="writing-answer-preview">
              <summary>Corrected version</summary>
              <p>{submission.corrected_version}</p>
            </details>
          )}
          <WritingScoreList submission={submission} />
        </>
      ) : (
        <form className="writing-review-form" onSubmit={handleReview}>
          <label>
            Teacher feedback
            <textarea
              value={form.teacher_feedback}
              onChange={(event) => setForm((current) => ({ ...current, teacher_feedback: event.target.value }))}
              rows={3}
              placeholder="What did the student do well?"
            />
          </label>
          <label>
            One correction
            <textarea
              value={form.one_correction}
              onChange={(event) => setForm((current) => ({ ...current, one_correction: event.target.value }))}
              rows={3}
              placeholder="Give one clear correction to apply next time."
            />
          </label>
          <label>
            Corrected version
            <textarea
              value={form.corrected_version}
              onChange={(event) => setForm((current) => ({ ...current, corrected_version: event.target.value }))}
              rows={3}
              placeholder="Optional corrected sentence or paragraph."
            />
          </label>
          <div className="writing-management-form__grid">
            <label>
              Encouragement
              <input
                value={form.encouragement}
                onChange={(event) => setForm((current) => ({ ...current, encouragement: event.target.value }))}
                placeholder="A short encouraging note"
              />
            </label>
            <label>
              Next focus
              <input
                value={form.next_focus}
                onChange={(event) => setForm((current) => ({ ...current, next_focus: event.target.value }))}
                placeholder="Articles, sentence length, tense..."
              />
            </label>
          </div>
          <div className="writing-score-grid">
            <label>
              Clarity score
              <select
                value={form.clarity_score}
                onChange={(event) => setForm((current) => ({ ...current, clarity_score: event.target.value }))}
              >
                <option value="">No score</option>
                {scoreOptions.map((score) => (
                  <option key={score} value={score}>{score}/5</option>
                ))}
              </select>
            </label>
            <label>
              Accuracy score
              <select
                value={form.accuracy_score}
                onChange={(event) => setForm((current) => ({ ...current, accuracy_score: event.target.value }))}
              >
                <option value="">No score</option>
                {scoreOptions.map((score) => (
                  <option key={score} value={score}>{score}/5</option>
                ))}
              </select>
            </label>
            <label>
              Structure score
              <select
                value={form.structure_score}
                onChange={(event) => setForm((current) => ({ ...current, structure_score: event.target.value }))}
              >
                <option value="">No score</option>
                {scoreOptions.map((score) => (
                  <option key={score} value={score}>{score}/5</option>
                ))}
              </select>
            </label>
          </div>
          {message && <p className="writing-form-note">{message}</p>}
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Submit Feedback"}
          </button>
        </form>
      )}
    </article>
  );
}

function WritingManagementView({ user, profile }) {
  const [state, setState] = useState({
    isLoading: true,
    error: "",
    students: [],
    tasks: [],
    submissions: []
  });

  async function loadManagementData() {
    setState((current) => ({ ...current, isLoading: true, error: "" }));
    const result = await getWritingManagementData(profile);
    setState({
      isLoading: false,
      error: result.error || "",
      students: result.students,
      tasks: result.tasks,
      submissions: result.submissions
    });
  }

  useEffect(() => {
    loadManagementData();
  }, [profile?.id, profile?.role]);

  const pendingSubmissions = state.submissions.filter((submission) => submission.status !== "reviewed");
  const reviewedSubmissions = state.submissions.filter((submission) => submission.status === "reviewed");

  return (
    <div className="writing-page">
      <Header
        user={user}
        title="Writing Practice"
        subtitle={profile.role === "admin" ? "Manage school writing tasks and reviews." : "Assign writing practice and review student answers."}
      />

      {state.isLoading ? (
        <WritingStateCard title="Loading writing manager..." message="Please wait while we gather students, writing tasks, and submissions." />
      ) : state.error ? (
        <WritingStateCard title="Could not load writing manager." message={state.error} />
      ) : (
        <div className="writing-management-grid">
          <WritingTaskForm profile={profile} students={state.students} onCreated={loadManagementData} />

          <section className="card writing-review-list-card" aria-labelledby="writing-review-title">
            <div className="writing-card-header">
              <div>
                <p className="card-eyebrow card-eyebrow--red">Review queue</p>
                <h2 id="writing-review-title">Writing submissions</h2>
              </div>
              <ProgressIcon aria-hidden="true" />
            </div>

            {!state.students.length ? (
              <WritingInlineState
                title="No students available."
                message={
                  profile.role === "teacher"
                    ? "Assigned student writing will appear after students are linked to your teacher account."
                    : "Active student writing will appear here after students are added."
                }
              />
            ) : !state.submissions.length ? (
              <WritingInlineState
                title="No writing submissions yet."
                message="Submitted student writing will appear here for review."
              />
            ) : (
              <div className="writing-submission-list">
                {[...pendingSubmissions, ...reviewedSubmissions].map((submission) => (
                  <WritingReviewCard
                    key={submission.id}
                    submission={submission}
                    profile={profile}
                    onReviewed={loadManagementData}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export function WritingPage({ user, profile }) {
  if (profile?.role === "student") {
    return <StudentWritingView user={user} profile={profile} />;
  }

  if (profile?.role === "teacher" || profile?.role === "admin") {
    return <WritingManagementView user={user} profile={profile} />;
  }

  return (
    <div className="writing-page">
      <Header user={user} title="Writing Practice" subtitle="Build clear English by writing a little, often." />
      <WritingStateCard
        title="Writing practice is available after login."
        message="Sign in with an active student, teacher, or admin account to continue."
      />
    </div>
  );
}
