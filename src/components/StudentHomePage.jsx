import { useEffect, useMemo, useState } from "react";
import { Header } from "./Header.jsx";
import { MascotAnimation } from "./common/MascotAnimation.jsx";
import { QuickActions } from "./QuickActions.jsx";
import { ArticleIcon, FeedbackIcon, MicIcon, ProgressIcon, TargetIcon } from "./icons.jsx";
import { getStudentHomeDashboard } from "../lib/studentHome.js";
import { calculateStudentStreak, getTodayHabitStatus } from "../lib/studentStreaks.js";
import { getBadgeSummary } from "../lib/studentBadges.js";
import { getStudentReminderState } from "../lib/studentReminders.js";
import { calculateOutputPoints, combineOutputSubmissions } from "../lib/outputProgress.js";

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

function formatDate(value) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function previewText(value, maxLength = 118) {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function getTodayString() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");
}

function getWeekStart(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function getWeeklyActivity(submissions) {
  const weekStart = getWeekStart();

  return weekLabels.map((label, index) => {
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
      active: count > 0,
      count
    };
  });
}

function pickActiveTask(tasks) {
  const activeTasks = tasks.filter((task) => ["assigned", "in_progress"].includes(task.status));
  const today = getTodayString();
  const dueToday = activeTasks.find((task) => task.due_date === today);

  if (dueToday) {
    return dueToday;
  }

  return activeTasks[0] || null;
}

function getTaskTypeLabel(task) {
  return formatLabel(task?.task_type || "speaking");
}

function getTaskFinishLine(task) {
  const checklist = Array.isArray(task?.checklist) ? task.checklist.filter(Boolean) : [];
  const guidingPhrases = Array.isArray(task?.guiding_phrases) ? task.guiding_phrases.filter(Boolean) : [];

  if (checklist.length) {
    return checklist.slice(0, 3).join(" ");
  }

  if (task?.instructions) {
    return previewText(task.instructions, 150);
  }

  if (guidingPhrases.length) {
    return `Use one helpful phrase: ${guidingPhrases.slice(0, 2).join(" / ")}. Submit one understandable recording.`;
  }

  if (task?.task_type === "pronunciation") {
    return "Record one clear answer. Focus on careful sound, steady rhythm, and understandable delivery.";
  }

  if (task?.task_type === "photo_description") {
    return "Record one focused description. Mention what you see, one detail, and one simple opinion.";
  }

  if (task?.task_type === "reflection") {
    return "Record one honest reflection. Mention one idea, one reason, and one example.";
  }

  return "Record one 45-60 second answer. Mention one idea, one reason, and one example. Submit one understandable recording.";
}

function getMissionSummary(task) {
  if (!task) {
    return "";
  }

  if (task.description) {
    return previewText(task.description, 150);
  }

  return `Prepare one clear ${getTaskTypeLabel(task).toLowerCase()} answer and submit it when you are ready.`;
}

function hasOldPendingTasks(tasks) {
  const today = getTodayString();

  return tasks.some((task) => (
    ["assigned", "in_progress"].includes(task.status) &&
    task.due_date &&
    task.due_date < today
  ));
}

function getLatestOutputSubmission(outputSubmissions) {
  return [...(outputSubmissions || [])].sort((a, b) => (
    new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
  ))[0] || null;
}

function getHomePriorityState(dashboard) {
  const latestOutput = getLatestOutputSubmission(dashboard.outputSubmissions);
  const latestFeedbackDate = dashboard.latestFeedback?.created_at
    ? new Date(dashboard.latestFeedback.created_at).getTime()
    : 0;
  const latestOutputDate = latestOutput?.submitted_at ? new Date(latestOutput.submitted_at).getTime() : 0;
  const feedbackIsReady = Boolean(dashboard.latestFeedback && latestFeedbackDate >= latestOutputDate);

  if (feedbackIsReady) {
    return {
      type: "feedback_ready",
      feedback: dashboard.latestFeedback,
      task: dashboard.activeTask,
      title: "Feedback is ready",
      eyebrow: "Today's coaching",
      tone: "feedback"
    };
  }

  if (dashboard.todayHabit.isComplete) {
    return {
      type: "completed",
      task: dashboard.todayHabit.latestTask,
      submission: dashboard.todayHabit.latestSubmission,
      title: "Today's habit is protected",
      eyebrow: "Practice complete",
      tone: "complete"
    };
  }

  if (dashboard.activeTask) {
    return {
      type: hasOldPendingTasks(dashboard.tasks) ? "recovery" : "task_available",
      task: dashboard.activeTask,
      title: hasOldPendingTasks(dashboard.tasks) ? "Fresh start for today" : "Today's Mission",
      eyebrow: hasOldPendingTasks(dashboard.tasks) ? "Your next step" : "Start here",
      tone: "mission"
    };
  }

  return {
    type: "no_task",
    title: "No task for today yet",
    eyebrow: "Today",
    tone: "quiet"
  };
}

