import { requireSupabaseClient } from "./supabaseClient.js";
import { isAdminLike } from "./rolePermissions.js";

const EVENT_TYPES = [
  "app_opened",
  "task_viewed",
  "recording_started",
  "task_submitted",
  "feedback_viewed"
];

const periodOptions = {
  today: "Today",
  this_week: "This week",
  last_7_days: "Last 7 days"
};

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getPeriodStart(period) {
  const now = new Date();

  if (period === "today") {
    return startOfLocalDay(now);
  }

  if (period === "last_7_days") {
    const start = startOfLocalDay(now);
    start.setDate(start.getDate() - 6);
    return start;
  }

  const start = startOfLocalDay(now);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

function getDateValue(value) {
  return value ? new Date(value).getTime() : 0;
}

function byNewest(a, b, field) {
  return getDateValue(b[field]) - getDateValue(a[field]);
}

function formatName(profile) {
  return profile?.full_name || "Unnamed student";
}

function normalizeError(error) {
  const message = error?.message || "";

  if (message.includes("student_activity_events")) {
    return "Drop-off analytics is not ready yet. Run supabase/migrations/0035_student_activity_events.sql, then try again.";
  }

  if (message.includes("permission denied")) {
    return "Could not load analytics because a read policy blocked one of the required tables. Check the related RLS migration before testing again.";
  }

  return "Could not load drop-off analytics. Please try again.";
}

async function getVisibleStudents(client, profile) {
  if (profile?.role === "teacher") {
    const { data: links, error: linksError } = await client
      .from("teacher_students")
      .select("student_id")
      .eq("teacher_id", profile.id)
      .eq("active", true);

    if (linksError) {
      throw linksError;
    }

    const studentIds = [...new Set((links || []).map((link) => link.student_id).filter(Boolean))];

    if (!studentIds.length) {
      return [];
    }

    const { data: students, error: studentsError } = await client
      .from("profiles")
      .select("id, full_name, role, status")
      .eq("role", "student")
      .in("id", studentIds);

    if (studentsError) {
      throw studentsError;
    }

    return students || [];
  }

  const { data: students, error } = await client
    .from("profiles")
    .select("id, full_name, role, status")
    .eq("role", "student")
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return students || [];
}

async function fetchByStudents(client, table, columns, studentIds, options = {}) {
  if (!studentIds.length) {
    return [];
  }

  let query = client.from(table).select(columns).in("student_id", studentIds);

  if (options.gteField && options.gteValue) {
    query = query.gte(options.gteField, options.gteValue);
  }

  if (options.orderField) {
    query = query.order(options.orderField, { ascending: Boolean(options.ascending) });
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

function groupByStudent(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const existing = map.get(row.student_id) || [];
    existing.push(row);
    map.set(row.student_id, existing);
  });

  return map;
}

function latestBy(rows, field) {
  return [...(rows || [])].sort((a, b) => byNewest(a, b, field))[0] || null;
}

function hasEvent(rows, eventType, matcher = () => true) {
  return (rows || []).some((event) => event.event_type === eventType && matcher(event));
}

function getEvents(rows, eventType) {
  return (rows || []).filter((event) => event.event_type === eventType);
}

function hasSubmissionAfter(submissions, taskId, timestamp) {
  return (submissions || []).some((submission) => {
    if (taskId && submission.assigned_task_id !== taskId) {
      return false;
    }

    return getDateValue(submission.submitted_at || submission.created_at) >= getDateValue(timestamp);
  });
}

function isOlderThanDays(value, days) {
  if (!value) {
    return true;
  }

  const ageMs = Date.now() - new Date(value).getTime();
  return ageMs > days * 24 * 60 * 60 * 1000;
}

function toRecentEvents(events) {
  return [...(events || [])]
    .sort((a, b) => byNewest(a, b, "created_at"))
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      type: event.event_type,
      taskId: event.task_id || null,
      submissionId: event.submission_id || null,
      createdAt: event.created_at
    }));
}

