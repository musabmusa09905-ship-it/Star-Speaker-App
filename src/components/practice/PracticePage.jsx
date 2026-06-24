import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { getAssignedTasksForStudent } from "../../lib/assignedTasks.js";
import {
  calculateStudentStreak,
  getStudentSubmissionsForHabit,
  getTodayHabitStatus
} from "../../lib/studentStreaks.js";
import { PracticeCategoryChips } from "./PracticeCategoryChips.jsx";
import { TeacherAssignmentNotice } from "./TeacherAssignmentNotice.jsx";
import { TodayPracticeSection } from "./TodayPracticeSection.jsx";
import { WeeklyHabitStatus } from "./WeeklyHabitStatus.jsx";
import { WeeklyPlanPreview } from "./WeeklyPlanPreview.jsx";

const taskFilters = [
  { key: "all", label: "All" },
  { key: "assigned", label: "Assigned" },
  { key: "submitted", label: "Submitted" },
  { key: "reviewed", label: "Reviewed" }
];

function formatTaskType(value) {
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

  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(date);
}

function isToday(value) {
  if (!value) {
    return false;
  }

  return value === getDateKey();
}

function getDateKey(date = new Date()) {
  const localDate = new Date(date);

  return [
    localDate.getFullYear(),
    String(localDate.getMonth() + 1).padStart(2, "0"),
    String(localDate.getDate()).padStart(2, "0")
  ].join("-");
}

function getDateKeyFromOffset(offsetDays) {
  const today = new Date();
  today.setDate(today.getDate() + offsetDays);

  return getDateKey(today);
}

function getTaskIcon(taskType) {
  const icons = {
    speaking: "mic",
    shadowing: "feedback",
    photo_description: "target",
    vocabulary_activation: "book",
    pronunciation: "feedback",
    reflection: "profile"
  };

  return icons[taskType] || "target";
}

function toPracticeTask(task) {
  return {
    ...task,
    icon: getTaskIcon(task.task_type),
    typeLabel: formatTaskType(task.task_type),
    statusLabel: formatTaskType(task.status),
    time: `${task.estimated_minutes || 10} min`,
    dueDateLabel: formatDate(task.due_date),
    isDueToday: isToday(task.due_date),
    href: `/record?taskId=${encodeURIComponent(task.id)}`,
    description: task.description || "Open the task to review your speaking instructions."
  };
}

function sortPracticeTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.due_date && b.due_date && a.due_date !== b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }

    if (a.due_date && !b.due_date) {
      return -1;
    }

    if (!a.due_date && b.due_date) {
      return 1;
    }

    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

function taskMatchesFilter(task, filter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "assigned") {
    return ["assigned", "in_progress"].includes(task.status);
  }

  return task.status === filter;
}

function getFilterCount(tasks, filter) {
  return tasks.filter((task) => taskMatchesFilter(task, filter)).length;
}

function isActiveTask(task) {
  return ["assigned", "in_progress"].includes(task.status);
}

function isSubmittedTask(task) {
  return task.status === "submitted";
}

function isReviewedTask(task) {
  return task.status === "reviewed";
}

function isPastDueTask(task) {
  return Boolean(task.due_date && task.due_date < getDateKey());
}

function isRecentPastDueTask(task) {
  if (!isPastDueTask(task)) {
    return false;
  }

  return task.due_date >= getDateKeyFromOffset(-3);
}

function withPracticeRole(task, priorityRole, overrides = {}) {
  return {
    ...task,
    priorityRole,
    ...overrides
  };
}

function buildPracticeTaskGroups(tasks) {
  const activeTasks = tasks.filter(isActiveTask);
  const currentTask =
    activeTasks.find((task) => task.isDueToday) ||
    activeTasks.find((task) => !isPastDueTask(task)) ||
    activeTasks[0] ||
    null;
  const usedTaskIds = new Set();

  if (currentTask) {
    usedTaskIds.add(currentTask.id);
  }

  const recoveryTasks = activeTasks
    .filter((task) => !usedTaskIds.has(task.id) && isRecentPastDueTask(task))
    .slice(0, 2);

  recoveryTasks.forEach((task) => usedTaskIds.add(task.id));

  const waitingTasks = tasks
    .filter((task) => isSubmittedTask(task) && !usedTaskIds.has(task.id))
    .slice(0, 2);

  waitingTasks.forEach((task) => usedTaskIds.add(task.id));

  const feedbackReadyTasks = tasks
    .filter((task) => isReviewedTask(task) && !usedTaskIds.has(task.id))
    .slice(0, 2);

  feedbackReadyTasks.forEach((task) => usedTaskIds.add(task.id));

  const olderTasks = tasks.filter((task) => !usedTaskIds.has(task.id));
  const oldActiveCount = activeTasks.filter((task) => isPastDueTask(task)).length;

  return {
    currentTask: currentTask
      ? withPracticeRole(currentTask, "current", {
        actionLabel: currentTask.isDueToday ? "Start Today's Practice" : "Start Practice"
      })
      : null,
    recoveryTasks: recoveryTasks.map((task) => withPracticeRole(task, "recovery", {
      actionLabel: "Restart with one task",
      contextLabel: "Recovery option"
    })),
    waitingTasks: waitingTasks.map((task) => withPracticeRole(task, "waiting")),
    feedbackReadyTasks: feedbackReadyTasks.map((task) => withPracticeRole(task, "feedback")),
    olderTasks: olderTasks.map((task) => withPracticeRole(task, "history", {
      actionLabel: isActiveTask(task) ? "Open Task" : undefined,
      actionTone: isActiveTask(task) ? "secondary" : undefined
    })),
    oldActiveCount
  };
}

