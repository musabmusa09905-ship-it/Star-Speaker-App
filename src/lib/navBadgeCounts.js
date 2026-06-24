import { requireSupabaseClient } from "./supabaseClient.js";
import { getIstanbulTodayRange } from "./dailyReminders.js";

const emptyCounts = {
  practice: 0,
  record: 0,
  writing: 0,
  review: 0,
  writingReview: 0,
  dailyReminders: 0,
  tasks: 0
};

function countOrZero(result) {
  return result?.error ? 0 : result?.count || 0;
}

async function getAssignedStudentIds(client, teacherId) {
  const { data, error } = await client
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherId)
    .eq("active", true);

  if (error) {
    return [];
  }

  return [...new Set((data || []).map((row) => row.student_id).filter(Boolean))];
}

async function getActiveStudentIds(client, profile) {
  if (profile?.role === "teacher") {
    return getAssignedStudentIds(client, profile.id);
  }

  if (profile?.role !== "admin") {
    return [];
  }

  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("role", "student")
    .eq("status", "active");

  if (error) {
    return [];
  }

  return [...new Set((data || []).map((row) => row.id).filter(Boolean))];
}

async function countStudentOpenSpeakingTasks(client, studentId) {
  const result = await client
    .from("assigned_tasks")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .in("status", ["assigned", "in_progress"]);

  return countOrZero(result);
}

async function countStudentOpenWritingTasks(client, studentId) {
  const result = await client
    .from("writing_tasks")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "assigned");

  return countOrZero(result);
}

async function countSubmittedRows(client, tableName, studentIds = []) {
  let query = client
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");

  if (studentIds.length) {
    query = query.in("student_id", studentIds);
  }

  const result = await query;
  return countOrZero(result);
}

async function countTeacherActiveTasks(client, profile, studentIds = []) {
  let query = client
    .from("assigned_tasks")
    .select("id", { count: "exact", head: true })
    .in("status", ["assigned", "in_progress"]);

  if (profile?.role === "teacher") {
    query = query.eq("teacher_id", profile.id);
  }

  if (studentIds.length) {
    query = query.in("student_id", studentIds);
  }

  const result = await query;
  return countOrZero(result);
}

async function countStudentsNeedingReminderToday(client, studentIds = []) {
  if (!studentIds.length) {
    return 0;
  }

  const range = getIstanbulTodayRange();
  const [
    { data: speakingRows, error: speakingError },
    { data: writingRows, error: writingError },
    { data: reminderRows, error: reminderError }
  ] = await Promise.all([
    client
      .from("submissions")
      .select("student_id")
      .in("student_id", studentIds)
      .in("status", ["submitted", "reviewed"])
      .gte("submitted_at", range.startIso)
      .lt("submitted_at", range.endIso),
    client
      .from("writing_submissions")
      .select("student_id")
      .in("student_id", studentIds)
      .in("status", ["submitted", "reviewed"])
      .gte("submitted_at", range.startIso)
      .lt("submitted_at", range.endIso),
    client
      .from("reminder_logs")
      .select("student_id, reminder_type, reminder_slot")
      .in("student_id", studentIds)
      .eq("reminder_date", range.todayKey)
  ]);

  if (speakingError || writingError) {
    return 0;
  }

  const completedIds = new Set([
    ...(speakingRows || []).map((row) => row.student_id),
    ...(writingRows || []).map((row) => row.student_id)
  ]);
  const handledMissingReminderIds = new Set(
    reminderError
      ? []
      : (reminderRows || [])
          .filter((row) =>
            ["missing_task", "missed_daily_practice"].includes(row.reminder_type) ||
            ["afternoon_missing", "evening_missing", "whatsapp_daily", "whatsapp_missing", "manual_missing"].includes(row.reminder_slot)
          )
          .map((row) => row.student_id)
  );

  return studentIds.filter((studentId) => !completedIds.has(studentId) && !handledMissingReminderIds.has(studentId)).length;
}

export async function getNavBadgeCounts(profile) {
  try {
    const client = requireSupabaseClient();

    if (profile?.role === "student") {
      const [practice, writing] = await Promise.all([
        countStudentOpenSpeakingTasks(client, profile.id),
        countStudentOpenWritingTasks(client, profile.id)
      ]);

      return {
        counts: {
          ...emptyCounts,
          practice,
          record: practice,
          writing
        },
        error: null
      };
    }

    if (!["teacher", "admin"].includes(profile?.role)) {
      return {
        counts: emptyCounts,
        error: null
      };
    }

    const studentIds = await getActiveStudentIds(client, profile);
    const [review, writingReview, dailyReminders, tasks] = await Promise.all([
      profile.role === "teacher" && !studentIds.length
        ? 0
        : countSubmittedRows(client, "submissions", profile.role === "teacher" ? studentIds : []),
      profile.role === "teacher" && !studentIds.length
        ? 0
        : countSubmittedRows(client, "writing_submissions", profile.role === "teacher" ? studentIds : []),
      countStudentsNeedingReminderToday(client, studentIds),
      countTeacherActiveTasks(client, profile, profile.role === "teacher" ? studentIds : [])
    ]);

    return {
      counts: {
        ...emptyCounts,
        review,
        writingReview,
        dailyReminders,
        tasks
      },
      error: null
    };
  } catch (error) {
    return {
      counts: emptyCounts,
      error: error?.message || "Could not load navigation badge counts."
    };
  }
}
