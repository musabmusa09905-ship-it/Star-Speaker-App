import { requireSupabaseClient } from "./supabaseClient.js";
import {
  generateReminderPreview,
  getTeacherReminderVoice
} from "./teacherReminderVoice.js";
import {
  buildWhatsAppLink,
  getWhatsAppContactState,
  normalizeWhatsAppNumber
} from "./whatsappReminders.js";
import { getStudentMotivationProfilesForStudents } from "./studentMotivationProfiles.js";

const ISTANBUL_TIME_ZONE = "Europe/Istanbul";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

const profileColumns = [
  "id",
  "full_name",
  "email",
  "whatsapp_number",
  "whatsapp_opt_in",
  "status"
].join(", ");

const assignedTaskColumns = [
  "id",
  "student_id",
  "title",
  "task_type",
  "due_date",
  "status",
  "created_at"
].join(", ");

const submissionColumns = [
  "id",
  "assigned_task_id",
  "student_id",
  "status",
  "submitted_at",
  "created_at"
].join(", ");

const writingTaskColumns = [
  "id",
  "student_id",
  "title",
  "due_date",
  "status",
  "created_at"
].join(", ");

const writingSubmissionColumns = [
  "id",
  "task_id",
  "student_id",
  "status",
  "submitted_at",
  "created_at"
].join(", ");

const reminderLogColumns = [
  "id",
  "student_id",
  "teacher_id",
  "reminder_date",
  "reminder_type",
  "reminder_slot",
  "channel",
  "status",
  "message_preview",
  "sent_at",
  "created_at",
  "updated_at"
].join(", ");

const legacyReminderLogColumns = [
  "id",
  "student_id",
  "reminder_date",
  "reminder_type",
  "channel",
  "status",
  "created_at",
  "updated_at"
].join(", ");

function normalizeError(error, fallback = "Could not load daily reminders. Please try again.") {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return fallback;
  }

  if (message.toLowerCase().includes("does not exist")) {
    return "Daily reminders need the latest database migration before this page can be used.";
  }

  if (message.toLowerCase().includes("permission denied")) {
    return "Daily reminders could not read the required rows. Please check the dashboard policies.";
  }

  return message;
}

function isSchemaMismatch(error) {
  const message = (error?.message || String(error || "")).toLowerCase();
  return (
    message.includes("reminder_slot") ||
    message.includes("teacher_id") ||
    message.includes("message_preview") ||
    message.includes("sent_at") ||
    message.includes("metadata")
  );
}

