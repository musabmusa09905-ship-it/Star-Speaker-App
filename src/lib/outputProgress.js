export const OUTPUT_POINT_VALUES = {
  submission: 10,
  reflection: 3,
  onTime: 5
};

function getDateKey(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function isValidSubmittedStatus(status) {
  return ["submitted", "reviewed"].includes(status || "submitted");
}

function isOnTime(submittedAt, dueDate) {
  if (!submittedAt || !dueDate) {
    return false;
  }

  const submittedDate = getDateKey(submittedAt);
  return Boolean(submittedDate && submittedDate <= dueDate);
}

function normalizeText(value) {
  return value?.trim() || "";
}

export function normalizeSpeakingOutputSubmissions(submissions = [], tasks = []) {
  const tasksById = new Map((tasks || []).map((task) => [task.id, task]));

  return (submissions || [])
    .filter((submission) => submission?.submitted_at && isValidSubmittedStatus(submission.status))
    .map((submission) => {
      const task = tasksById.get(submission.assigned_task_id) || null;
      return {
        ...submission,
        id: `speaking:${submission.id}`,
        sourceId: submission.id,
        source: "speaking",
        sourceLabel: "Speaking",
        taskId: submission.assigned_task_id,
        taskTitle: task?.title || "Speaking task",
        dueDate: task?.due_date || null,
        reflectionText: normalizeText(submission.reflection_text),
        submittedDay: getDateKey(submission.submitted_at),
        onTime: isOnTime(submission.submitted_at, task?.due_date),
        points:
          OUTPUT_POINT_VALUES.submission +
          (normalizeText(submission.reflection_text) ? OUTPUT_POINT_VALUES.reflection : 0) +
          (isOnTime(submission.submitted_at, task?.due_date) ? OUTPUT_POINT_VALUES.onTime : 0)
      };
    });
}

export function normalizeWritingOutputSubmissions(submissions = [], tasks = []) {
  const tasksById = new Map((tasks || []).map((task) => [task.id, task]));

  return (submissions || [])
    .filter((submission) => submission?.submitted_at && isValidSubmittedStatus(submission.status))
    .map((submission) => {
      const task = tasksById.get(submission.task_id) || null;
      return {
        ...submission,
        id: `writing:${submission.id}`,
        sourceId: submission.id,
        source: "writing",
        sourceLabel: "Writing",
        taskId: submission.task_id,
        taskTitle: task?.title || "Writing task",
        dueDate: task?.due_date || null,
        reflection_text: submission.self_reflection || "",
        reflectionText: normalizeText(submission.self_reflection),
        submittedDay: getDateKey(submission.submitted_at),
        onTime: isOnTime(submission.submitted_at, task?.due_date),
        points:
          OUTPUT_POINT_VALUES.submission +
          (normalizeText(submission.self_reflection) ? OUTPUT_POINT_VALUES.reflection : 0) +
          (isOnTime(submission.submitted_at, task?.due_date) ? OUTPUT_POINT_VALUES.onTime : 0)
      };
    });
}

export function combineOutputSubmissions({
  speakingSubmissions = [],
  writingSubmissions = [],
  speakingTasks = [],
  writingTasks = []
} = {}) {
  return [
    ...normalizeSpeakingOutputSubmissions(speakingSubmissions, speakingTasks),
    ...normalizeWritingOutputSubmissions(writingSubmissions, writingTasks)
  ].sort((a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime());
}

export function calculateOutputPoints(outputSubmissions = []) {
  return (outputSubmissions || []).reduce((total, submission) => total + (Number(submission.points) || 0), 0);
}