function buildHabitPanel({ submissions, tasks, isLoading, error }) {
  if (isLoading) {
    return {
      currentStreak: 0,
      todayStatus: "Loading your speaking habit...",
      message: "Please wait while we check your recent submissions.",
      recentDays: [],
      startHref: ""
    };
  }

  if (error) {
    return {
      currentStreak: 0,
      todayStatus: "Habit activity unavailable",
      message: "Could not load your speaking habit activity. Please try again.",
      recentDays: [],
      startHref: ""
    };
  }

  const streak = calculateStudentStreak(submissions);
  const dailyHabit = getTodayHabitStatus({ submissions, tasks });
  const firstReadyTask = dailyHabit.nextTask;
  const hasSubmissions = submissions.length > 0;

  return {
    currentStreak: streak.currentStreak,
    todayStatus: dailyHabit.isComplete ? "Completed today" : "Not completed yet",
    message: dailyHabit.isComplete
      ? "You completed today's speaking habit."
      : hasSubmissions
        ? "Complete one speaking task today."
        : "Submit your first speaking task to start your streak.",
    recentDays: streak.recentDays,
    startHref: !hasSubmissions && firstReadyTask
      ? `/record?taskId=${encodeURIComponent(firstReadyTask.id)}`
      : ""
  };
}

export function PracticePage({ data, user, profile }) {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(profile?.role === "student");
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const isStudent = profile?.role === "student";

  useEffect(() => {
    let isMounted = true;

    async function loadTasks() {
      if (!isStudent || !profile?.id) {
        setTasks([]);
        setSubmissions([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      const [taskResult, submissionResult] = await Promise.all([
        getAssignedTasksForStudent(profile.id),
        getStudentSubmissionsForHabit(profile.id)
      ]);

      if (isMounted) {
        setTasks(taskResult.tasks);
        setSubmissions(submissionResult.submissions);
        setError(taskResult.error || submissionResult.error);
        setIsLoading(false);
      }
    }

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, [isStudent, profile?.id]);

  const practice = useMemo(() => {
    if (!isStudent) {
      return {
        ...data.todayPractice,
        hasAssignedTasks: false,
        title: "Practice tasks are shown for student accounts.",
        message: "Teachers manage assignments from teacher pages. Student accounts complete speaking practice here.",
        cta: "Student accounts only",
        mode: "role"
      };
    }

    if (isLoading) {
      return {
        ...data.todayPractice,
        hasAssignedTasks: false,
        title: "Loading your practice tasks...",
        message: "Please wait while we open your teacher-assigned practice.",
        cta: "Loading",
        mode: "loading"
      };
    }

    if (error) {
      return {
        ...data.todayPractice,
        hasAssignedTasks: false,
        title: "Could not load practice tasks. Please try again.",
        message: error,
        cta: "Try again later",
        mode: "error"
      };
    }

    const realTasks = sortPracticeTasks(tasks).map(toPracticeTask);

    if (realTasks.length === 0) {
      return data.todayPractice;
    }

    const filteredTasks = realTasks.filter((task) => taskMatchesFilter(task, activeFilter));

    if (activeFilter === "all") {
      return {
        ...data.todayPractice,
        hasAssignedTasks: realTasks.length > 0,
        tasks: realTasks,
        taskGroups: buildPracticeTaskGroups(realTasks),
        title: "No practice assigned yet.",
        message: "Your teacher has not assigned practice yet. When a task is ready, it will appear here.",
        cta: "No action needed",
        sectionTitle: "Today's mission"
      };
    }

    return {
      ...data.todayPractice,
      hasAssignedTasks: filteredTasks.length > 0,
      tasks: filteredTasks,
      title: "No tasks in this category yet.",
      message: "Try another status filter, or return when your teacher adds more speaking practice.",
      cta: "No action needed",
      sectionTitle: "Assigned practice"
    };
  }, [activeFilter, data.todayPractice, error, isLoading, isStudent, tasks]);

  const dailyHabit = useMemo(() => {
    if (!isStudent || isLoading || error) {
      return null;
    }

    return getTodayHabitStatus({ submissions, tasks });
  }, [error, isLoading, isStudent, submissions, tasks]);

  const habitPanel = useMemo(() => {
    if (!isStudent) {
      return null;
    }

    return buildHabitPanel({ submissions, tasks, isLoading, error });
  }, [error, isLoading, isStudent, submissions, tasks]);

  const filters = useMemo(() => {
    if (!isStudent || isLoading || error || tasks.length === 0) {
      return [];
    }

    return taskFilters.map((filter) => ({
      ...filter,
      count: getFilterCount(tasks, filter.key)
    }));
  }, [error, isLoading, isStudent, tasks]);

  return (
    <div className="practice-page">
      <Header user={user} title={data.header.title} subtitle={data.header.subtitle} />

      <div className="practice-grid">
        <WeeklyHabitStatus habit={habitPanel} />
        <TodayPracticeSection
          practice={practice}
          dailyHabit={dailyHabit}
          activeFilter={activeFilter}
          filters={filters}
          onFilterChange={setActiveFilter}
        />
        <PracticeCategoryChips categories={data.categories} />
        <TeacherAssignmentNotice notice={data.teacherNotice} />
        <WeeklyPlanPreview plan={data.weeklyPlan} />
      </div>
    </div>
  );
}