function buildStudentInsight({ student, tasks, submissions, feedback, events, periodEvents, periodSubmissions }) {
  const latestTask = latestBy(tasks, "created_at");
  const latestSubmission = latestBy(submissions, "submitted_at");
  const latestTaskSubmission = latestTask
    ? latestBy(submissions.filter((submission) => submission.assigned_task_id === latestTask.id), "submitted_at")
    : null;
  const focusSubmission = latestTaskSubmission || latestSubmission;
  const focusFeedback = focusSubmission
    ? feedback.find((item) => item.submission_id === focusSubmission.id)
    : null;
  const latestAppOpen = latestBy(
    events.filter((event) => event.event_type === "app_opened"),
    "created_at"
  );
  const latestTaskView = latestBy(getEvents(events, "task_viewed"), "created_at");
  const latestRecordingStart = latestBy(getEvents(events, "recording_started"), "created_at");
  const latestFeedbackView = latestBy(getEvents(events, "feedback_viewed"), "created_at");
  const taskViewed = latestTask
    ? hasEvent(events, "task_viewed", (event) => event.task_id === latestTask.id)
    : false;
  const recordingStarted = latestTask
    ? hasEvent(events, "recording_started", (event) => event.task_id === latestTask.id)
    : false;
  const periodAppOpened = hasEvent(periodEvents, "app_opened");
  const periodTaskViewed = hasEvent(periodEvents, "task_viewed");
  const periodRecordingStarted = hasEvent(periodEvents, "recording_started");
  const periodSubmitted = periodSubmissions.length > 0 || hasEvent(periodEvents, "task_submitted");
  const periodFeedbackViewed = hasEvent(periodEvents, "feedback_viewed");
  const startedNoSubmit = getEvents(periodEvents, "recording_started").some((event) =>
    !hasSubmissionAfter(submissions, event.task_id, event.created_at)
  );
  const submitted = Boolean(focusSubmission);
  const feedbackReadyNotViewed = feedback.some(
    (item) => !hasEvent(events, "feedback_viewed", (event) => event.submission_id === item.submission_id)
  );
  const feedbackViewed = focusSubmission
    ? hasEvent(events, "feedback_viewed", (event) => event.submission_id === focusSubmission.id)
    : false;
  const noActivityInPeriod =
    periodEvents.length === 0 &&
    periodSubmissions.length === 0;

  let status = "Active";
  let reminderInsight = "No reminder needed right now.";

  if (!latestTask) {
    status = "No task assigned";
    reminderInsight = "Assign a task before sending practice nudges.";
  } else if (feedbackReadyNotViewed) {
    status = "Feedback not viewed";
    reminderInsight = "Feedback is ready, but the student has not opened it yet.";
  } else if (startedNoSubmit) {
    status = "Started no submit";
    reminderInsight = "They started recording but did not submit.";
  } else if (submitted && !focusFeedback) {
    status = "Waiting for feedback";
    reminderInsight = "Teacher review is the next useful action.";
  } else if (noActivityInPeriod || isOlderThanDays(latestAppOpen?.created_at, 7)) {
    status = "Inactive";
    reminderInsight = "No recent student activity was found for this period.";
  } else if (!periodTaskViewed && latestTask?.status === "assigned") {
    status = "Needs nudge";
    reminderInsight = "The student has not opened a task in this period.";
  } else if (periodTaskViewed && !periodRecordingStarted && !periodSubmitted) {
    status = "Slipping";
    reminderInsight = "They viewed a task but have not started recording.";
  }

  return {
    studentId: student.id,
    studentName: formatName(student),
    studentStatus: student.status || "",
    riskStatus: status,
    latestTaskTitle: latestTask?.title || "No assigned task",
    latestTaskStatus: latestTask?.status || "",
    latestTaskDueDate: latestTask?.due_date || "",
    lastAppOpenAt: latestAppOpen?.created_at || "",
    lastTaskViewedAt: latestTaskView?.created_at || "",
    lastRecordingStartedAt: latestRecordingStart?.created_at || "",
    lastSubmittedAt: latestSubmission?.submitted_at || "",
    lastFeedbackViewedAt: latestFeedbackView?.created_at || "",
    taskViewed,
    recordingStarted,
    submitted,
    feedbackReady: Boolean(focusFeedback) || feedbackReadyNotViewed,
    feedbackViewed,
    periodAppOpened,
    periodTaskViewed,
    periodRecordingStarted,
    periodSubmitted,
    periodFeedbackViewed,
    startedNoSubmit,
    feedbackReadyNotViewed,
    noActivityInPeriod,
    reminderInsight,
    recentEvents: toRecentEvents(events),
    counts: {
      tasks: tasks.length,
      submissions: submissions.length,
      feedback: feedback.length,
      events: events.length,
      periodEvents: periodEvents.length,
      periodSubmissions: periodSubmissions.length
    }
  };
}

