import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { ArticleIcon, CalendarIcon, TargetIcon } from "../icons.jsx";
import { formatLevelForStaff } from "../../lib/heartOfEnglishLevels.js";
import { getTeacherAssignedTasks } from "../../lib/teacherTasks.js";

const filters = [
  { key: "all", label: "All" },
  { key: "assigned", label: "Assigned" },
  { key: "submitted", label: "Submitted" },
  { key: "reviewed", label: "Reviewed" },
  { key: "missed-cancelled", label: "Missed / Cancelled" }
];

function formatLabel(value) {
  if (!value) {
    return "Not set";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value, fallback = "Not scheduled") {
  if (!value) {
    return fallback;
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

function formatTaskText(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "Not added";
  }

  return value.trim();
}

function getTaskList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getTaskStatusLabel(status) {
  if (status === "in_progress") {
    return "In progress";
  }

  return formatLabel(status);
}

function getTaskStatusClass(status) {
  return `status-badge--${String(status || "").replaceAll("_", "-")}`;
}

function getFilterCount(tasks, filter) {
  if (filter === "all") {
    return tasks.length;
  }

  if (filter === "assigned") {
    return tasks.filter((task) => ["assigned", "in_progress"].includes(task.status)).length;
  }

  if (filter === "missed-cancelled") {
    return tasks.filter((task) => ["missed", "cancelled"].includes(task.status)).length;
  }

  return tasks.filter((task) => task.status === filter).length;
}

function taskMatchesFilter(task, filter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "assigned") {
    return ["assigned", "in_progress"].includes(task.status);
  }

  if (filter === "missed-cancelled") {
    return ["missed", "cancelled"].includes(task.status);
  }

  return task.status === filter;
}

function TeacherTasksState({ title, message, action }) {
  return (
    <section className="card teacher-tasks-state" aria-labelledby="teacher-tasks-state-title">
      <div className="teacher-tasks-state__icon" aria-hidden="true">
        <ArticleIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Teacher tasks</p>
        <h2 id="teacher-tasks-state-title">{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </section>
  );
}

function TeacherTaskStats({ tasks }) {
  const stats = [
    {
      label: "Total assigned tasks",
      value: tasks.length,
      icon: <ArticleIcon />
    },
    {
      label: "Waiting for student",
      value: tasks.filter((task) => ["assigned", "in_progress"].includes(task.status)).length,
      icon: <CalendarIcon />
    },
    {
      label: "Submitted",
      value: tasks.filter((task) => task.status === "submitted").length,
      icon: <TargetIcon />
    },
    {
      label: "Reviewed",
      value: tasks.filter((task) => task.status === "reviewed").length,
      icon: <TargetIcon />
    }
  ];

  return (
    <section className="teacher-task-stats" aria-label="Teacher task stats">
      {stats.map((stat) => (
        <article className="card teacher-task-stat" key={stat.label}>
          <div aria-hidden="true">{stat.icon}</div>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </article>
      ))}
    </section>
  );
}

function TeacherTaskFilters({ activeFilter, tasks, onChange }) {
  return (
    <div className="teacher-review-toolbar" aria-label="Task filters">
      {filters.map((filter) => (
        <button
          type="button"
          className={activeFilter === filter.key ? "is-active" : ""}
          onClick={() => onChange(filter.key)}
          key={filter.key}
        >
          {filter.label} <span>{getFilterCount(tasks, filter.key)}</span>
        </button>
      ))}
    </div>
  );
}

function TaskAction({ task }) {
  if (task.status === "submitted") {
    return (
      <a className="primary-button teacher-task-card__action" href="/teacher/review">
        Review
      </a>
    );
  }

  if (task.status === "reviewed") {
    return <span className="teacher-task-card__done">Reviewed</span>;
  }

  return (
    <button className="secondary-button teacher-task-card__action" type="button" disabled>
      Waiting for submission
    </button>
  );
}

function TaskDetailList({ title, items, fallback = "Not added" }) {
  return (
    <div className="teacher-task-details__block">
      <h3>{title}</h3>
      {items.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{fallback}</p>
      )}
    </div>
  );
}

function TeacherTaskDetails({ task }) {
  const guidingPhrases = getTaskList(task.guiding_phrases);
  const checklist = getTaskList(task.checklist);
  const latestSubmission = task.latestSubmission;

  const detailRows = [
    ["Student", `${task.student?.full_name || "Student"}${task.student?.email ? ` - ${task.student.email}` : ""}`],
    ["Task type", formatLabel(task.task_type)],
    ["Estimated time", `${task.estimated_minutes || 10} minutes`],
    ["Level", task.level ? formatLevelForStaff(task.level) : "Not added"],
    ["Focus", task.focus || "Not added"],
    ["Due date", formatDate(task.due_date)],
    ["Created", formatDateTime(task.created_at)],
    ["Task status", getTaskStatusLabel(task.status)],
    [
      "Submission",
      latestSubmission
        ? `${formatLabel(latestSubmission.status)} - ${formatDateTime(latestSubmission.submitted_at)}`
        : "No submission yet"
    ]
  ];

  return (
    <section className="teacher-task-details" aria-label={`Details for ${task.title}`}>
      <div className="teacher-task-details__grid">
        {detailRows.map(([label, value]) => (
          <div className="teacher-task-details__row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="teacher-task-details__block">
        <h3>Description</h3>
        <p>{formatTaskText(task.description)}</p>
      </div>

      <div className="teacher-task-details__block">
        <h3>Instructions</h3>
        <p>{formatTaskText(task.instructions)}</p>
      </div>

      <TaskDetailList
        title="Guiding phrases"
        items={guidingPhrases}
        fallback="No guiding phrases added."
      />

      <TaskDetailList
        title="Checklist"
        items={checklist}
        fallback="No checklist items added."
      />
    </section>
  );
}

function TeacherTaskCard({ task, isExpanded, onToggleDetails }) {
  const studentName = task.student?.full_name || "Student";
  const studentEmail = task.student?.email || "No email";
  const latestSubmission = task.latestSubmission;

  return (
    <article className="card teacher-task-card">
      <div className="teacher-task-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">{getTaskStatusLabel(task.status)}</p>
          <h2>{task.title}</h2>
          <p>
            {studentName}
            {studentEmail ? ` - ${studentEmail}` : ""}
          </p>
        </div>
        <span className={`status-badge ${getTaskStatusClass(task.status)}`}>
          {getTaskStatusLabel(task.status)}
        </span>
      </div>

      <div className="teacher-submission-meta">
        <span>{formatLabel(task.task_type)}</span>
        {task.focus && <span>Focus: {task.focus}</span>}
        {task.level && <span>Level: {formatLevelForStaff(task.level)}</span>}
        <span>Due: {formatDate(task.due_date)}</span>
        <span>{task.estimated_minutes || 10} min</span>
        <span>Created {formatDateTime(task.created_at)}</span>
      </div>

      <div className="teacher-task-card__submission">
        <div>
          <span>Submission</span>
          <p>
            {latestSubmission
              ? `${formatLabel(latestSubmission.status)} - ${formatDateTime(latestSubmission.submitted_at)}`
              : "No submission yet"}
          </p>
        </div>
        <div className="teacher-task-card__actions">
          <TaskAction task={task} />
          <button
            className="secondary-button teacher-task-card__action"
            type="button"
            onClick={onToggleDetails}
            aria-expanded={isExpanded}
          >
            {isExpanded ? "Hide details" : "View details"}
          </button>
        </div>
      </div>

      {isExpanded && <TeacherTaskDetails task={task} />}
    </article>
  );
}

export function TeacherTasksPage({ user, profile }) {
  const [tasks, setTasks] = useState([]);
  const [hasAssignedStudents, setHasAssignedStudents] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedTaskIds, setExpandedTaskIds] = useState(() => new Set());

  useEffect(() => {
    let isMounted = true;

    async function loadTeacherTasks() {
      setTasks([]);
      setError("");
      setHasAssignedStudents(false);
      setExpandedTaskIds(new Set());

      if (profile?.role !== "teacher") {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await getTeacherAssignedTasks(profile.id);

      if (!isMounted) {
        return;
      }

      setIsLoading(false);
      setHasAssignedStudents(result.hasAssignedStudents);

      if (result.error) {
        setError(result.error);
        return;
      }

      setTasks(result.tasks);
    }

    loadTeacherTasks();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, profile?.role]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => taskMatchesFilter(task, filter)),
    [filter, tasks]
  );

  function handleToggleTaskDetails(taskId) {
    setExpandedTaskIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(taskId)) {
        nextIds.delete(taskId);
      } else {
        nextIds.add(taskId);
      }

      return nextIds;
    });
  }

  if (profile?.role === "student") {
    return (
      <div className="teacher-tasks-page">
        <Header user={user} title="Task History" subtitle="Track assigned speaking tasks and student progress." />
        <TeacherTasksState
          title="Task history is only available for teacher accounts."
          message="Students can view their assigned tasks on the Practice page."
        />
      </div>
    );
  }

  if (profile?.role === "admin") {
    return (
      <div className="teacher-tasks-page">
        <Header user={user} title="Task History" subtitle="Track assigned speaking tasks and student progress." />
        <TeacherTasksState
          title="Task history is handled by teacher accounts."
          message="Use a teacher account linked to students to manage assigned speaking tasks."
        />
      </div>
    );
  }

  return (
    <div className="teacher-tasks-page">
      <Header user={user} title="Task History" subtitle="Track assigned, submitted, and reviewed speaking tasks after planning." />

      <div className="teacher-tasks-actions">
        <a className="primary-button" href="/teacher/daily-planner">Open Daily Planner</a>
        <a className="secondary-button" href="/teacher/assign">Create manual task</a>
      </div>

      {isLoading ? (
        <TeacherTasksState
          title="Loading task history..."
          message="Please wait while we open your assigned speaking tasks."
        />
      ) : error ? (
        <TeacherTasksState
          title="Could not load task history."
          message={error}
        />
      ) : !hasAssignedStudents ? (
        <TeacherTasksState
          title="No students assigned yet."
          message="Once students are linked to your teacher account, you can assign and track speaking tasks here."
        />
      ) : !tasks.length ? (
        <TeacherTasksState
          title="No tasks assigned yet."
          message="Open Daily Planner to create, review, and assign your first speaking task."
          action={<a className="primary-button" href="/teacher/daily-planner">Open Daily Planner</a>}
        />
      ) : (
        <>
          <TeacherTaskStats tasks={tasks} />
          <TeacherTaskFilters activeFilter={filter} tasks={tasks} onChange={setFilter} />

          {!visibleTasks.length ? (
            <TeacherTasksState
              title="No tasks in this filter."
              message="Try another status filter, or return to Daily Planner to plan new tasks."
              action={<a className="secondary-button" href="/teacher/daily-planner">Open Daily Planner</a>}
            />
          ) : (
            <div className="teacher-task-list">
              {visibleTasks.map((task) => (
                <TeacherTaskCard
                  task={task}
                  key={task.id}
                  isExpanded={expandedTaskIds.has(task.id)}
                  onToggleDetails={() => handleToggleTaskDetails(task.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