function buildDashboardModel({ tasks, submissions, feedback, weeklyFocus, learningProfile, reminderPreferences, writing }) {
  const writingTasks = writing?.tasks || [];
  const writingSubmissions = writing?.submissions || [];
  const outputSubmissions = combineOutputSubmissions({
    speakingSubmissions: submissions,
    writingSubmissions,
    speakingTasks: tasks,
    writingTasks
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
  feedback.forEach((item) => reviewedTaskIds.add(item.assigned_task_id));
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

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const latestFeedback = feedback[0] || null;

  return {
    activeTask: pickActiveTask(tasks),
    tasks,
    outputSubmissions,
    streak: calculateStudentStreak(outputSubmissions),
    badgeSummary: getBadgeSummary(outputSubmissions),
    todayHabit: getTodayHabitStatus({ submissions: outputSubmissions, tasks }),
    reminderState: getStudentReminderState({
      preferences: reminderPreferences,
      tasks,
      submissions: outputSubmissions,
      feedback
    }),
    summary: {
      total: tasks.length + writingTasks.length,
      submitted: submittedTaskIds.size + submittedWritingTaskIds.size,
      reviewed: reviewedTaskIds.size + reviewedWritingTaskIds.size,
      pending:
        tasks.filter((task) => ["assigned", "in_progress"].includes(task.status)).length +
        writingTasks.filter((task) => task.status === "assigned").length,
      outputPoints: calculateOutputPoints(outputSubmissions)
    },
    latestFeedback: latestFeedback
      ? {
          ...latestFeedback,
          task: tasksById.get(latestFeedback.assigned_task_id) || null
        }
      : null,
    weeklyActivity: getWeeklyActivity(outputSubmissions),
    hasOutputSubmissions: outputSubmissions.length > 0,
    weeklyFocus,
    learningProfile,
    writing: writing || {
      tasks: [],
      submissions: [],
      stats: { totalTasks: 0, assignedTasks: 0, submittedTasks: 0, reviewedTasks: 0 }
    }
  };
}

function HomePriorityHero({ state, dashboard }) {
  if (state.type === "no_task") {
    return (
      <section className="card home-priority-card home-priority-card--quiet" aria-labelledby="home-priority-title">
        <div className="home-priority-card__content">
          <p className="card-eyebrow card-eyebrow--red">{state.eyebrow}</p>
          <h2 id="home-priority-title">{state.title}</h2>
          <p>
            Your teacher has not assigned practice for today yet. When a task is ready, this page will show exactly what to do first.
          </p>
          <div className="home-priority-actions">
            <a className="secondary-button" href="/library">Open Library</a>
            <a className="secondary-button" href="/practice">View Practice</a>
          </div>
        </div>
        <div className="home-priority-card__visual" aria-hidden="true">
          <MascotAnimation type="thinking" size="small" motion="thinking" label="Thinking mascot" />
        </div>
      </section>
    );
  }

  if (state.type === "feedback_ready") {
    const feedback = state.feedback;
    const correction = feedback?.correction_note || feedback?.next_focus || "";

    return (
      <section className="card home-priority-card home-priority-card--feedback" aria-labelledby="home-priority-title">
        <div className="home-priority-card__content">
          <p className="card-eyebrow">{state.eyebrow}</p>
          <h2 id="home-priority-title">{state.title}</h2>
          <p className="home-priority-card__summary">
            {previewText(feedback?.teacher_comment, 160) ||
              "Review one correction before today's practice."}
          </p>
          <div className="home-priority-finish">
            <strong>Apply this next</strong>
            <span>{correction || "Open your feedback and choose one thing to use in your next answer."}</span>
          </div>
          <p className="home-priority-loop">
            {"Read it once. Then speak naturally in your next recording."}
          </p>
          <div className="home-priority-actions">
            <a className="primary-button" href="/feedback">Review Feedback</a>
            {dashboard.activeTask ? (
              <a className="secondary-button" href={`/record?taskId=${encodeURIComponent(dashboard.activeTask.id)}`}>
                Practice the Correction
              </a>
            ) : (
              <a className="secondary-button" href="/practice">Open Practice</a>
            )}
          </div>
        </div>
        <div className="home-priority-card__visual" aria-hidden="true">
          <MascotAnimation type="encouragement" size="small" motion="idle" label="Encouraging mascot" />
        </div>
      </section>
    );
  }

  if (state.type === "completed") {
    const submittedTitle = state.task?.title || state.submission?.taskTitle || "Your practice task";
    const duration = state.submission?.duration_seconds
      ? `${Math.round(state.submission.duration_seconds)} seconds recorded`
      : "One active day added";

    return (
      <section className="card home-priority-card home-priority-card--complete" aria-labelledby="home-priority-title">
        <div className="home-priority-card__content">
          <p className="card-eyebrow">{state.eyebrow}</p>
          <h2 id="home-priority-title">{state.title}</h2>
          <p className="home-priority-card__summary">
            {submittedTitle} was submitted today. One honest attempt is enough.
          </p>
          <div className="home-priority-stats" aria-label="Progress gained today">
            <span><strong>{duration}</strong><small>Progress gained</small></span>
            <span><strong>{dashboard.summary.submitted}</strong><small>Total submitted</small></span>
            <span><strong>{dashboard.summary.outputPoints}</strong><small>Output points</small></span>
          </div>
          <p className="home-priority-card__note">Your teacher will review this next.</p>
          <div className="home-priority-actions">
            <a className="secondary-button" href="/practice">Do extra practice</a>
            <a className="secondary-button" href="/progress">Check Progress</a>
          </div>
        </div>
        <div className="home-priority-card__visual" aria-hidden="true">
          <MascotAnimation type="celebration" size="small" motion="celebrate" label="Celebration mascot" />
        </div>
      </section>
    );
  }

  const task = state.task;

  return (
    <section className="card home-priority-card home-priority-card--mission" aria-labelledby="home-priority-title">
      <div className="home-priority-card__content">
        <p className="card-eyebrow">{state.eyebrow}</p>
        <h2 id="home-priority-title">{state.title}</h2>
        {state.type === "recovery" && (
          <p className="home-priority-card__note">
            Yesterday is closed. One useful recording today is enough to move forward.
            If today feels heavy, start with the minimum useful version.
          </p>
        )}
        <div className="home-priority-task">
          <h3>{task.title}</h3>
          <p>{getMissionSummary(task)}</p>
        </div>
        <div className="home-priority-meta" aria-label="Mission details">
          <span>{getTaskTypeLabel(task)}</span>
          <span>{task.estimated_minutes || 10} min</span>
          {task.focus && <span>Focus: {task.focus}</span>}
        </div>
        <div className="home-priority-actions">
          <a className="primary-button" href={`/record?taskId=${encodeURIComponent(task.id)}`}>
            Start Today's Speaking Practice
          </a>
          <a className="secondary-button" href="/practice">View Practice</a>
        </div>
        <div className="home-priority-finish">
          <strong>Finish line</strong>
          <span>{getTaskFinishLine(task)}</span>
        </div>
      </div>
      <div className="home-priority-card__visual" aria-hidden="true">
        <MascotAnimation type="explaining" size="small" motion="idle" label="Explaining mascot" />
      </div>
    </section>
  );
}

function HomeHeroStreak({ streak }) {
  if (!streak || (!streak.currentStreak && !streak.bestStreak)) {
    return null;
  }

  const current = streak.currentStreak || 0;
  const best = streak.bestStreak || 0;

  return (
    <div className="home-header-streak" aria-label="Speaking streak summary">
      <span>{current} day{current === 1 ? "" : "s"} streak</span>
      {best > current && <small>Best: {best} days</small>}
      {streak.note && <small>{streak.note}</small>}
    </div>
  );
}

function HomeStateCard({ title, message, action, isLoading = false }) {
  return (
    <section
      className={`card home-state-card ${isLoading ? "branded-loading-state" : ""}`}
      aria-labelledby="home-state-title"
    >
      <div className="home-state-card__icon" aria-hidden="true">
        {isLoading ? <img src="/app-icon.png" alt="" decoding="async" /> : <TargetIcon />}
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Student dashboard</p>
        <h2 id="home-state-title">{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </section>
  );
}

function HomeSummaryCard({ summary }) {
  const items = [
    { label: "Output tasks", value: summary.total },
    { label: "Submitted", value: summary.submitted },
    { label: "Reviewed", value: summary.reviewed },
    { label: "Pending", value: summary.pending },
    { label: "Output points", value: summary.outputPoints }
  ];

  return (
    <section className="card home-summary-card" aria-labelledby="home-summary-title">
      <div className="home-summary-card__header">
        <div>
          <p className="card-eyebrow">Task summary</p>
          <h2 id="home-summary-title">Your output tasks</h2>
        </div>
        <ProgressIcon />
      </div>
      <div className="home-summary-grid">
        {items.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TodayHabitCard({ habit }) {
  const mascotType = habit.isComplete ? "celebration" : "encouragement";

  return (
    <section className="card home-habit-card mascot-card mascot-card--compact" aria-labelledby="home-habit-title">
      <div className="mascot-card-content">
        <p className="card-eyebrow card-eyebrow--red">Today's speaking practice</p>
        <h2 id="home-habit-title">{habit.title}</h2>
        <p>{habit.message}</p>
      </div>
      <div className="mascot-card-visual">
        <MascotAnimation
          type={mascotType}
          size="small"
          motion={habit.isComplete ? "celebrate" : "idle"}
          loop={!habit.isComplete}
          label={
            habit.isComplete
              ? "Celebrating completed speaking practice"
              : "Encouraging speaking practice guide"
          }
        />
      </div>
      {!habit.isComplete && habit.nextTask && (
        <a className="primary-button" href={`/record?taskId=${encodeURIComponent(habit.nextTask.id)}`}>
          Start Practice
        </a>
      )}
      {habit.isComplete && (
        <a className="secondary-button" href="/feedback">
          View Feedback
        </a>
      )}
    </section>
  );
}

function ActiveTaskCard({ task }) {
  if (!task) {
    return (
      <section className="card task-card" aria-labelledby="home-active-task-title">
        <div className="mascot-inline">
          <MascotAnimation
            type="thinking"
            size="small"
            motion="thinking"
            label="Thinking mascot for no active task"
          />
          <div>
            <p className="card-eyebrow card-eyebrow--red">Today's active task</p>
        <h2 id="home-active-task-title">No active speaking task right now</h2>
          </div>
        </div>
        <p className="task-card__description">
          Your teacher has not assigned a practice task for today yet.
        </p>
        <div className="task-card__footer">
          <div className="task-card__mic" aria-hidden="true">
            <MicIcon />
          </div>
          <a className="secondary-button" href="/practice">View Practice</a>
        </div>
      </section>
    );
  }

  return (
    <section className="card task-card mascot-card mascot-card--compact" aria-labelledby="home-active-task-title">
      <div className="mascot-card-content">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Today's active task</p>
          <h2 id="home-active-task-title">{task.title}</h2>
        </div>
        <div className="task-card__meta" aria-label="Task details">
          <span>{formatLabel(task.status)}</span>
          {task.focus && <span>Focus: {task.focus}</span>}
          <span>{task.estimated_minutes || 10} min</span>
          <span>Due: {formatDate(task.due_date)}</span>
        </div>
        <p className="task-card__description">
          {task.description || "Open the task, prepare your idea, and make one clear recording."}
        </p>
        <a className="primary-button" href={`/record?taskId=${encodeURIComponent(task.id)}`}>
          Start Practice
        </a>
      </div>
      <div className="mascot-card-visual">
        <MascotAnimation
          type="explaining"
          size="small"
          motion="idle"
          label="Explaining mascot for active speaking task"
        />
      </div>
    </section>
  );
}

function HomeWeeklyActivity({ days, hasSubmissions }) {
  return (
    <section className="card weekly-card" aria-labelledby="home-weekly-title">
      <div className="weekly-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">This week</p>
          <h2 id="home-weekly-title">Weekly Activity</h2>
        </div>
      </div>
      <div className="weekly-empty">
        <p>
          {hasSubmissions
            ? "These days show when you submitted speaking or writing practice this week."
            : "Your activity will appear after your first submitted task."}
        </p>
        <div className="home-week-row" aria-label="Weekly submission activity">
          {days.map((day, index) => (
            <span className={day.active ? "is-active" : ""} key={`${day.label}-${index}`}>
              <i>{day.count || ""}</i>
              {day.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentFeedbackCard({ feedback }) {
  return (
    <section className="card home-feedback-card" aria-labelledby="home-feedback-title">
      <div>
        <p className="card-eyebrow card-eyebrow--red">Recent feedback</p>
        <h2 id="home-feedback-title">
          {feedback ? feedback.task?.title || "Reviewed speaking task" : "No reviewed feedback yet"}
        </h2>
        <p>
          {feedback
            ? previewText(feedback.teacher_comment) || "Your teacher reviewed this task."
            : "No feedback yet. Once your teacher reviews your work, it will appear here."}
        </p>
        {feedback?.next_focus && <span>Next focus: {feedback.next_focus}</span>}
      </div>
      <div className="teacher-card__icon" aria-hidden="true">
        <FeedbackIcon />
      </div>
    </section>
  );
}

function WeeklyFocusCard({ focus }) {
  const hasFocus = Boolean(focus);

  return (
    <section className="card teacher-card" aria-labelledby="home-focus-title">
      <div>
        <p className="card-eyebrow card-eyebrow--red">Teacher weekly focus</p>
        <h2 id="home-focus-title">
          {hasFocus ? focus.focusTitle || "Weekly focus" : "No weekly focus yet"}
        </h2>
        <p>
          {hasFocus
            ? focus.focusNote || "Your teacher has not added a focus note yet."
            : "Your teacher has not set a weekly focus yet."}
        </p>
        {hasFocus && (
          <span>Target: {focus.targetDescription || "No target description added yet."}</span>
        )}
        {focus?.weekStart && <span>Week of {formatDate(focus.weekStart)}</span>}
      </div>
      <div className="teacher-card__icon" aria-hidden="true">
        <TargetIcon />
      </div>
    </section>
  );
}

function PracticeReminderCard({ reminder }) {
  return (
    <section className="card home-reminder-card" aria-labelledby="home-reminder-title">
      <div className={reminder.type === "submitted_today" || reminder.type === "reviewed" ? "home-reminder-card__icon is-complete" : "home-reminder-card__icon"} aria-hidden="true">
        <MicIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">In-app reminder</p>
        <h2 id="home-reminder-title">{reminder.title}</h2>
        <p>{reminder.message}</p>
        <span>{formatLabel(reminder.slot)} rhythm</span>
      </div>
      <a className={reminder.type === "task_available" ? "primary-button" : "secondary-button"} href={reminder.actionHref}>
        {reminder.actionLabel}
      </a>
    </section>
  );
}

function HomeBadgeCard({ badgeSummary }) {
  const latestEarned = badgeSummary.latestEarned;
  const nextBadge = badgeSummary.nextBadge;
  const focusBadge = latestEarned || nextBadge;
  const mascotType = latestEarned ? "celebration" : "progress";

  return (
    <section className="card home-badge-card mascot-card mascot-card--compact" aria-labelledby="home-badge-title">
      <div>
        <p className="card-eyebrow card-eyebrow--red">{latestEarned ? "Latest badge" : "Next badge"}</p>
        <h2 id="home-badge-title">
          {focusBadge ? focusBadge.label : "First Step"}
        </h2>
        <p>
          {latestEarned
            ? latestEarned.description
            : focusBadge?.requirement || "Submit your first speaking or writing task to unlock your first badge."}
        </p>
        <p className="profile-note">Badges are earned by showing up, not by being perfect.</p>
        <span>{badgeSummary.earnedCount} badges earned</span>
      </div>
      <div className="mascot-card-visual">
        <MascotAnimation
          type={mascotType}
          size="small"
          motion={latestEarned ? "celebrate" : "progress"}
          loop={!latestEarned}
          label={latestEarned ? "Celebration mascot for latest badge" : "Progress mascot for next badge"}
        />
      </div>
    </section>
  );
}

function HomeWritingCard({ writing }) {
  const stats = writing?.stats || {
    totalTasks: 0,
    assignedTasks: 0,
    submittedTasks: 0,
    reviewedTasks: 0
  };
  const nextTask = writing?.tasks?.find((task) => task.status === "assigned" && !task.latestSubmission);
  const latestReviewed = writing?.submissions?.find((submission) => submission.status === "reviewed");

  return (
    <section className="card home-writing-card" aria-labelledby="home-writing-title">
      <div className="home-writing-card__icon" aria-hidden="true">
        <ArticleIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Writing habit</p>
        <h2 id="home-writing-title">
          {nextTask ? nextTask.title : stats.totalTasks ? "Writing practice in progress" : "No writing task yet"}
        </h2>
        <p>
          {nextTask
            ? "Open the writing page and submit a short answer when you are ready."
            : stats.totalTasks
              ? "Your writing submissions and reviews are tracked separately from voice practice."
              : "Your teacher has not assigned writing practice yet."}
        </p>
        {latestReviewed?.next_focus && <span>Next writing focus: {latestReviewed.next_focus}</span>}
      </div>
      <div className="home-writing-card__stats" aria-label="Writing summary">
        <span>{stats.assignedTasks} waiting</span>
        <span>{stats.submittedTasks} submitted</span>
        <span>{stats.reviewedTasks} reviewed</span>
      </div>
      <a className={nextTask ? "primary-button" : "secondary-button"} href="/writing">
        {nextTask ? "Start Writing" : "Open Writing"}
      </a>
    </section>
  );
}

export function StudentHomePage({ data, profile }) {
  const [state, setState] = useState({
    isLoading: profile?.role === "student",
    error: "",
    tasks: [],
    submissions: [],
    feedback: [],
    weeklyFocus: null,
    learningProfile: null,
    reminderPreferences: null,
    writing: null
  });

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (profile?.role !== "student") {
        setState({
          isLoading: false,
          error: "",
          tasks: [],
          submissions: [],
          feedback: [],
          weeklyFocus: null,
          learningProfile: null,
          reminderPreferences: null,
          writing: null
        });
        return;
      }

      setState((current) => ({
        ...current,
        isLoading: true,
        error: ""
      }));

      const result = await getStudentHomeDashboard(profile.id);

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
        learningProfile: result.learningProfile,
        reminderPreferences: result.reminderPreferences,
        writing: result.writing
      });
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, profile?.role]);

  const dashboard = useMemo(
    () =>
      buildDashboardModel({
        tasks: state.tasks,
        submissions: state.submissions,
        feedback: state.feedback,
        weeklyFocus: state.weeklyFocus,
        learningProfile: state.learningProfile,
        reminderPreferences: state.reminderPreferences,
        writing: state.writing
      }),
    [state.feedback, state.learningProfile, state.reminderPreferences, state.submissions, state.tasks, state.weeklyFocus, state.writing]
  );
  const priorityState = useMemo(() => getHomePriorityState(dashboard), [dashboard]);

  const user = data.user;

  if (profile?.role !== "student") {
    return (
      <div className="student-home">
        <Header user={user} />
        <HomeStateCard
          title="Student home dashboard is shown for student accounts."
          message="Use the teacher pages to assign, manage, and review speaking tasks."
        />
      </div>
    );
  }

  const hasWritingActivity =
    (dashboard.writing?.stats?.totalTasks || 0) > 0 ||
    (dashboard.writing?.submissions?.length || 0) > 0;

  return (
    <div className="student-home">
      <Header user={user}>
        {!state.isLoading && !state.error && <HomeHeroStreak streak={dashboard.streak} />}
      </Header>

      {state.isLoading ? (
        <HomeStateCard
          title="Loading your dashboard..."
          message="Please wait while we gather your tasks, submissions, and feedback."
          isLoading
        />
      ) : state.error ? (
        <HomeStateCard
          title="Could not load your dashboard."
          message={state.error}
        />
      ) : (
        <div className="student-home-priority-stack">
          <HomePriorityHero state={priorityState} dashboard={dashboard} />
          <details className="home-secondary-details">
            <summary>More progress details</summary>
            <div className="dashboard-grid dashboard-grid--real home-secondary-grid">
              <WeeklyFocusCard focus={dashboard.weeklyFocus} />
              <HomeSummaryCard summary={dashboard.summary} />
              <RecentFeedbackCard feedback={dashboard.latestFeedback} />
              <HomeWeeklyActivity
                days={dashboard.weeklyActivity}
                hasSubmissions={dashboard.hasOutputSubmissions}
              />
              <HomeBadgeCard badgeSummary={dashboard.badgeSummary} />
              {hasWritingActivity && <HomeWritingCard writing={dashboard.writing} />}
              <QuickActions actions={data.quickActions} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
