import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { getAssignedTasksForStudent } from "../../lib/assignedTasks.js";
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

  const today = new Date();
  const localDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  return value === localDate;
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

export function PracticePage({ data, user, profile }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(profile?.role === "student");
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const isStudent = profile?.role === "student";

  useEffect(() => {
    let isMounted = true;

    async function loadTasks() {
      if (!isStudent || !profile?.id) {
        setTasks([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      const result = await getAssignedTasksForStudent(profile.id);

      if (isMounted) {
        setTasks(result.tasks);
        setError(result.error);
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
        message: "Teacher assignment tools will be added later.",
        cta: "Student accounts only",
        mode: "role"
      };
    }

    if (isLoading) {
      return {
        ...data.todayPractice,
        hasAssignedTasks: false,
        title: "Loading your practice tasks...",
        message: "Please wait while we check your teacher-assigned practice.",
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

    return {
      ...data.todayPractice,
      hasAssignedTasks: filteredTasks.length > 0,
      tasks: filteredTasks,
      title: "No tasks in this category yet.",
      message: "Try another status filter, or check back after your teacher assigns more practice.",
      cta: "No action needed",
      sectionTitle: "Assigned Practice"
    };
  }, [activeFilter, data.todayPractice, error, isLoading, isStudent, tasks]);

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
        <WeeklyHabitStatus habit={data.weeklyHabit} />
        <TodayPracticeSection
          practice={practice}
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
