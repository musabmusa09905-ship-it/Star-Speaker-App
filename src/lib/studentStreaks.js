import { requireSupabaseClient } from "./supabaseClient.js";
import { combineOutputSubmissions } from "./outputProgress.js";

const submissionColumns = [
  "id",
  "assigned_task_id",
  "student_id",
  "duration_seconds",
  "self_rating",
  "reflection_text",
  "submitted_at",
  "status"
].join(", ");

const assignedTaskColumns = [
  "id",
  "student_id",
  "title",
  "due_date"
].join(", ");

const writingTaskColumns = [
  "id",
  "student_id",
  "title",
  "due_date"
].join(", ");

const writingSubmissionColumns = [
  "id",
  "task_id",
  "student_id",
  "self_reflection",
  "submitted_at",
  "status"
].join(", ");

function normalizeError(error) {
  if (!error) {
    return null;
  }

  return "Could not load your speaking habit activity. Please try again.";
}

function toLocalDate(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

export function getLocalDateKey(value = new Date()) {
  const date = toLocalDate(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function dateFromKey(key) {
  const [year, month, day] = String(key || "")
    .split("-")
    .map((part) => Number(part));

  if (!year || !month || !day) {
    return toLocalDate();
  }

  return new Date(year, month - 1, day);
}

function shiftDateKey(key, offsetDays) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + offsetDays);
  return getLocalDateKey(date);
}

function getSubmissionDayCounts(submissions) {
  return (submissions || []).reduce((counts, submission) => {
    if (!submission.submitted_at) {
      return counts;
    }

    const key = getLocalDateKey(submission.submitted_at);
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map());
}

function countConsecutiveDays(dayCounts, endKey) {
  let count = 0;
  let cursor = endKey;

  while (dayCounts.has(cursor)) {
    count += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return count;
}

function getStreakGroups(dayCounts) {
  const sortedKeys = [...dayCounts.keys()].sort();
  const groups = [];
  let currentLength = 0;
  let previousKey = "";

  sortedKeys.forEach((key) => {
    if (previousKey && shiftDateKey(previousKey, 1) === key) {
      currentLength += 1;
    } else {
      currentLength = 1;
    }

    groups.push(currentLength);
    previousKey = key;
  });

  return groups;
}

export function calculateBestStreak(submissions) {
  const dayCounts = getSubmissionDayCounts(submissions);
  return Math.max(0, ...getStreakGroups(dayCounts));
}

function getRecentSevenDays(dayCounts, baseDate = new Date()) {
  const todayKey = getLocalDateKey(baseDate);
  const startKey = shiftDateKey(todayKey, -6);

  return Array.from({ length: 7 }, (_, index) => {
    const dateKey = shiftDateKey(startKey, index);
    const date = dateFromKey(dateKey);
    const count = dayCounts.get(dateKey) || 0;

    return {
      dateKey,
      label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date).slice(0, 1),
      count,
      active: count > 0,
      isToday: dateKey === todayKey
    };
  });
}

export function calculateStudentStreak(submissions, baseDate = new Date()) {
  const dayCounts = getSubmissionDayCounts(submissions);
  const todayKey = getLocalDateKey(baseDate);
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const hasSubmittedToday = dayCounts.has(todayKey);
  const hasSubmittedYesterday = dayCounts.has(yesterdayKey);

  let currentStreak = 0;
  let status = "not_started";
  let note = "Submit your first speaking or writing task to start your streak.";

  if (hasSubmittedToday) {
    currentStreak = countConsecutiveDays(dayCounts, todayKey);
    status = "completed_today";
    note = "You showed up today. Come back tomorrow to continue your streak.";
  } else if (hasSubmittedYesterday) {
    currentStreak = countConsecutiveDays(dayCounts, yesterdayKey);
    status = "alive_yesterday";
    note = "Submit today to protect your streak.";
  } else if ((submissions || []).length > 0) {
    status = "needs_today";
    note = "Submit one speaking or writing task today to start a new streak.";
  }

  return {
    currentStreak,
    bestStreak: calculateBestStreak(submissions),
    hasSubmittedToday,
    hasSubmittedYesterday,
    status,
    note,
    recentDays: getRecentSevenDays(dayCounts, baseDate)
  };
}

function pickNextAssignedTask(tasks, baseDate = new Date()) {
  const todayKey = getLocalDateKey(baseDate);
  const activeTasks = (tasks || []).filter((task) => ["assigned", "in_progress"].includes(task.status));
  const dueToday = activeTasks.find((task) => task.due_date === todayKey);

  if (dueToday) {
    return dueToday;
  }

  return [...activeTasks].sort((a, b) => {
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
  })[0] || null;
}

export function getTodayHabitStatus({ submissions, tasks, baseDate = new Date() }) {
  const todayKey = getLocalDateKey(baseDate);
  const tasksById = new Map((tasks || []).map((task) => [task.id, task]));
  const todaySubmissions = (submissions || [])
    .filter((submission) => submission.submitted_at && getLocalDateKey(submission.submitted_at) === todayKey)
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  const latestSubmission = todaySubmissions[0] || null;
  const latestTask = latestSubmission ? tasksById.get(latestSubmission.assigned_task_id) || null : null;
  const latestSubmissionLabel = latestSubmission?.sourceLabel
    ? `A ${latestSubmission.sourceLabel.toLowerCase()} task`
    : "A speaking task";
  const nextTask = pickNextAssignedTask(tasks, baseDate);

  return {
    isComplete: Boolean(latestSubmission),
    latestSubmission,
    latestTask,
    nextTask,
    title: latestSubmission ? "Completed today" : "Not completed yet",
    message: latestSubmission
      ? `${latestTask?.title || latestSubmission.taskTitle || latestSubmissionLabel} was submitted today. That is how confidence is built.`
      : nextTask
        ? `${nextTask.title} is ready when you are.`
        : "Your teacher has not assigned a practice task yet."
  };
}

export async function getStudentSubmissionsForHabit(studentId) {
  try {
    const client = requireSupabaseClient();
    const [
      { data: speakingTasks, error: speakingTasksError },
      { data: speakingSubmissions, error: speakingSubmissionsError },
      { data: writingTasks, error: writingTasksError },
      { data: writingSubmissions, error: writingSubmissionsError }
    ] = await Promise.all([
      client
        .from("assigned_tasks")
        .select(assignedTaskColumns)
        .eq("student_id", studentId),
      client
        .from("submissions")
        .select(submissionColumns)
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false }),
      client
        .from("writing_tasks")
        .select(writingTaskColumns)
        .eq("student_id", studentId),
      client
        .from("writing_submissions")
        .select(writingSubmissionColumns)
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })
    ]);

    const error = speakingTasksError || speakingSubmissionsError || writingTasksError || writingSubmissionsError;

    return {
      submissions: combineOutputSubmissions({
        speakingSubmissions: speakingSubmissions || [],
        writingSubmissions: writingSubmissions || [],
        speakingTasks: speakingTasks || [],
        writingTasks: writingTasks || []
      }),
      error: normalizeError(error)
    };
  } catch (error) {
    return {
      submissions: [],
      error: normalizeError(error)
    };
  }
}