export function getIstanbulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getIstanbulTodayRange(date = new Date()) {
  const todayKey = getIstanbulDateKey(date);
  const start = new Date(`${todayKey}T00:00:00+03:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    todayKey,
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

function getFirstName(student) {
  const fullName = student?.full_name?.trim();

  if (fullName) {
    return fullName.split(/\s+/)[0];
  }

  const emailName = student?.email?.split("@")?.[0]?.trim();
  return emailName || "there";
}

function mapByStudentId(rows) {
  return (rows || []).reduce((map, row) => {
    const list = map.get(row.student_id) || [];
    list.push(row);
    map.set(row.student_id, list);
    return map;
  }, new Map());
}

function firstByLatestDate(rows, fieldName = "submitted_at") {
  return [...(rows || [])].sort((a, b) => {
    const aTime = new Date(a[fieldName] || a.created_at || 0).getTime();
    const bTime = new Date(b[fieldName] || b.created_at || 0).getTime();
    return bTime - aTime;
  })[0] || null;
}

function formatCompletionType({ speakingSubmission, writingSubmission }) {
  if (speakingSubmission && writingSubmission) {
    return "Speaking + Writing";
  }

  if (speakingSubmission) {
    return "Speaking";
  }

  if (writingSubmission) {
    return "Writing";
  }

  return "Not completed";
}

function isDueTodayOrOpen(task, todayKey) {
  return !task?.due_date || task.due_date === todayKey;
}

function getMissingStatus({ speakingTasks, writingTasks }) {
  const hasSpeakingTask = speakingTasks.length > 0;
  const hasWritingTask = writingTasks.length > 0;

  if (hasSpeakingTask && hasWritingTask) {
    return "Both missing";
  }

  if (hasSpeakingTask) {
    return "Speaking missing";
  }

  if (hasWritingTask) {
    return "Writing missing";
  }

  return "No speaking or writing submitted today";
}

function normalizeReminderLog(row) {
  const slot = row.reminder_slot ||
    (row.reminder_type === "completed_encouragement"
      ? "completed_encouragement"
      : "afternoon_missing");

  return {
    ...row,
    teacher_id: row.teacher_id || null,
    reminder_slot: slot,
    sent_at: row.sent_at || null,
    message_preview: row.message_preview || ""
  };
}

function isMissingReminderLog(log) {
  return (
    ["afternoon_missing", "evening_missing", "whatsapp_daily", "whatsapp_missing", "manual_missing"].includes(log.reminder_slot) ||
    ["missing_task", "missed_daily_practice"].includes(log.reminder_type)
  );
}

function isCompletedEncouragementLog(log) {
  return ["completed_encouragement", "manual_completed"].includes(log.reminder_slot) ||
    log.reminder_type === "completed_encouragement";
}

function buildPreviewSet({ teacherVoice, student, studentMotivationProfile, taskStatus }) {
  const studentName = getFirstName(student);

  return {
    emailReminder: generateReminderPreview({
      teacherVoice,
      studentMotivationProfile,
      studentName,
      messageType: "afternoon_missing",
      taskStatus
    }),
    whatsappReminder: generateReminderPreview({
      teacherVoice,
      studentMotivationProfile,
      studentName,
      messageType: "whatsapp_missing",
      taskStatus
    }),
    encouragement: generateReminderPreview({
      teacherVoice,
      studentMotivationProfile,
      studentName,
      messageType: "completed_encouragement",
      taskStatus
    })
  };
}

async function getVisibleStudents(client, profile) {
  if (profile?.role === "admin") {
    const { data, error } = await client
      .from("profiles")
      .select(profileColumns)
      .eq("role", "student")
      .eq("status", "active")
      .order("full_name", { ascending: true, nullsFirst: false });

    return {
      students: data || [],
      error: normalizeError(error, "Could not load active student profiles.")
    };
  }

  if (profile?.role !== "teacher") {
    return {
      students: [],
      error: null
    };
  }

  const { data: assignments, error: assignmentsError } = await client
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", profile.id)
    .eq("active", true);

  if (assignmentsError) {
    return {
      students: [],
      error: normalizeError(assignmentsError, "Could not load assigned students.")
    };
  }

  const studentIds = [...new Set((assignments || []).map((item) => item.student_id))];

  if (!studentIds.length) {
    return {
      students: [],
      error: null
    };
  }

  const { data, error } = await client
    .from("profiles")
    .select(profileColumns)
    .in("id", studentIds)
    .eq("role", "student")
    .eq("status", "active")
    .order("full_name", { ascending: true, nullsFirst: false });

  return {
    students: data || [],
    error: normalizeError(error, "Could not load assigned student profiles.")
  };
}

async function getReminderLogs(client, studentIds, todayKey) {
  if (!studentIds.length) {
    return {
      logs: [],
      migrationRequired: false,
      error: null
    };
  }

  const { data, error } = await client
    .from("reminder_logs")
    .select(reminderLogColumns)
    .in("student_id", studentIds)
    .eq("reminder_date", todayKey);

  if (!error) {
    return {
      logs: (data || []).map(normalizeReminderLog),
      migrationRequired: false,
      error: null
    };
  }

  if (!isSchemaMismatch(error)) {
    return {
      logs: [],
      migrationRequired: false,
      error: normalizeError(error, "Could not load reminder log status.")
    };
  }

  const legacyResult = await client
    .from("reminder_logs")
    .select(legacyReminderLogColumns)
    .in("student_id", studentIds)
    .eq("reminder_date", todayKey);

  if (legacyResult.error) {
    return {
      logs: [],
      migrationRequired: true,
      error: normalizeError(legacyResult.error, "Could not load reminder log status.")
    };
  }

  return {
    logs: (legacyResult.data || []).map(normalizeReminderLog),
    migrationRequired: true,
    error: null
  };
}

export async function getDailyReminderDashboard(profile) {
  try {
    const client = requireSupabaseClient();

    if (!["teacher", "admin"].includes(profile?.role)) {
      return {
        dashboard: null,
        error: null
      };
    }

    const range = getIstanbulTodayRange();
    const studentsResult = await getVisibleStudents(client, profile);

    if (studentsResult.error) {
      return {
        dashboard: null,
        error: studentsResult.error
      };
    }

    const students = studentsResult.students;
    const studentIds = students.map((student) => student.id);
    const voiceResult = await getTeacherReminderVoice(profile.id, profile);

    if (!studentIds.length) {
      return {
        dashboard: {
          todayKey: range.todayKey,
          students: [],
          needsReminder: [],
          completedToday: [],
          stats: {
            totalActiveStudents: 0,
            completedToday: 0,
            needsReminder: 0,
            alreadyMessagedToday: 0,
            completionPercentage: 0
          },
          hasReminderVoice: Boolean(voiceResult.voice?.id),
          reminderLogsMigrationRequired: false,
          voiceError: voiceResult.error || null
        },
        error: null
      };
    }

    const [
      { data: speakingSubmissions, error: speakingSubmissionsError },
      { data: writingSubmissions, error: writingSubmissionsError },
      { data: speakingTasks, error: speakingTasksError },
      { data: writingTasks, error: writingTasksError },
      reminderLogsResult,
      motivationProfilesResult
    ] = await Promise.all([
      client
        .from("submissions")
        .select(submissionColumns)
        .in("student_id", studentIds)
        .in("status", ["submitted", "reviewed"])
        .gte("submitted_at", range.startIso)
        .lt("submitted_at", range.endIso)
        .order("submitted_at", { ascending: false }),
      client
        .from("writing_submissions")
        .select(writingSubmissionColumns)
        .in("student_id", studentIds)
        .in("status", ["submitted", "reviewed"])
        .gte("submitted_at", range.startIso)
        .lt("submitted_at", range.endIso)
        .order("submitted_at", { ascending: false }),
      client
        .from("assigned_tasks")
        .select(assignedTaskColumns)
        .in("student_id", studentIds)
        .in("status", ["assigned", "in_progress"])
        .order("created_at", { ascending: false }),
      client
        .from("writing_tasks")
        .select(writingTaskColumns)
        .in("student_id", studentIds)
        .eq("status", "assigned")
        .order("created_at", { ascending: false }),
      getReminderLogs(client, studentIds, range.todayKey),
      getStudentMotivationProfilesForStudents({
        profile,
        studentIds
      })
    ]);

    const firstError =
      speakingSubmissionsError ||
      writingSubmissionsError ||
      speakingTasksError ||
      writingTasksError ||
      reminderLogsResult.error;

    if (firstError) {
      return {
        dashboard: null,
        error: normalizeError(firstError)
      };
    }

    const speakingSubmissionsByStudent = mapByStudentId(speakingSubmissions || []);
    const writingSubmissionsByStudent = mapByStudentId(writingSubmissions || []);
    const speakingTasksByStudent = mapByStudentId(
      (speakingTasks || []).filter((task) => isDueTodayOrOpen(task, range.todayKey))
    );
    const writingTasksByStudent = mapByStudentId(
      (writingTasks || []).filter((task) => isDueTodayOrOpen(task, range.todayKey))
    );
    const logsByStudent = mapByStudentId(reminderLogsResult.logs || []);

    const studentRows = students.map((student) => {
      const studentSpeakingSubmissions = speakingSubmissionsByStudent.get(student.id) || [];
      const studentWritingSubmissions = writingSubmissionsByStudent.get(student.id) || [];
      const speakingSubmission = firstByLatestDate(studentSpeakingSubmissions);
      const writingSubmission = firstByLatestDate(studentWritingSubmissions);
      const completedToday = Boolean(speakingSubmission || writingSubmission);
      const completionTime = firstByLatestDate([speakingSubmission, writingSubmission].filter(Boolean))?.submitted_at || null;
      const logs = logsByStudent.get(student.id) || [];
      const missingLogs = logs.filter(isMissingReminderLog);
      const encouragementLogs = logs.filter(isCompletedEncouragementLog);
      const hasWhatsappReminderLog = missingLogs.some((log) => log.channel === "whatsapp");
      const hasWhatsappEncouragementLog = encouragementLogs.some((log) => log.channel === "whatsapp");
      const motivationProfile = motivationProfilesResult.profilesByStudentId.get(student.id) || null;
      const missingStatus = getMissingStatus({
        speakingTasks: speakingTasksByStudent.get(student.id) || [],
        writingTasks: writingTasksByStudent.get(student.id) || []
      });
      const previews = buildPreviewSet({
        teacherVoice: voiceResult.voice,
        student,
        studentMotivationProfile: motivationProfile,
        taskStatus: completedToday ? "completed" : missingStatus
      });
      const hasEmail = Boolean(student.email);
      const whatsappNumber = student.whatsapp_number || "";
      const normalizedWhatsappNumber = normalizeWhatsAppNumber(whatsappNumber);
      const whatsappContact = getWhatsAppContactState({
        phoneNumber: whatsappNumber,
        optIn: student.whatsapp_opt_in,
        status: student.status
      });
      const whatsappReminderLink = whatsappContact.canUse
        ? buildWhatsAppLink({
            phoneNumber: whatsappNumber,
            message: previews.whatsappReminder
          })
        : "";
      const whatsappEncouragementLink = whatsappContact.canUse
        ? buildWhatsAppLink({
            phoneNumber: whatsappNumber,
            message: previews.encouragement
          })
        : "";

      return {
        student,
        studentName: student.full_name || student.email || "Student",
        firstName: getFirstName(student),
        email: student.email || "",
        phone: whatsappNumber,
        whatsapp: {
          number: whatsappNumber,
          normalizedNumber: normalizedWhatsappNumber,
          optIn: Boolean(student.whatsapp_opt_in),
          canUse: whatsappContact.canUse,
          label: whatsappContact.label,
          tone: whatsappContact.tone,
          reminderLink: whatsappReminderLink,
          encouragementLink: whatsappEncouragementLink
        },
        hasEmail,
        hasPhone: whatsappContact.canUse,
        completedToday,
        completionType: formatCompletionType({ speakingSubmission, writingSubmission }),
        completionTime,
        speakingSubmission,
        writingSubmission,
        missingStatus,
        motivationProfile,
        motivationGoal: motivationProfile?.goal || "",
        isPersonalizedReminder: Boolean(motivationProfile?.id),
        motivationEditHref: profile.role === "admin" ? "/admin/users" : "/teacher/students",
        logs,
        alreadyMessagedToday: missingLogs.length > 0,
        hasEmailReminderLog: missingLogs.some((log) => log.channel === "email"),
        hasWhatsappReminderLog,
        hasManualReminderLog: missingLogs.some((log) => log.channel === "manual" || log.reminder_slot === "manual_missing"),
        alreadyEncouragedToday: encouragementLogs.length > 0,
        hasEncouragementLog: encouragementLogs.length > 0,
        hasWhatsappEncouragementLog,
        hasManualEncouragementLog: encouragementLogs.some((log) => log.channel === "manual" || log.reminder_slot === "manual_completed"),
        messageStatus: missingLogs.length
          ? getMissingReminderStatus(missingLogs)
          : hasEmail || whatsappContact.canUse
            ? "Ready"
            : "Missing contact info",
        encouragementStatus: getEncouragementStatus(encouragementLogs),
        whatsappReminderStatus: hasWhatsappReminderLog
          ? "WhatsApp opened today"
          : whatsappContact.label,
        whatsappEncouragementStatus: hasWhatsappEncouragementLog
          ? "WhatsApp encouragement opened today"
          : whatsappContact.label,
        previews
      };
    });

    const completedToday = studentRows.filter((row) => row.completedToday);
    const needsReminder = studentRows.filter((row) => !row.completedToday);
    const alreadyMessagedToday = studentRows.filter((row) =>
      row.alreadyMessagedToday || row.alreadyEncouragedToday
    ).length;

    return {
      dashboard: {
        todayKey: range.todayKey,
        students: studentRows,
        needsReminder,
        completedToday,
        stats: {
          totalActiveStudents: studentRows.length,
          completedToday: completedToday.length,
          needsReminder: needsReminder.filter((row) => !row.alreadyMessagedToday).length,
          alreadyMessagedToday,
          completionPercentage: studentRows.length
            ? Math.round((completedToday.length / studentRows.length) * 100)
            : 0
        },
        hasReminderVoice: Boolean(voiceResult.voice?.id),
        reminderLogsMigrationRequired: reminderLogsResult.migrationRequired,
        voiceError: voiceResult.error || null,
        motivationProfileError: motivationProfilesResult.error || null
      },
      error: null
    };
  } catch (error) {
    return {
      dashboard: null,
      error: normalizeError(error)
    };
  }
}

function slotToReminderType(slot) {
  return ["completed_encouragement", "manual_completed"].includes(slot)
    ? "completed_encouragement"
    : "missing_task";
}

function getMissingReminderStatus(logs) {
  if (logs.some((log) => log.channel === "whatsapp" && log.status === "opened")) {
    return "WhatsApp opened today";
  }

  return logs.length ? "Handled today" : "Ready";
}

function getEncouragementStatus(logs) {
  if (logs.some((log) => log.channel === "whatsapp" && log.status === "opened")) {
    return "WhatsApp encouragement opened today";
  }

  return logs.length ? "Handled today" : "Ready";
}

export async function markDailyReminderManually({
  profile,
  studentId,
  reminderSlot,
  channel,
  messagePreview,
  status = "manual_marked"
}) {
  try {
    const client = requireSupabaseClient();

    if (!["teacher", "admin"].includes(profile?.role)) {
      return {
        log: null,
        error: "Daily reminder logs are only available for teacher and admin accounts."
      };
    }

    if (!studentId || !reminderSlot || !channel) {
      return {
        log: null,
        error: "Choose a student, reminder type, and channel before marking this reminder."
      };
    }

    const todayKey = getIstanbulDateKey();
    const payload = {
      student_id: studentId,
      teacher_id: profile.role === "teacher" ? profile.id : null,
      reminder_date: todayKey,
      reminder_slot: reminderSlot,
      reminder_type: slotToReminderType(reminderSlot),
      channel,
      status,
      message_preview: messagePreview || null,
      sent_at: new Date().toISOString(),
      metadata: {
        source: "daily_reminders_dashboard",
        actor_id: profile.id,
        actor_role: profile.role
      }
    };

    const { data, error } = await client
      .from("reminder_logs")
      .insert(payload)
      .select(reminderLogColumns)
      .single();

    if (error) {
      const message = error.message || String(error);

      if (message.toLowerCase().includes("duplicate key")) {
        return {
          log: null,
          error: "This reminder has already been handled today."
        };
      }

      if (isSchemaMismatch(error)) {
        return {
          log: null,
          error: "Run supabase/migrations/0025_daily_reminder_dashboard.sql and 0026_bulk_reminders_nav_badges_writing_points.sql before manual reminder marks."
        };
      }

      if (message.toLowerCase().includes("check constraint")) {
        return {
          log: null,
          error: status === "opened"
            ? "Run supabase/migrations/0028_daily_whatsapp_opened_workflow.sql to enable WhatsApp opened reminder logs."
            : "Run supabase/migrations/0026_bulk_reminders_nav_badges_writing_points.sql to enable manual reminder slots."
        };
      }

      return {
        log: null,
        error: normalizeError(error, "Could not mark this reminder. Please try again.")
      };
    }

    return {
      log: normalizeReminderLog(data),
      error: null
    };
  } catch (error) {
    return {
      log: null,
      error: normalizeError(error, "Could not mark this reminder. Please try again.")
    };
  }
}

export async function markDailyReminderOpened({
  profile,
  studentId,
  reminderSlot,
  messagePreview
}) {
  return markDailyReminderManually({
    profile,
    studentId,
    reminderSlot,
    channel: "whatsapp",
    messagePreview,
    status: "opened"
  });
}

export async function markDailyRemindersManually({
  profile,
  entries = [],
  reminderSlot,
  channel = "manual"
}) {
  const summary = {
    total: entries.length,
    marked: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  if (!entries.length) {
    return {
      summary,
      error: "Select at least one student before marking reminders."
    };
  }

  for (const entry of entries) {
    const result = await markDailyReminderManually({
      profile,
      studentId: entry.studentId,
      reminderSlot,
      channel,
      messagePreview: entry.messagePreview
    });

    if (!result.error) {
      summary.marked += 1;
      continue;
    }

    if (result.error.toLowerCase().includes("already")) {
      summary.skipped += 1;
      continue;
    }

    summary.failed += 1;
    summary.errors.push({
      studentName: entry.studentName || "Student",
      error: result.error
    });
  }

  const error = summary.marked || summary.skipped
    ? null
    : summary.errors[0]?.error || "Could not mark these reminders. Please try again.";

  return {
    summary,
    error
  };
}