function toFunnelStudents(students, predicate) {
  return students
    .filter(predicate)
    .map((student) => ({
      studentId: student.studentId,
      studentName: student.studentName,
      riskStatus: student.riskStatus,
      latestTaskTitle: student.latestTaskTitle,
      reminderInsight: student.reminderInsight
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

function buildFunnel(studentInsights) {
  const stages = [
    {
      key: "app_opened",
      label: "Opened app",
      description: "Students who opened the app in the selected period.",
      students: toFunnelStudents(studentInsights, (student) => student.periodAppOpened)
    },
    {
      key: "task_viewed",
      label: "Viewed task",
      description: "Students who opened a task or task detail.",
      students: toFunnelStudents(studentInsights, (student) => student.periodTaskViewed)
    },
    {
      key: "recording_started",
      label: "Started recording",
      description: "Students who pressed record.",
      students: toFunnelStudents(studentInsights, (student) => student.periodRecordingStarted)
    },
    {
      key: "started_no_submit",
      label: "Started, no submit",
      description: "Students who began recording but have not submitted that recording.",
      students: toFunnelStudents(studentInsights, (student) => student.startedNoSubmit)
    },
    {
      key: "task_submitted",
      label: "Submitted",
      description: "Students with at least one real submission in the selected period.",
      students: toFunnelStudents(studentInsights, (student) => student.periodSubmitted)
    },
    {
      key: "feedback_ready_not_viewed",
      label: "Feedback not viewed",
      description: "Students with teacher feedback ready but not opened yet.",
      students: toFunnelStudents(studentInsights, (student) => student.feedbackReadyNotViewed)
    },
    {
      key: "no_activity",
      label: "No activity",
      description: "Students with no tracked activity or submissions in this period.",
      students: toFunnelStudents(studentInsights, (student) => student.noActivityInPeriod)
    }
  ];

  return stages.map((stage) => ({
    ...stage,
    count: stage.students.length
  }));
}

export async function getDropOffAnalyticsOverview({ profile, period = "this_week" }) {
  if (!profile?.id || (!isAdminLike(profile) && profile.role !== "teacher")) {
    return {
      overview: null,
      error: "Drop-off analytics is available for teacher and admin accounts."
    };
  }

  try {
    const client = requireSupabaseClient();
    const periodStart = getPeriodStart(period);
    const periodStartIso = periodStart.toISOString();
    const recentStart = new Date();
    recentStart.setDate(recentStart.getDate() - 30);

    const students = await getVisibleStudents(client, profile);
    const studentIds = students.map((student) => student.id);

    const [tasks, submissions, feedback, events] = await Promise.all([
      fetchByStudents(
        client,
        "assigned_tasks",
        "id, student_id, teacher_id, title, status, due_date, created_at, updated_at",
        studentIds,
        { orderField: "created_at" }
      ),
      fetchByStudents(
        client,
        "submissions",
        "id, assigned_task_id, student_id, status, submitted_at, created_at",
        studentIds,
        { orderField: "submitted_at" }
      ),
      fetchByStudents(
        client,
        "feedback",
        "id, submission_id, assigned_task_id, student_id, created_at",
        studentIds,
        { orderField: "created_at" }
      ),
      fetchByStudents(
        client,
        "student_activity_events",
        "id, student_id, teacher_id, task_id, submission_id, event_type, created_at",
        studentIds,
        { gteField: "created_at", gteValue: recentStart.toISOString(), orderField: "created_at" }
      )
    ]);

    const tasksByStudent = groupByStudent(tasks);
    const submissionsByStudent = groupByStudent(submissions);
    const feedbackByStudent = groupByStudent(feedback);
    const eventsByStudent = groupByStudent(events);
    const periodEvents = events.filter((event) => new Date(event.created_at) >= periodStart);
    const periodEventsByStudent = groupByStudent(periodEvents);
    const periodSubmissionsByStudent = groupByStudent(
      submissions.filter((submission) => new Date(submission.submitted_at || submission.created_at) >= periodStart)
    );
    const studentInsights = students
      .map((student) =>
        buildStudentInsight({
          student,
          tasks: tasksByStudent.get(student.id) || [],
          submissions: submissionsByStudent.get(student.id) || [],
          feedback: feedbackByStudent.get(student.id) || [],
          events: eventsByStudent.get(student.id) || [],
          periodEvents: periodEventsByStudent.get(student.id) || [],
          periodSubmissions: periodSubmissionsByStudent.get(student.id) || []
        })
      )
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    const statuses = studentInsights.reduce((acc, item) => {
      acc[item.riskStatus] = (acc[item.riskStatus] || 0) + 1;
      return acc;
    }, {});
    const funnel = buildFunnel(studentInsights);
    const needsAttentionStatuses = ["Needs nudge", "Slipping", "Started no submit", "Inactive", "Feedback not viewed"];

    return {
      overview: {
        period,
        periodLabel: periodOptions[period] || periodOptions.this_week,
        periodStartIso,
        summary: {
          totalStudents: students.length,
          active: statuses.Active || 0,
          needsAttention: needsAttentionStatuses.reduce((total, status) => total + (statuses[status] || 0), 0),
          waitingForFeedback: statuses["Waiting for feedback"] || 0,
          feedbackNotViewed: statuses["Feedback not viewed"] || 0,
          noTaskAssigned: statuses["No task assigned"] || 0,
          startedNoSubmit: statuses["Started no submit"] || 0,
          noActivity: funnel.find((stage) => stage.key === "no_activity")?.count || 0
        },
        funnel,
        statuses,
        statusOptions: [
          "All",
          "Active",
          "Needs nudge",
          "Slipping",
          "Started no submit",
          "Inactive",
          "Waiting for feedback",
          "Feedback not viewed",
          "No task assigned"
        ],
        students: studentInsights,
        eventTypes: EVENT_TYPES
      },
      error: null
    };
  } catch (error) {
    return {
      overview: null,
      error: normalizeError(error)
    };
  }
}
