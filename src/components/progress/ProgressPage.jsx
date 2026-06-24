import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { MascotAnimation } from "../common/MascotAnimation.jsx";
import { ArrowRightIcon, ArticleIcon, StarIcon, TargetIcon } from "../icons.jsx";
import { getStudentProgressData } from "../../lib/studentProgress.js";
import { calculateStudentStreak } from "../../lib/studentStreaks.js";
import {
  calculateStudentBadges,
  getEarnedBadges,
  getLatestEarnedBadge,
  getNextRecommendedBadge
} from "../../lib/studentBadges.js";
import { getWritingStudentOverview } from "../../lib/writingPractice.js";
import { calculateOutputPoints, combineOutputSubmissions } from "../../lib/outputProgress.js";

const weekLabels = ["M", "T", "W", "T", "F", "S", "S"];

function formatLabel(value) {
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

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatDuration(seconds) {
  if (!seconds) {
    return "0s";
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (!minutes) {
    return `${remainingSeconds}s`;
  }

  if (!remainingSeconds) {
    return `${minutes}m`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function average(values) {
  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!numericValues.length) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function formatAverage(value, suffix = "") {
  if (value === null || value === undefined) {
    return "Not enough data yet";
  }

  const rounded = Math.round(value * 10) / 10;
  return `${rounded}${suffix}`;
}

function getWeekStart(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function getWeekEnd(date = new Date()) {
  const result = getWeekStart(date);
  result.setDate(result.getDate() + 7);
  return result;
}

function isThisWeek(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  return date >= weekStart && date < weekEnd;
}

function getWeekActivity(submissions) {
  const weekStart = getWeekStart();
  const days = weekLabels.map((label, index) => {
    const start = new Date(weekStart);
    start.setDate(weekStart.getDate() + index);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const count = submissions.filter((submission) => {
      if (!submission.submitted_at) {
        return false;
      }

      const submittedAt = new Date(submission.submitted_at);
      return submittedAt >= start && submittedAt < end;
    }).length;

    return {
      label,
      count,
      active: count > 0
    };
  });

  return days;
}

function getMostFrequentLabel(values) {
  const counts = new Map();

  values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .forEach((value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });

  if (!counts.size) {
    return "";
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function getFirstUsefulValue(values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function getUniqueUsefulValues(values, limit = 3) {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const normalized = typeof value === "string" ? value.trim() : "";
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(normalized);
  });

  return result.slice(0, limit);
}

function joinList(values) {
  if (!values.length) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

function buildProgressModel({ tasks, submissions, feedback, weeklyFocus, writing }) {
  const writingTasks = writing?.tasks || [];
  const writingSubmissions = writing?.submissions || [];
  const outputSubmissions = combineOutputSubmissions({
    speakingSubmissions: submissions,
    writingSubmissions,
    speakingTasks: tasks,
    writingTasks
  });
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const writingTasksById = new Map(writingTasks.map((task) => [task.id, task]));
  const feedbackBySubmissionId = new Map();

  feedback.forEach((item) => {
    if (!feedbackBySubmissionId.has(item.submission_id)) {
      feedbackBySubmissionId.set(item.submission_id, item);
    }
  });

  const submittedTaskIds = new Set(submissions.map((submission) => submission.assigned_task_id));
  tasks.forEach((task) => {
    if (["submitted", "reviewed"].includes(task.status)) {
      submittedTaskIds.add(task.id);
    }
  });
  const submittedWritingTaskIds = new Set(writingSubmissions.map((submission) => submission.task_id));
  writingTasks.forEach((task) => {
    if (["submitted", "reviewed"].includes(task.status)) {
      submittedWritingTaskIds.add(task.id);
    }
  });

  const reviewedTaskIds = new Set();
  feedback.forEach((item) => {
    const submission = submissions.find((candidate) => candidate.id === item.submission_id);
    if (submission?.assigned_task_id) {
      reviewedTaskIds.add(submission.assigned_task_id);
    }
  });
  tasks.forEach((task) => {
    if (task.status === "reviewed") {
      reviewedTaskIds.add(task.id);
    }
  });
  const reviewedWritingTaskIds = new Set(
    writingSubmissions
      .filter((submission) => submission.status === "reviewed")
      .map((submission) => submission.task_id)
  );
  writingTasks.forEach((task) => {
    if (task.status === "reviewed") {
      reviewedWritingTaskIds.add(task.id);
    }
  });

  const totalTasks = tasks.length + writingTasks.length;
  const submittedTasks = submittedTaskIds.size + submittedWritingTaskIds.size;
  const reviewedTasks = reviewedTaskIds.size + reviewedWritingTaskIds.size;
  const completionRate = totalTasks ? Math.round((submittedTasks / totalTasks) * 100) : 0;
  const selfRatingAverage = average(submissions.map((submission) => submission.self_rating));
  const clarityAverage = average(feedback.map((item) => item.clarity_score));
  const confidenceAverage = average(feedback.map((item) => item.confidence_score));
  const accuracyAverage = average(feedback.map((item) => item.accuracy_score));
  const totalSpeakingSeconds = submissions.reduce(
    (sum, submission) => sum + (Number(submission.duration_seconds) || 0),
    0
  );
  const latestFocus = feedback.find((item) => item.next_focus)?.next_focus || "";
  const submittedSpeakingTasks = submissions
    .map((submission) => tasksById.get(submission.assigned_task_id))
    .filter(Boolean);
  const completedTasks = [
    ...submittedSpeakingTasks,
    ...writingSubmissions
      .map((submission) => writingTasksById.get(submission.task_id))
      .filter(Boolean)
  ];
  const practicedTaskType = getMostFrequentLabel([
    ...submittedSpeakingTasks.map((task) => task.task_type),
    ...writingSubmissions.map(() => "writing")
  ]);
  const recentTaskFocus = getFirstUsefulValue([
    latestFocus,
    ...completedTasks.map((task) => task.focus),
    weeklyFocus?.focusTitle
  ]);
  const reviewedFeedbackCount = feedback.length + writingSubmissions.filter((submission) => submission.status === "reviewed").length;
  const currentWeekActivity = getWeekActivity(outputSubmissions);
  const submittedThisWeek = currentWeekActivity.reduce((sum, day) => sum + day.count, 0);
  const weeklyOutputSubmissions = outputSubmissions.filter((submission) => isThisWeek(submission.submitted_at));
  const weeklySpeakingTasks = weeklyOutputSubmissions
    .filter((submission) => submission.source === "speaking")
    .map((submission) => tasksById.get(submission.taskId))
    .filter(Boolean);
  const weeklyWritingTasks = weeklyOutputSubmissions
    .filter((submission) => submission.source === "writing")
    .map((submission) => writingTasksById.get(submission.taskId))
    .filter(Boolean);
  const weeklyTaskTypes = getUniqueUsefulValues([
    ...weeklySpeakingTasks.map((task) => formatLabel(task.task_type)),
    ...weeklyWritingTasks.map(() => "Writing")
  ]);
  const weeklyFocusAreas = getUniqueUsefulValues([
    ...weeklySpeakingTasks.map((task) => task.focus),
    ...weeklyWritingTasks.map((task) => task.focus)
  ]);
  const weeklyFeedback = feedback.filter((item) => isThisWeek(item.created_at));
  const latestWeeklyFeedbackFocus = weeklyFeedback.find((item) => item.next_focus)?.next_focus || "";
  const mainPracticeType = getMostFrequentLabel([
    ...weeklySpeakingTasks.map((task) => task.task_type),
    ...weeklyWritingTasks.map(() => "writing")
  ]);
  const mainFocusPattern = getFirstUsefulValue([
    latestWeeklyFeedbackFocus,
    getMostFrequentLabel(weeklyFocusAreas),
    weeklyFocus?.focusTitle
  ]);
  const nextWeekFocus = getFirstUsefulValue([
    latestWeeklyFeedbackFocus,
    latestFocus,
    weeklyFocus?.targetDescription,
    weeklyFocus?.focusTitle,
    getMostFrequentLabel(weeklyFocusAreas)
  ]);
  const weeklyActiveDays = new Set(weeklyOutputSubmissions.map((submission) => submission.submittedDay).filter(Boolean)).size;

  return {
    totalTasks,
    submittedTasks,
    reviewedTasks,
    completionRate,
    selfRatingAverage,
    clarityAverage,
    confidenceAverage,
    accuracyAverage,
    totalSpeakingSeconds,
    outputPoints: calculateOutputPoints(outputSubmissions),
    streak: calculateStudentStreak(outputSubmissions),
    badges: calculateStudentBadges(outputSubmissions),
    weekActivity: currentWeekActivity,
    submittedThisWeek,
    latestFocus,
    weeklyFocus,
    transformationEvidence: {
      practicedTaskType,
      recentTaskFocus,
      reviewedFeedbackCount,
      latestSubmittedTitle: outputSubmissions[0]?.taskTitle || "",
      latestSubmittedAt: outputSubmissions[0]?.submitted_at || ""
    },
    weeklyReview: {
      submittedCount: weeklyOutputSubmissions.length,
      activeDays: weeklyActiveDays,
      speakingCount: weeklyOutputSubmissions.filter((submission) => submission.source === "speaking").length,
      writingCount: weeklyOutputSubmissions.filter((submission) => submission.source === "writing").length,
      reviewedCount: weeklyFeedback.length,
      taskTypes: weeklyTaskTypes,
      focusAreas: weeklyFocusAreas,
      latestFeedbackFocus: latestWeeklyFeedbackFocus,
      mainPracticeType,
      mainFocusPattern,
      nextWeekFocus
    },
    recentActivity: outputSubmissions.slice(0, 6).map((submission) => {
      const sourceTask =
        submission.source === "writing"
          ? writingTasksById.get(submission.taskId) || null
          : tasksById.get(submission.taskId) || null;
      const writingFeedback =
        submission.source === "writing" && submission.status === "reviewed"
          ? {
              next_focus: submission.next_focus || "",
              reviewed: true
            }
          : null;

      return {
        ...submission,
        assignedTask: sourceTask,
        feedback:
          submission.source === "writing"
            ? writingFeedback
            : feedbackBySubmissionId.get(submission.sourceId || submission.id) || null
      };
    })
  };
}

function ProgressAccessState({ title, message, action }) {
  const isLoading = title.toLowerCase().includes("loading");

  return (
    <section
      className={`card progress-empty-card mascot-card mascot-card--compact ${isLoading ? "branded-loading-state" : ""}`}
      aria-labelledby="progress-state-title"
    >
      <div className="mascot-card-content progress-empty-card__copy">
        <p className="card-eyebrow card-eyebrow--red">Progress</p>
        <h2 id="progress-state-title">{title}</h2>
        <p>{message}</p>
      </div>
      <div className="mascot-card-visual">
        {isLoading ? (
          <img className="branded-loading-state__icon" src="/app-icon.png" alt="" decoding="async" />
        ) : (
          <MascotAnimation
            type={title.toLowerCase().includes("no progress") ? "thinking" : "progress"}
            size="small"
            motion={title.toLowerCase().includes("no progress") ? "thinking" : "progress"}
            label="Progress support mascot"
          />
        )}
      </div>
      {action}
    </section>
  );
}

function ProgressSnapshotCard({ progress }) {
  const evidence = progress.transformationEvidence;
  const hasSubmissions = progress.submittedTasks > 0;

  return (
    <section className="card progress-card progress-snapshot-card mascot-card mascot-card--compact" aria-labelledby="progress-snapshot-title">
      <div className="progress-snapshot-card__copy">
        <p className="card-eyebrow card-eyebrow--red">Progress snapshot</p>
        <h2 id="progress-snapshot-title">
          {hasSubmissions ? "Your English output is becoming visible." : "Your progress starts with your first submission."}
        </h2>
        <p>
          {hasSubmissions
            ? `You have submitted ${progress.submittedTasks} ${progress.submittedTasks === 1 ? "task" : "tasks"} and built ${progress.streak.currentStreak} ${progress.streak.currentStreak === 1 ? "day" : "days"} of current consistency.`
            : "Submit one speaking or writing task, and this page will turn your practice into visible evidence."}
        </p>
        {evidence.latestSubmittedTitle && (
          <p className="progress-activity-focus">
            Latest submitted work: {evidence.latestSubmittedTitle}
            {evidence.latestSubmittedAt ? ` · ${formatDateTime(evidence.latestSubmittedAt)}` : ""}
          </p>
        )}
      </div>
      <div className="progress-snapshot-stats" aria-label="Progress snapshot metrics">
        <div>
          <span>Submitted</span>
          <strong>{progress.submittedTasks}</strong>
        </div>
        <div>
          <span>Reviewed</span>
          <strong>{progress.reviewedTasks}</strong>
        </div>
        <div>
          <span>Completion</span>
          <strong>{progress.completionRate}%</strong>
        </div>
        <div>
          <span>Speaking time</span>
          <strong>{formatDuration(progress.totalSpeakingSeconds)}</strong>
        </div>
      </div>
      <div className="mascot-card-visual">
        <MascotAnimation
          type={hasSubmissions ? "progress" : "encouragement"}
          size="small"
          motion={hasSubmissions ? "progress" : "attention"}
          label="Progress mascot for visible transformation"
        />
      </div>
    </section>
  );
}

function SkillEvidenceCard({ progress }) {
  const evidence = progress.transformationEvidence;
  const hasSubmissions = progress.submittedTasks > 0;

  return (
    <section className="card progress-card progress-skill-evidence-card" aria-labelledby="skill-evidence-title">
      <div className="progress-card-icon" aria-hidden="true">
        <TargetIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Skill evidence</p>
        <h2 id="skill-evidence-title">What your practice shows</h2>
        <div className="progress-evidence-list">
          <div className="progress-evidence-item">
            <span>Most practiced output</span>
            <strong>{hasSubmissions && evidence.practicedTaskType ? formatLabel(evidence.practicedTaskType) : "No submitted output yet"}</strong>
          </div>
          <div className="progress-evidence-item">
            <span>Current focus signal</span>
            <strong>{evidence.recentTaskFocus || "Your focus will appear after tasks or feedback."}</strong>
          </div>
          <div className="progress-evidence-item">
            <span>Teacher-reviewed evidence</span>
            <strong>
              {evidence.reviewedFeedbackCount
                ? `${evidence.reviewedFeedbackCount} reviewed ${evidence.reviewedFeedbackCount === 1 ? "item" : "items"}`
                : "Waiting for teacher review"}
            </strong>
          </div>
        </div>
        <p className="progress-activity-focus">This section only uses submitted work, assigned task focus, and real teacher feedback.</p>
      </div>
    </section>
  );
}

function WeeklyImprovementReview({ review }) {
  const hasWeeklyPractice = review.submittedCount > 0;
  const taskTypeText = joinList(review.taskTypes);
  const focusText = joinList(review.focusAreas);
  const mainPattern =
    review.mainFocusPattern ||
    (review.mainPracticeType ? `${formatLabel(review.mainPracticeType)} practice` : "");
  const nextFocus = review.nextWeekFocus || "Complete one honest recording at a time.";

  return (
    <section className="card progress-card progress-weekly-review-card" aria-labelledby="weekly-review-title">
      <div className="progress-weekly-review-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Weekly improvement review</p>
          <h2 id="weekly-review-title">Your week, made visible</h2>
          <p>
            {hasWeeklyPractice
              ? "Here is the real evidence from your submitted practice this week."
              : "Your weekly review will become clearer after a few submissions."}
          </p>
        </div>
        <div className="progress-weekly-review-card__badge" aria-label="This week's submitted practice">
          <strong>{review.submittedCount}</strong>
          <span>{review.submittedCount === 1 ? "task this week" : "tasks this week"}</span>
        </div>
      </div>

      <div className="progress-weekly-review-grid">
        <article>
          <span>1. This week at a glance</span>
          <p>
            {hasWeeklyPractice
              ? `You submitted ${review.submittedCount} practice ${review.submittedCount === 1 ? "task" : "tasks"} across ${review.activeDays} active ${review.activeDays === 1 ? "day" : "days"}.`
              : "Submit practice this week to build your first weekly review."}
          </p>
        </article>
        <article>
          <span>2. Your practice evidence</span>
          <p>
            {hasWeeklyPractice
              ? `${review.speakingCount ? `${review.speakingCount} speaking` : ""}${review.speakingCount && review.writingCount ? " and " : ""}${review.writingCount ? `${review.writingCount} writing` : ""} ${review.submittedCount === 1 ? "submission" : "submissions"}.`
              : "Your practice evidence will appear after your first weekly submission."}
          </p>
          {(taskTypeText || focusText) && (
            <small>{taskTypeText ? `Types: ${taskTypeText}.` : ""} {focusText ? `Focus: ${focusText}.` : ""}</small>
          )}
        </article>
        <article>
          <span>3. Your feedback evidence</span>
          <p>
            {review.reviewedCount
              ? `Your teacher reviewed ${review.reviewedCount} ${review.reviewedCount === 1 ? "submission" : "submissions"} this week.`
              : "When your teacher reviews a submission, your feedback evidence will appear here."}
          </p>
          {review.latestFeedbackFocus && <small>Latest next focus: {review.latestFeedbackFocus}</small>}
        </article>
        <article>
          <span>4. Your main learning pattern</span>
          <p>{mainPattern ? `Your main pattern this week: ${mainPattern}.` : "Your pattern will become clearer after more weekly practice."}</p>
        </article>
        <article className="progress-weekly-review-grid__focus">
          <span>5. Next week focus</span>
          <p>{nextFocus}</p>
        </article>
      </div>

      <a className="primary-button progress-weekly-review-card__cta" href="/practice">
        <span>Go to Today's Practice</span>
        <ArrowRightIcon />
      </a>
    </section>
  );
}

function ProgressStreakCard({ streak, submittedThisWeek }) {
  return (
    <section className="card progress-card progress-streak-card mascot-card mascot-card--compact" aria-labelledby="progress-streak-title">
      <div>
        <p className="card-eyebrow card-eyebrow--red">Consistency evidence</p>
        <h2 id="progress-streak-title">
          {streak.currentStreak} {streak.currentStreak === 1 ? "day" : "days"}
        </h2>
        <p>{streak.note}</p>
        <p className="progress-activity-focus">
          Best streak: {streak.bestStreak} {streak.bestStreak === 1 ? "day" : "days"}. This week: {submittedThisWeek} submitted {submittedThisWeek === 1 ? "task" : "tasks"}.
        </p>
      </div>
      <div className="mascot-card-visual">
        <MascotAnimation
          type="progress"
          size="small"
          motion="progress"
          label="Progress mascot for output streak"
        />
      </div>
    </section>
  );
}

function WeeklyActivityCard({ days }) {
  const activeCount = days.filter((day) => day.active).length;

  return (
    <section className="card progress-card weekly-completion-card" aria-labelledby="weekly-activity-title">
      <p className="card-eyebrow card-eyebrow--red">Recent habit activity</p>
      <h2 id="weekly-activity-title">Last 7 Days</h2>
      <p>
        {activeCount
          ? `${activeCount} day${activeCount === 1 ? "" : "s"} with submitted speaking or writing practice in the last 7 days.`
          : "No submitted speaking or writing practice in the last 7 days."}
      </p>
      <p className="progress-activity-focus">Every active day starts with one submitted output task.</p>
      <div className="progress-week-row" aria-label="Last 7 days submitted practice">
        {days.map((day, index) => (
          <span className={day.active ? "is-active" : ""} key={`${day.dateKey || day.label}-${index}`}>
            <i>{day.count || ""}</i>
            {day.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function TeacherScoresCard({ progress }) {
  const hasFeedback =
    progress.clarityAverage !== null ||
    progress.confidenceAverage !== null ||
    progress.accuracyAverage !== null;
  const scoreRows = [
    { label: "Clarity", value: progress.clarityAverage },
    { label: "Confidence", value: progress.confidenceAverage },
    { label: "Accuracy", value: progress.accuracyAverage }
  ].filter((row) => row.value !== null);

  return (
    <section className="card progress-card progress-score-card" aria-labelledby="teacher-scores-title">
      <p className="card-eyebrow card-eyebrow--red">Feedback evidence</p>
      <h2 id="teacher-scores-title">Teacher Review Signals</h2>
      <p>
        {hasFeedback
          ? "These private averages come from real reviewed feedback and are only for your growth."
          : "Waiting for teacher feedback. Your score evidence will appear after review."}
      </p>

      {scoreRows.length > 0 && (
        <div className="progress-score-list">
          {scoreRows.map((row) => (
            <div className="progress-score-row" key={row.label}>
              <span>{row.label}</span>
              <strong>{formatAverage(row.value, "/5")}</strong>
              <i style={{ "--score-width": `${row.value ? (row.value / 5) * 100 : 0}%` }} />
            </div>
          ))}
        </div>
      )}
      {progress.latestFocus && <p className="progress-activity-focus">Latest teacher next focus: {progress.latestFocus}</p>}
    </section>
  );
}

function SelfRatingCard({ averageRating }) {
  return (
    <section className="card progress-card progress-self-rating-card" aria-labelledby="self-rating-title">
      <div className="progress-card-icon" aria-hidden="true">
        <StarIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Self-reflection</p>
        <h2 id="self-rating-title">Average Self-Rating</h2>
        <p>{averageRating === null ? "Not enough data yet" : `${formatAverage(averageRating, "/5")} average from your submitted reflections.`}</p>
      </div>
    </section>
  );
}

function HabitBadgesCard({ badges }) {
  const earned = getEarnedBadges(badges);
  const earnedCount = earned.length;
  const latestEarned = getLatestEarnedBadge(badges);
  const nextBadge = getNextRecommendedBadge(badges);

  return (
    <section className="card progress-card progress-badges-card" aria-labelledby="progress-badges-title">
      <div className="progress-badges-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Habit badges</p>
          <h2 id="progress-badges-title">Consistency Milestones</h2>
          <p>
            {earnedCount
              ? `${earnedCount} of ${badges.length} consistency badges earned.`
              : "Submit your first speaking or writing task to unlock your first badge."}
          </p>
          <p className="progress-badges-card__note">Badges are earned by showing up, not by being perfect.</p>
        </div>
        <MascotAnimation
          type={earnedCount ? "progress" : "encouragement"}
          size="small"
          motion={latestEarned ? "celebrate" : earnedCount ? "progress" : "attention"}
          loop={!latestEarned}
          label={earnedCount ? "Progress mascot for earned habit badges" : "Encouragement mascot for first habit badge"}
        />
      </div>
      <div className="progress-badge-summary" aria-label="Badge progress summary">
        <div>
          <span>Earned</span>
          <strong>{earnedCount}/{badges.length}</strong>
        </div>
        <div>
          <span>Latest</span>
          <strong>{latestEarned ? latestEarned.label : "None yet"}</strong>
        </div>
        <div>
          <span>Working toward</span>
          <strong>{nextBadge ? nextBadge.label : "All earned"}</strong>
        </div>
      </div>
      {nextBadge && (
        <div className="progress-next-badge">
          <span>Next badge</span>
          <strong>{nextBadge.label}</strong>
          <p>{nextBadge.requirement}</p>
          <small>
            {nextBadge.current}{nextBadge.unit || ""} / {nextBadge.goal}{nextBadge.unit || ""}
          </small>
          <i style={{ "--badge-progress": `${nextBadge.progress}%` }} />
        </div>
      )}
      <div className="progress-badge-grid">
        {badges.map((badge) => (
          <article className={badge.earned ? "progress-badge is-earned" : "progress-badge"} key={badge.key}>
            <div aria-hidden="true">
              <StarIcon />
            </div>
            <span>{badge.label}</span>
            <p>{badge.earned ? badge.description : badge.requirement}</p>
            <strong>{badge.earned ? "Earned" : `${badge.progress}%`}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecentActivityCard({ activity }) {
  return (
    <section className="card progress-card progress-activity-card" aria-labelledby="recent-activity-title">
      <p className="card-eyebrow card-eyebrow--red">Practice history</p>
      <h2 id="recent-activity-title">Submitted Practice Evidence</h2>

      <div className="progress-activity-list">
        {activity.map((submission) => {
          const task = submission.assignedTask;
          const feedback = submission.feedback;

          return (
            <article className="progress-activity-item" key={submission.id}>
              <div>
                <h3>{task?.title || submission.taskTitle || "Submitted task"}</h3>
                <p>{formatDateTime(submission.submitted_at)}</p>
              </div>
              <div className="progress-activity-meta">
                {submission.sourceLabel && <span>{submission.sourceLabel}</span>}
                <span>{getActivityStatus(task, submission)}</span>
                {submission.source === "writing" ? (
                  <span>Writing output</span>
                ) : (
                  <span>{formatDuration(submission.duration_seconds)}</span>
                )}
                {submission.self_rating && <span>Self-rating {submission.self_rating}/5</span>}
                <span>{feedback ? "Reviewed" : "Waiting for teacher review"}</span>
              </div>
              {feedback?.next_focus && (
                <p className="progress-activity-focus">Next focus: {feedback.next_focus}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getActivityStatus(task, submission) {
  const status = task?.status || submission.status;
  return formatLabel(status);
}

function NextProgressTargetCard({ progress }) {
  const focus =
    progress.latestFocus ||
    progress.weeklyFocus?.targetDescription ||
    progress.weeklyFocus?.focusTitle ||
    "";

  return (
    <section className="card progress-card progress-next-focus" aria-labelledby="progress-next-focus-title">
      <div className="progress-card-icon" aria-hidden="true">
        <TargetIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Next progress target</p>
        <h2 id="progress-next-focus-title">Your next useful step</h2>
        <p>
          {focus ||
            "Submit one clear speaking task today. A more specific target will appear after teacher feedback or weekly focus."}
        </p>
        <p className="progress-activity-focus">
          {focus
            ? "Carry this single focus into your next recording."
            : "Keep it simple: one honest attempt is enough to create new progress evidence."}
        </p>
        <a className="secondary-button" href="/practice">Choose next task</a>
      </div>
    </section>
  );
}

function WeeklyFocusCard({ weeklyFocus }) {
  const hasFocus = Boolean(weeklyFocus);

  return (
    <section className="card progress-card progress-weekly-focus-card" aria-labelledby="progress-weekly-focus-title">
      <div className="progress-card-icon" aria-hidden="true">
        <TargetIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Teacher weekly focus</p>
        <h2 id="progress-weekly-focus-title">
          {hasFocus ? weeklyFocus.focusTitle || "Weekly focus" : "Your teacher has not set a weekly focus yet."}
        </h2>
        <p>
          {hasFocus
            ? weeklyFocus.focusNote || "Your teacher has not added a focus note yet."
            : "Your teacher's weekly focus will appear here when it is ready."}
        </p>
        {hasFocus && (
          <p className="progress-activity-focus">
            Target: {weeklyFocus.targetDescription || "No target description added yet."}
          </p>
        )}
        {weeklyFocus?.weekStart && (
          <p className="progress-activity-focus">Week starts: {formatDate(weeklyFocus.weekStart)}</p>
        )}
      </div>
    </section>
  );
}

function WritingProgressCard({ writing }) {
  const stats = writing?.stats || {
    totalTasks: 0,
    assignedTasks: 0,
    submittedTasks: 0,
    reviewedTasks: 0,
    waitingForReview: 0
  };
  const latestReviewed = writing?.submissions?.find((submission) => submission.status === "reviewed");

  return (
    <section className="card progress-card progress-writing-card" aria-labelledby="progress-writing-title">
      <div className="progress-card-icon" aria-hidden="true">
        <ArticleIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Writing output</p>
        <h2 id="progress-writing-title">Writing Practice</h2>
        <p>
          {stats.totalTasks
            ? `${stats.submittedTasks} submitted, ${stats.reviewedTasks} reviewed, ${stats.assignedTasks} waiting.`
            : "Your writing progress will appear after your teacher assigns your first writing task."}
        </p>
        {latestReviewed?.next_focus && (
          <p className="progress-activity-focus">Next writing focus: {latestReviewed.next_focus}</p>
        )}
        <a className="secondary-button" href="/writing">Open Writing</a>
      </div>
    </section>
  );
}

export function ProgressPage({ user, profile }) {
  const [state, setState] = useState({
    isLoading: false,
    error: "",
    tasks: [],
    submissions: [],
    feedback: [],
    weeklyFocus: null,
    writing: null
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      setState({
        isLoading: false,
        error: "",
        tasks: [],
        submissions: [],
        feedback: [],
        weeklyFocus: null,
        writing: null
      });

      if (profile?.role !== "student") {
        return;
      }

      setState((current) => ({
        ...current,
        isLoading: true
      }));

      const [result, writingResult] = await Promise.all([
        getStudentProgressData(profile.id),
        getWritingStudentOverview(profile.id)
      ]);

      if (!isMounted) {
        return;
      }

      setState({
        isLoading: false,
        error: result.error || "",
        tasks: result.tasks,
        submissions: result.submissions,
        feedback: result.feedback,
        weeklyFocus: result.weeklyFocus,
        writing: writingResult
      });
    }

    loadProgress();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, profile?.role]);

  const progress = useMemo(
    () =>
      buildProgressModel({
        tasks: state.tasks,
        submissions: state.submissions,
        feedback: state.feedback,
        weeklyFocus: state.weeklyFocus,
        writing: state.writing
      }),
    [state.feedback, state.submissions, state.tasks, state.weeklyFocus, state.writing]
  );

  if (profile?.role === "teacher") {
    return (
      <div className="progress-page">
        <Header user={user} title="Progress" subtitle="Track your speaking consistency and feedback over time." />
        <ProgressAccessState
          title="Progress is shown for student accounts."
          message="Teachers can use Teacher Tasks, Review, and My Students to track assigned learners."
        />
      </div>
    );
  }

  if (profile?.role === "admin") {
    return (
      <div className="progress-page">
        <Header user={user} title="Progress" subtitle="Track your speaking consistency and feedback over time." />
        <ProgressAccessState
          title="Student progress is shown for student accounts."
          message="Admins can use Users, Teacher Links, and the Consistency Board for school-level oversight."
        />
      </div>
    );
  }

  const practiceCta = (
    <a className="primary-button progress-empty-card__cta" href="/practice">
      <span>Go to Practice</span>
      <ArrowRightIcon />
    </a>
  );
  const hasWritingTasks = Boolean(state.writing?.stats?.totalTasks);
  const hasWritingSubmissions = Boolean(state.writing?.submissions?.length);
  const hasAnyTasks = state.tasks.length > 0 || hasWritingTasks;
  const hasAnySubmissions = state.submissions.length > 0 || hasWritingSubmissions;

  return (
    <div className="progress-page">
      <Header user={user} title="Progress" subtitle="Small daily English output wins become confidence over time." />

      {state.isLoading ? (
        <ProgressAccessState
          title="Loading your progress..."
          message="Please wait while we gather your speaking and writing tasks, submissions, and feedback."
        />
      ) : state.error ? (
        <ProgressAccessState
          title="Could not load progress."
          message={state.error}
        />
      ) : !hasAnyTasks ? (
        hasWritingTasks ? (
          <div className="progress-grid progress-grid--real">
            <ProgressAccessState
              title="No speaking progress yet."
              message="Your speaking progress will appear after your teacher assigns your first speaking task."
              action={practiceCta}
            />
            <WritingProgressCard writing={state.writing} />
          </div>
        ) : (
          <ProgressAccessState
            title="No progress yet."
            message="Your progress will appear after your teacher assigns your first speaking or writing task."
            action={practiceCta}
          />
        )
      ) : !hasAnySubmissions ? (
        <div className="progress-grid progress-grid--real">
          <ProgressSnapshotCard progress={progress} />
          <WeeklyImprovementReview review={progress.weeklyReview} />
          <SkillEvidenceCard progress={progress} />
          <WeeklyFocusCard weeklyFocus={progress.weeklyFocus} />
          <ProgressAccessState
            title="Your tasks are ready."
            message="Submit your first speaking or writing task to start building progress."
            action={practiceCta}
          />
          <WritingProgressCard writing={state.writing} />
          <HabitBadgesCard badges={progress.badges} />
          <NextProgressTargetCard progress={progress} />
        </div>
      ) : (
        <div className="progress-grid progress-grid--real">
          <ProgressSnapshotCard progress={progress} />
          <WeeklyImprovementReview review={progress.weeklyReview} />
          <SkillEvidenceCard progress={progress} />
          <ProgressStreakCard streak={progress.streak} submittedThisWeek={progress.submittedThisWeek} />
          <WeeklyActivityCard days={progress.streak.recentDays} />
          <TeacherScoresCard progress={progress} />
          <RecentActivityCard activity={progress.recentActivity} />
          <HabitBadgesCard badges={progress.badges} />
          <NextProgressTargetCard progress={progress} />
          <WritingProgressCard writing={state.writing} />
          <WeeklyFocusCard weeklyFocus={progress.weeklyFocus} />
          <SelfRatingCard averageRating={progress.selfRatingAverage} />
          {!state.feedback.length && (
            <ProgressAccessState
              title="Teacher feedback will improve your progress insights."
          message="You can already see your submitted practice. Score averages and next-focus guidance will appear after teacher review."
            />
          )}
        </div>
      )}
    </div>
  );
}
