import { useEffect, useMemo, useState } from "react";
import { Header } from "./Header.jsx";
import { QuickActions } from "./QuickActions.jsx";
import { ArrowRightIcon, FeedbackIcon, MicIcon, ProgressIcon, TargetIcon } from "./icons.jsx";
import { getStudentHomeDashboard } from "../lib/studentHome.js";

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

function buildDashboardModel({ tasks, submissions, feedback, weeklyPlan }) {
  const submittedTaskIds = new Set(submissions.map((submission) => submission.assigned_task_id));
  tasks.forEach((task) => {
    if (["submitted", "reviewed"].includes(task.status)) {
      submittedTaskIds.add(task.id);
    }
  });

  const reviewedTaskIds = new Set();
  feedback.forEach((item) => reviewedTaskIds.add(item.assigned_task_id));
  tasks.forEach((task) => {
    if (task.status === "reviewed") {
      reviewedTaskIds.add(task.id);
    }
  });

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const latestFeedback = feedback[0] || null;

  return {
    activeTask: pickActiveTask(tasks),
    summary: {
      total: tasks.length,
      submitted: submittedTaskIds.size,
      reviewed: reviewedTaskIds.size,
      pending: tasks.filter((task) => ["assigned", "in_progress"].includes(task.status)).length
    },
    latestFeedback: latestFeedback
      ? {
          ...latestFeedback,
          task: tasksById.get(latestFeedback.assigned_task_id) || null
        }
      : null,
    weeklyActivity: getWeeklyActivity(submissions),
    weeklyFocus: weeklyPlan
  };
}

function HomeStateCard({ title, message, action }) {
  return (
    <section className="card home-state-card" aria-labelledby="home-state-title">
      <div className="home-state-card__icon" aria-hidden="true">
        <TargetIcon />
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
    { label: "Total tasks", value: summary.total },
    { label: "Submitted", value: summary.submitted },
    { label: "Reviewed", value: summary.reviewed },
    { label: "Pending", value: summary.pending }
  ];

  return (
    <section className="card home-summary-card" aria-labelledby="home-summary-title">
      <div className="home-summary-card__header">
        <div>
          <p className="card-eyebrow">Real task summary</p>
          <h2 id="home-summary-title">Your Speaking Tasks</h2>
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

function ActiveTaskCard({ task }) {
  if (!task) {
    return (
      <section className="card task-card" aria-labelledby="home-active-task-title">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Today's active task</p>
          <h2 id="home-active-task-title">No active speaking task right now</h2>
        </div>
        <p className="task-card__description">
          Your teacher-assigned practice will appear here when a task is ready.
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
    <section className="card task-card" aria-labelledby="home-active-task-title">
      <div>
        <p className="card-eyebrow card-eyebrow--red">Today's active task</p>
        <h2 id="home-active-task-title">{task.title}</h2>
      </div>
      <div className="task-card__meta" aria-label="Task details">
        <span>{formatLabel(task.status)}</span>
        {task.focus && <span>Focus: {task.focus}</span>}
        {task.level && <span>{task.level}</span>}
        <span>{task.estimated_minutes || 10} min</span>
        <span>Due: {formatDate(task.due_date)}</span>
      </div>
      <p className="task-card__description">
        {task.description || "Open the task to review your speaking instructions."}
      </p>
      <div className="task-card__footer">
        <div className="task-card__mic" aria-hidden="true">
          <MicIcon />
        </div>
        <a className="primary-button" href={`/record?taskId=${encodeURIComponent(task.id)}`}>
          Start Practice
        </a>
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
            ? "These days show when you submitted speaking practice this week."
            : "Your activity will appear after your first submission."}
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
            : "After your teacher reviews a submission, the latest feedback will appear here."}
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
        {focus?.week_start && <span>Week of {formatDate(focus.week_start)}</span>}
      </div>
      <div className="teacher-card__icon" aria-hidden="true">
        <TargetIcon />
      </div>
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
    weeklyPlan: null
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
          weeklyPlan: null
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
        weeklyPlan: result.weeklyPlan
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
        weeklyPlan: state.weeklyPlan
      }),
    [state.feedback, state.submissions, state.tasks, state.weeklyPlan]
  );

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

  return (
    <div className="student-home">
      <Header user={user} />

      {state.isLoading ? (
        <HomeStateCard
          title="Loading your dashboard..."
          message="Please wait while we gather your tasks, submissions, and feedback."
        />
      ) : state.error ? (
        <HomeStateCard
          title="Could not load your dashboard."
          message={state.error}
        />
      ) : (
        <div className="dashboard-grid dashboard-grid--real">
          <HomeSummaryCard summary={dashboard.summary} />
          <ActiveTaskCard task={dashboard.activeTask} />
          <HomeWeeklyActivity
            days={dashboard.weeklyActivity}
            hasSubmissions={state.submissions.length > 0}
          />
          <QuickActions actions={data.quickActions} />
          <RecentFeedbackCard feedback={dashboard.latestFeedback} />
          <WeeklyFocusCard focus={dashboard.weeklyFocus} />
        </div>
      )}
    </div>
  );
}
