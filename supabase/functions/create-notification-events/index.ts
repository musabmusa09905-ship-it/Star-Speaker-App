import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const timezone = "Europe/Istanbul";
const defaultAppUrl = "http://localhost:5173";
const allSlots = [
  "student_morning_ready",
  "student_afternoon_missing",
  "student_evening_missing",
  "student_unread_message",
  "teacher_review_waiting",
  "teacher_writing_review_waiting",
  "teacher_students_need_reminder",
  "teacher_unread_message",
  "admin_students_need_reminder",
  "admin_review_backlog",
  "admin_pending_users"
];

const skippedSlots = [
  {
    slot: "student_feedback_ready",
    reason: "Feedback viewed/unviewed state is not tracked safely yet."
  },
  {
    slot: "admin_unread_message",
    reason: "The current message model is student-teacher thread based and has no admin inbox recipient state."
  }
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notification-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type SupabaseClient = ReturnType<typeof createClient>;

type Summary = {
  slot: string;
  dryRun: boolean;
  notificationDate: string;
  checked: number;
  created: number;
  wouldCreate: number;
  skippedCompleted: number;
  skippedDuplicate: number;
  skippedNoPreference: number;
  skippedNoTask: number;
  skippedNoData: number;
  failed: number;
  failures: Array<{ userId?: string; error: string }>;
  previews: Array<{
    userId: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }>;
};

type NotificationEventDraft = {
  user_id: string;
  actor_id?: string | null;
  notification_type: string;
  notification_slot: string;
  notification_date: string;
  title: string;
  body: string;
  target_url: string;
  priority?: "low" | "normal" | "high";
  metadata?: Record<string, unknown>;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function normalizeError(error: unknown) {
  if (!error) {
    return "Unknown error.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }

  return String(error);
}

function queryError(area: string, error: unknown) {
  return new Error(`Query failed in ${area}: ${normalizeError(error)}`);
}

function cleanText(value: unknown, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }

  const trimmed = String(value).trim();
  return trimmed || fallback;
}

function makeSummary(slot: string, dryRun: boolean, notificationDate: string): Summary {
  return {
    slot,
    dryRun,
    notificationDate,
    checked: 0,
    created: 0,
    wouldCreate: 0,
    skippedCompleted: 0,
    skippedDuplicate: 0,
    skippedNoPreference: 0,
    skippedNoTask: 0,
    skippedNoData: 0,
    failed: 0,
    failures: [],
    previews: []
  };
}

function formatLocalDate(date: Date, timeZone = timezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset"
  }).formatToParts(date);
  const value = parts.find((part) => part.type === "timeZoneName")?.value || "GMT+0";
  const match = value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  return sign * ((Number(match[2] || 0) * 60) + Number(match[3] || 0));
}

function zonedDateStartToUtcIso(dateString: string, timeZone = timezone) {
  const utcGuess = new Date(`${dateString}T00:00:00.000Z`);
  const offset = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset * 60 * 1000).toISOString();
}

function getUtcRangeForLocalDate(dateString: string, timeZone = timezone) {
  const nextDate = addDays(dateString, 1);
  return {
    start: zonedDateStartToUtcIso(dateString, timeZone),
    end: zonedDateStartToUtcIso(nextDate, timeZone)
  };
}

function appUrl(path: string) {
  const base = (Deno.env.get("APP_URL") || defaultAppUrl).replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new Error("Configured service-role secret is not a valid JWT.");
  }

  const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
  const paddedPayload = normalizedPayload.padEnd(normalizedPayload.length + ((4 - normalizedPayload.length % 4) % 4), "=");
  return JSON.parse(atob(paddedPayload)) as Record<string, unknown>;
}

function assertServiceRoleKey(serviceRoleKey: string) {
  const payload = decodeJwtPayload(serviceRoleKey);
  const role = cleanText(payload.role, "");

  if (role !== "service_role") {
    throw new Error(
      `NOTIFICATION_ENGINE_SERVICE_ROLE_KEY must be a Supabase service_role key. Current JWT role is "${role || "unknown"}".`
    );
  }
}

function createServiceRoleClient(supabaseUrl: string, serviceRoleKey: string) {
  assertServiceRoleKey(serviceRoleKey);

  const cleanUrl = supabaseUrl.replace(/\/+$/, "");

  return createClient(cleanUrl, serviceRoleKey, {
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

async function assertServiceClientCanReadProtectedTables(serviceClient: SupabaseClient) {
  const protectedTables = [
    "profiles",
    "assigned_tasks",
    "writing_tasks",
    "submissions",
    "writing_submissions",
    "teacher_students",
    "notification_events"
  ];

  for (const tableName of protectedTables) {
    const { error } = await serviceClient
      .from(tableName)
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) {
      throw queryError(`service-role self-check for ${tableName}`, error);
    }
  }
}

function isAuthorizedRunner(req: Request, runSecret: string) {
  const requestSecret = req.headers.get("x-notification-secret") || "";
  return Boolean(runSecret && requestSecret && requestSecret === runSecret);
}

function summarizeRun({
  requestedSlot,
  dryRun,
  notificationDate,
  summaries
}: {
  requestedSlot: string;
  dryRun: boolean;
  notificationDate: string;
  summaries: Summary[];
}) {
  const skipped = {
    completed: 0,
    duplicate: 0,
    noPreference: 0,
    noTask: 0,
    noData: 0
  };
  const errors: Array<{ slot: string; userId?: string; error: string }> = [];

  for (const summary of summaries) {
    skipped.completed += summary.skippedCompleted;
    skipped.duplicate += summary.skippedDuplicate;
    skipped.noPreference += summary.skippedNoPreference;
    skipped.noTask += summary.skippedNoTask;
    skipped.noData += summary.skippedNoData;
    errors.push(...summary.failures.map((failure) => ({
      slot: summary.slot,
      ...failure
    })));
  }

  return {
    ok: true,
    timezone,
    notificationDate,
    slot: requestedSlot || "all",
    dryRun,
    checked: summaries.reduce((total, summary) => total + summary.checked, 0),
    created: summaries.reduce((total, summary) => total + summary.created, 0),
    wouldCreate: summaries.reduce((total, summary) => total + summary.wouldCreate, 0),
    skipped,
    failed: summaries.reduce((total, summary) => total + summary.failed, 0),
    errors,
    summaries,
    skippedSlots
  };
}

async function createEvent(serviceClient: SupabaseClient, draft: NotificationEventDraft, summary: Summary) {
  summary.checked += 1;

  if (summary.dryRun) {
    summary.wouldCreate += 1;
    if (summary.previews.length < 10) {
      summary.previews.push({
        userId: draft.user_id,
        title: draft.title,
        body: draft.body,
        metadata: draft.metadata
      });
    }
    return;
  }

  const { error } = await serviceClient.from("notification_events").insert({
    ...draft,
    priority: draft.priority || "normal",
    status: "pending",
    metadata: draft.metadata || {}
  });

  if (error) {
    if (error.code === "23505") {
      summary.skippedDuplicate += 1;
      return;
    }

    summary.failed += 1;
    summary.failures.push({
      userId: draft.user_id,
      error: normalizeError(error)
    });
    return;
  }

  summary.created += 1;
}

async function getActiveProfiles(serviceClient: SupabaseClient, role: string | string[]) {
  let query = serviceClient.from("profiles").select("id, full_name, email, role, status").eq("status", "active");

  if (Array.isArray(role)) {
    query = query.in("role", role);
  } else {
    query = query.eq("role", role);
  }

  const { data, error } = await query;

  if (error) {
    throw queryError(`profiles active ${Array.isArray(role) ? role.join("/") : role} lookup`, error);
  }

  return data || [];
}

async function getPushSubscriptionMap(serviceClient: SupabaseClient, userIds: string[]) {
  if (!userIds.length) {
    return new Map<string, boolean>();
  }

  const { data, error } = await serviceClient
    .from("push_subscriptions")
    .select("user_id")
    .in("user_id", userIds)
    .eq("is_active", true);

  if (error) {
    console.error("create-notification-events: could not read active push subscriptions", normalizeError(error));
    return new Map<string, boolean>();
  }

  return new Map((data || []).map((row) => [row.user_id, true]));
}

async function getStudentPreferenceMap(serviceClient: SupabaseClient, studentIds: string[]) {
  if (!studentIds.length) {
    return new Map<string, { reminders_enabled?: boolean }>();
  }

  const { data, error } = await serviceClient
    .from("student_reminder_preferences")
    .select("student_id, reminders_enabled")
    .in("student_id", studentIds);

  if (error) {
    console.error("create-notification-events: could not read student reminder preferences", normalizeError(error));
    return new Map<string, { reminders_enabled?: boolean }>();
  }

  return new Map((data || []).map((row) => [row.student_id, row]));
}

async function getCompletedStudentIds(serviceClient: SupabaseClient, studentIds: string[], range: { start: string; end: string }) {
  if (!studentIds.length) {
    return new Set<string>();
  }

  const [
    { data: speakingRows, error: speakingError },
    { data: writingRows, error: writingError }
  ] = await Promise.all([
    serviceClient
      .from("submissions")
      .select("student_id")
      .in("student_id", studentIds)
      .in("status", ["submitted", "reviewed"])
      .gte("submitted_at", range.start)
      .lt("submitted_at", range.end),
    serviceClient
      .from("writing_submissions")
      .select("student_id")
      .in("student_id", studentIds)
      .in("status", ["submitted", "reviewed"])
      .gte("submitted_at", range.start)
      .lt("submitted_at", range.end)
  ]);

  if (speakingError || writingError) {
    throw queryError("student completion rows lookup (submissions/writing_submissions)", speakingError || writingError);
  }

  return new Set([
    ...(speakingRows || []).map((row) => row.student_id),
    ...(writingRows || []).map((row) => row.student_id)
  ]);
}

async function getStudentTaskMap(serviceClient: SupabaseClient, studentIds: string[], date: string, dueTodayOnly = false) {
  if (!studentIds.length) {
    return new Map<string, Array<{ id: string; title: string; kind: string }>>();
  }

  let speakingQuery = serviceClient
    .from("assigned_tasks")
    .select("id, student_id, title, due_date")
    .in("student_id", studentIds)
    .in("status", ["assigned", "in_progress"]);

  let writingQuery = serviceClient
    .from("writing_tasks")
    .select("id, student_id, title, due_date")
    .in("student_id", studentIds)
    .eq("status", "assigned");

  if (dueTodayOnly) {
    speakingQuery = speakingQuery.eq("due_date", date);
    writingQuery = writingQuery.eq("due_date", date);
  } else {
    speakingQuery = speakingQuery.or(`due_date.is.null,due_date.lte.${date}`);
    writingQuery = writingQuery.or(`due_date.is.null,due_date.lte.${date}`);
  }

  const [
    { data: speakingTasks, error: speakingError },
    { data: writingTasks, error: writingError }
  ] = await Promise.all([speakingQuery, writingQuery]);

  if (speakingError || writingError) {
    throw queryError("active student tasks lookup (assigned_tasks/writing_tasks)", speakingError || writingError);
  }

  const taskMap = new Map<string, Array<{ id: string; title: string; kind: string }>>();

  for (const task of speakingTasks || []) {
    const rows = taskMap.get(task.student_id) || [];
    rows.push({ id: task.id, title: task.title, kind: "speaking" });
    taskMap.set(task.student_id, rows);
  }

  for (const task of writingTasks || []) {
    const rows = taskMap.get(task.student_id) || [];
    rows.push({ id: task.id, title: task.title, kind: "writing" });
    taskMap.set(task.student_id, rows);
  }

  return taskMap;
}

const musabMissingMessages = [
  "{{studentName}}, I can see your task is still untouched today.\nDo it now, because you really don’t want problems with me over one tiny English task.\nOne short answer. That’s all.",
  "{{studentName}}, your task is waiting. I am also waiting.\nAnd trust me, it is better if the task sees you before I have to remind you again.\nGo finish one short answer.",
  "{{studentName}}, what happened?\nYour task has been sitting there all day like it got abandoned.\nGo touch it now. I don’t want us to have a serious conversation about one small task.",
  "{{studentName}}, I know you can do this.\nBut knowing is not enough today. You need to submit one answer.\nDon't disappear from your own progress.",
  "{{studentName}}, I saw the task. It is still waiting.\nYou saw the task. You are still waiting.\nSo now one of you has to move — and it’s not going to be the task. Go do it."
];

function getLocalDateRotationNumber(notificationDate: string) {
  const date = new Date(`${notificationDate}T00:00:00.000Z`);
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  return (dayNumber % musabMissingMessages.length) + 1;
}

function formatStudentName(student: { full_name?: string | null; email?: string | null }) {
  return cleanText(student.full_name, "") || cleanText(student.email, "Student").split("@")[0] || "Student";
}

function isMusabProfile(profile: { full_name?: string | null; email?: string | null; signature_name?: string | null; style_notes?: string | null } | null | undefined) {
  const searchable = [
    profile?.full_name,
    profile?.email,
    profile?.signature_name,
    profile?.style_notes
  ].map((value) => cleanText(value, "").toLowerCase());

  return searchable.some((value) => /\bmusab\b/.test(value));
}

async function getStudentTeacherVoiceMap(serviceClient: SupabaseClient, studentIds: string[]) {
  if (!studentIds.length) {
    return new Map<string, { teacherId: string; isMusab: boolean }>();
  }

  const { data: links, error: linksError } = await serviceClient
    .from("teacher_students")
    .select("student_id, teacher_id, created_at")
    .in("student_id", studentIds)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (linksError) {
    throw queryError("student teacher voice link lookup", linksError);
  }

  const teacherIds = [...new Set((links || []).map((link) => link.teacher_id).filter(Boolean))];

  if (!teacherIds.length) {
    return new Map<string, { teacherId: string; isMusab: boolean }>();
  }

  const [
    { data: teacherProfiles, error: teacherProfilesError },
    { data: voiceProfiles, error: voiceProfilesError }
  ] = await Promise.all([
    serviceClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", teacherIds),
    serviceClient
      .from("teacher_reminder_voices")
      .select("teacher_id, signature_name, style_notes")
      .in("teacher_id", teacherIds)
      .eq("is_active", true)
  ]);

  if (teacherProfilesError || voiceProfilesError) {
    throw queryError("teacher Musab identity lookup", teacherProfilesError || voiceProfilesError);
  }

  const profilesById = new Map((teacherProfiles || []).map((profile) => [profile.id, profile]));
  const voicesByTeacherId = new Map((voiceProfiles || []).map((voice) => [voice.teacher_id, voice]));
  const map = new Map<string, { teacherId: string; isMusab: boolean }>();

  for (const link of links || []) {
    if (map.has(link.student_id)) {
      continue;
    }

    const profile = profilesById.get(link.teacher_id) || null;
    const voice = voicesByTeacherId.get(link.teacher_id) || null;
    map.set(link.student_id, {
      teacherId: link.teacher_id,
      isMusab: isMusabProfile({
        full_name: profile?.full_name,
        email: profile?.email,
        signature_name: voice?.signature_name,
        style_notes: voice?.style_notes
      })
    });
  }

  return map;
}

function buildStudentReminderCopy({
  slot,
  student,
  notificationDate,
  isMusabStudent
}: {
  slot: string;
  student: { full_name?: string | null; email?: string | null };
  notificationDate: string;
  isMusabStudent: boolean;
}) {
  const studentName = formatStudentName(student);

  if (isMusabStudent && ["student_afternoon_missing", "student_evening_missing"].includes(slot)) {
    const rotationNumber = getLocalDateRotationNumber(notificationDate);
    return {
      title: "Your English task is waiting",
      body: musabMissingMessages[rotationNumber - 1].replaceAll("{{studentName}}", studentName),
      priority: slot === "student_evening_missing" ? "high" as const : "normal" as const,
      metadata: {
        reminderTone: "musab_style",
        musabRotationNumber: rotationNumber
      }
    };
  }

  if (slot === "student_morning_ready") {
    return {
      title: "Your English task is ready",
      body: `${studentName}, your English task is ready. One small step today keeps the habit alive.`,
      priority: "normal" as const,
      metadata: {
        reminderTone: "warm_default"
      }
    };
  }

  if (slot === "student_afternoon_missing") {
    return {
      title: "Your English habit is waiting",
      body: `${studentName}, your English habit is still waiting. One short answer is enough to keep your rhythm.`,
      priority: "normal" as const,
      metadata: {
        reminderTone: "warm_default"
      }
    };
  }

  return {
    title: "Last call for today's English habit",
    body: `${studentName}, last call for today's English habit. Submit one small task and protect your progress.`,
    priority: "high" as const,
    metadata: {
      reminderTone: "warm_default"
    }
  };
}

async function runStudentTaskSlot({
  serviceClient,
  slot,
  notificationDate,
  range,
  dryRun
}: {
  serviceClient: SupabaseClient;
  slot: string;
  notificationDate: string;
  range: { start: string; end: string };
  dryRun: boolean;
}) {
  const summary = makeSummary(slot, dryRun, notificationDate);
  const students = await getActiveProfiles(serviceClient, "student");
  const studentIds = students.map((student) => student.id);
  const [preferences, pushMap, completedIds, taskMap, teacherVoiceMap] = await Promise.all([
    getStudentPreferenceMap(serviceClient, studentIds),
    getPushSubscriptionMap(serviceClient, studentIds),
    getCompletedStudentIds(serviceClient, studentIds, range),
    getStudentTaskMap(serviceClient, studentIds, notificationDate, slot === "student_morning_ready"),
    getStudentTeacherVoiceMap(serviceClient, studentIds)
  ]);

  for (const student of students) {
    const preference = preferences.get(student.id);

    if (preference?.reminders_enabled === false) {
      summary.skippedNoPreference += 1;
      continue;
    }

    const tasks = taskMap.get(student.id) || [];

    if (!tasks.length) {
      summary.skippedNoTask += 1;
      continue;
    }

    if (slot !== "student_morning_ready" && completedIds.has(student.id)) {
      summary.skippedCompleted += 1;
      continue;
    }

    const teacherVoice = teacherVoiceMap.get(student.id);
    const studentCopy = buildStudentReminderCopy({
      slot,
      student,
      notificationDate,
      isMusabStudent: Boolean(teacherVoice?.isMusab)
    });

    await createEvent(serviceClient, {
      user_id: student.id,
      notification_type: "student_task_habit",
      notification_slot: slot,
      notification_date: notificationDate,
      title: studentCopy.title,
      body: studentCopy.body,
      target_url: appUrl("/practice"),
      priority: studentCopy.priority,
      metadata: {
        ...studentCopy.metadata,
        role: "student",
        studentId: student.id,
        teacherId: teacherVoice?.teacherId || null,
        hasPushSubscription: Boolean(pushMap.get(student.id)),
        taskCount: tasks.length,
        tasks: tasks.slice(0, 5)
      }
    }, summary);
  }

  return summary;
}

async function runStudentUnreadMessageSlot(serviceClient: SupabaseClient, notificationDate: string, dryRun: boolean) {
  const slot = "student_unread_message";
  const summary = makeSummary(slot, dryRun, notificationDate);
  const students = await getActiveProfiles(serviceClient, "student");
  const studentIds = students.map((student) => student.id);
  const [pushMap, { data: threads, error: threadsError }] = await Promise.all([
    getPushSubscriptionMap(serviceClient, studentIds),
    serviceClient.from("message_threads").select("id, student_id").in("student_id", studentIds).eq("status", "open")
  ]);

  if (threadsError) {
    throw queryError("student message thread lookup", threadsError);
  }

  const threadIds = (threads || []).map((thread) => thread.id);

  if (!threadIds.length) {
    summary.skippedNoData = students.length;
    return summary;
  }

  const { data: messages, error: messagesError } = await serviceClient
    .from("messages")
    .select("id, thread_id, sender_id")
    .in("thread_id", threadIds)
    .is("read_at", null);

  if (messagesError) {
    throw queryError("unread student messages lookup", messagesError);
  }

  const threadById = new Map((threads || []).map((thread) => [thread.id, thread]));
  const unreadByStudent = new Map<string, number>();

  for (const message of messages || []) {
    const thread = threadById.get(message.thread_id);

    if (thread && message.sender_id !== thread.student_id) {
      unreadByStudent.set(thread.student_id, (unreadByStudent.get(thread.student_id) || 0) + 1);
    }
  }

  for (const [studentId, unreadCount] of unreadByStudent) {
    await createEvent(serviceClient, {
      user_id: studentId,
      notification_type: "message",
      notification_slot: slot,
      notification_date: notificationDate,
      title: "You have a new message",
      body: "Your teacher sent you something in Heart of English.",
      target_url: appUrl("/messages"),
      priority: "normal",
      metadata: {
        role: "student",
        studentId,
        unreadCount,
        hasPushSubscription: Boolean(pushMap.get(studentId))
      }
    }, summary);
  }

  summary.skippedNoData += Math.max(0, students.length - unreadByStudent.size);
  return summary;
}

async function getAssignedStudentIds(serviceClient: SupabaseClient, teacherId: string) {
  const { data, error } = await serviceClient
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherId)
    .eq("active", true);

  if (error) {
    throw queryError("teacher_students link lookup", error);
  }

  return [...new Set((data || []).map((row) => row.student_id).filter(Boolean))];
}

async function countRows(serviceClient: SupabaseClient, tableName: string, studentIds: string[], status = "submitted") {
  if (!studentIds.length) {
    return 0;
  }

  const { count, error } = await serviceClient
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .in("student_id", studentIds)
    .eq("status", status);

  if (error) {
    throw queryError(`${tableName} count`, error);
  }

  return count || 0;
}

async function runTeacherReviewSlot(serviceClient: SupabaseClient, slot: string, notificationDate: string, dryRun: boolean) {
  const summary = makeSummary(slot, dryRun, notificationDate);
  const teachers = await getActiveProfiles(serviceClient, "teacher");
  const pushMap = await getPushSubscriptionMap(serviceClient, teachers.map((teacher) => teacher.id));
  const isWriting = slot === "teacher_writing_review_waiting";

  for (const teacher of teachers) {
    const studentIds = await getAssignedStudentIds(serviceClient, teacher.id);
    const pendingCount = await countRows(serviceClient, isWriting ? "writing_submissions" : "submissions", studentIds);

    if (pendingCount === 0) {
      summary.skippedNoData += 1;
      continue;
    }

    await createEvent(serviceClient, {
      user_id: teacher.id,
      notification_type: isWriting ? "teacher_writing_review" : "teacher_speaking_review",
      notification_slot: slot,
      notification_date: notificationDate,
      title: isWriting ? "Writing reviews waiting" : "Reviews waiting",
      body: isWriting
        ? `${formatStudentName(teacher)}, you have writing submissions waiting for review.`
        : `${formatStudentName(teacher)}, you have speaking submissions waiting for review.`,
      target_url: appUrl(isWriting ? "/writing" : "/teacher/review"),
      priority: "high",
      metadata: {
        role: "teacher",
        teacherId: teacher.id,
        pendingCount,
        hasPushSubscription: Boolean(pushMap.get(teacher.id))
      }
    }, summary);
  }

  return summary;
}

async function runTeacherStudentsNeedReminderSlot({
  serviceClient,
  notificationDate,
  range,
  dryRun
}: {
  serviceClient: SupabaseClient;
  notificationDate: string;
  range: { start: string; end: string };
  dryRun: boolean;
}) {
  const slot = "teacher_students_need_reminder";
  const summary = makeSummary(slot, dryRun, notificationDate);
  const teachers = await getActiveProfiles(serviceClient, "teacher");
  const pushMap = await getPushSubscriptionMap(serviceClient, teachers.map((teacher) => teacher.id));

  for (const teacher of teachers) {
    const studentIds = await getAssignedStudentIds(serviceClient, teacher.id);
    const [completedIds, taskMap] = await Promise.all([
      getCompletedStudentIds(serviceClient, studentIds, range),
      getStudentTaskMap(serviceClient, studentIds, notificationDate, false)
    ]);
    const needingReminder = studentIds.filter((studentId) => !completedIds.has(studentId) && (taskMap.get(studentId) || []).length > 0);

    if (!needingReminder.length) {
      summary.skippedNoData += 1;
      continue;
    }

    await createEvent(serviceClient, {
      user_id: teacher.id,
      notification_type: "teacher_students_need_reminder",
      notification_slot: slot,
      notification_date: notificationDate,
      title: "Students need support",
      body: `${formatStudentName(teacher)}, some students still need a reminder today.`,
      target_url: appUrl("/daily-reminders"),
      priority: "normal",
      metadata: {
        role: "teacher",
        teacherId: teacher.id,
        missingStudentCount: needingReminder.length,
        studentIds: needingReminder.slice(0, 25),
        hasPushSubscription: Boolean(pushMap.get(teacher.id))
      }
    }, summary);
  }

  return summary;
}

async function runTeacherUnreadMessageSlot(serviceClient: SupabaseClient, notificationDate: string, dryRun: boolean) {
  const slot = "teacher_unread_message";
  const summary = makeSummary(slot, dryRun, notificationDate);
  const teachers = await getActiveProfiles(serviceClient, "teacher");
  const teacherIds = teachers.map((teacher) => teacher.id);
  const [pushMap, { data: threads, error: threadsError }] = await Promise.all([
    getPushSubscriptionMap(serviceClient, teacherIds),
    serviceClient.from("message_threads").select("id, teacher_id").in("teacher_id", teacherIds).eq("status", "open")
  ]);

  if (threadsError) {
    throw queryError("teacher message thread lookup", threadsError);
  }

  const threadIds = (threads || []).map((thread) => thread.id);

  if (!threadIds.length) {
    summary.skippedNoData = teachers.length;
    return summary;
  }

  const { data: messages, error: messagesError } = await serviceClient
    .from("messages")
    .select("id, thread_id, sender_id")
    .in("thread_id", threadIds)
    .is("read_at", null);

  if (messagesError) {
    throw queryError("unread teacher messages lookup", messagesError);
  }

  const threadById = new Map((threads || []).map((thread) => [thread.id, thread]));
  const unreadByTeacher = new Map<string, number>();

  for (const message of messages || []) {
    const thread = threadById.get(message.thread_id);

    if (thread && message.sender_id !== thread.teacher_id) {
      unreadByTeacher.set(thread.teacher_id, (unreadByTeacher.get(thread.teacher_id) || 0) + 1);
    }
  }

  for (const [teacherId, unreadCount] of unreadByTeacher) {
    await createEvent(serviceClient, {
      user_id: teacherId,
      notification_type: "message",
      notification_slot: slot,
      notification_date: notificationDate,
      title: "You have a new message",
      body: "A student sent you something in Heart of English.",
      target_url: appUrl("/teacher/messages"),
      priority: "normal",
      metadata: {
        role: "teacher",
        teacherId,
        unreadCount,
        hasPushSubscription: Boolean(pushMap.get(teacherId))
      }
    }, summary);
  }

  summary.skippedNoData += Math.max(0, teachers.length - unreadByTeacher.size);
  return summary;
}

async function runAdminStudentsNeedReminderSlot({
  serviceClient,
  notificationDate,
  range,
  dryRun
}: {
  serviceClient: SupabaseClient;
  notificationDate: string;
  range: { start: string; end: string };
  dryRun: boolean;
}) {
  const slot = "admin_students_need_reminder";
  const summary = makeSummary(slot, dryRun, notificationDate);
  const admins = await getActiveProfiles(serviceClient, ["admin", "coordinator"]);
  const students = await getActiveProfiles(serviceClient, "student");
  const studentIds = students.map((student) => student.id);
  const [pushMap, completedIds, taskMap] = await Promise.all([
    getPushSubscriptionMap(serviceClient, admins.map((admin) => admin.id)),
    getCompletedStudentIds(serviceClient, studentIds, range),
    getStudentTaskMap(serviceClient, studentIds, notificationDate, false)
  ]);
  const missingStudentIds = studentIds.filter((studentId) => !completedIds.has(studentId) && (taskMap.get(studentId) || []).length > 0);

  if (!missingStudentIds.length) {
    summary.skippedNoData = admins.length;
    return summary;
  }

  for (const admin of admins) {
    await createEvent(serviceClient, {
      user_id: admin.id,
      notification_type: "admin_students_need_reminder",
      notification_slot: slot,
      notification_date: notificationDate,
      title: "Heart of English summary",
      body: `${formatStudentName(admin)}, there are student reminders or review items waiting.`,
      target_url: appUrl("/daily-reminders"),
      priority: "normal",
      metadata: {
        role: admin.role,
        missingStudentCount: missingStudentIds.length,
        hasPushSubscription: Boolean(pushMap.get(admin.id))
      }
    }, summary);
  }

  return summary;
}

async function runAdminReviewBacklogSlot(serviceClient: SupabaseClient, notificationDate: string, dryRun: boolean) {
  const slot = "admin_review_backlog";
  const summary = makeSummary(slot, dryRun, notificationDate);
  const admins = await getActiveProfiles(serviceClient, ["admin", "coordinator"]);
  const pushMap = await getPushSubscriptionMap(serviceClient, admins.map((admin) => admin.id));
  const [speakingPending, writingPending] = await Promise.all([
    countRows(serviceClient, "submissions", (await getActiveProfiles(serviceClient, "student")).map((student) => student.id)),
    countRows(serviceClient, "writing_submissions", (await getActiveProfiles(serviceClient, "student")).map((student) => student.id))
  ]);
  const pendingCount = speakingPending + writingPending;

  if (pendingCount === 0) {
    summary.skippedNoData = admins.length;
    return summary;
  }

  for (const admin of admins) {
    await createEvent(serviceClient, {
      user_id: admin.id,
      notification_type: "admin_review_backlog",
      notification_slot: slot,
      notification_date: notificationDate,
      title: "Heart of English summary",
      body: `${formatStudentName(admin)}, there are student reminders or review items waiting.`,
      target_url: appUrl("/teacher/review"),
      priority: "high",
      metadata: {
        role: admin.role,
        pendingCount,
        speakingPending,
        writingPending,
        hasPushSubscription: Boolean(pushMap.get(admin.id))
      }
    }, summary);
  }

  return summary;
}

async function runAdminPendingUsersSlot(serviceClient: SupabaseClient, notificationDate: string, dryRun: boolean) {
  const slot = "admin_pending_users";
  const summary = makeSummary(slot, dryRun, notificationDate);
  const admins = await getActiveProfiles(serviceClient, ["admin", "coordinator"]);
  const pushMap = await getPushSubscriptionMap(serviceClient, admins.map((admin) => admin.id));
  const { count, error } = await serviceClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    throw queryError("pending profiles count", error);
  }

  const pendingCount = count || 0;

  if (pendingCount === 0) {
    summary.skippedNoData = admins.length;
    return summary;
  }

  for (const admin of admins) {
    await createEvent(serviceClient, {
      user_id: admin.id,
      notification_type: "admin_pending_users",
      notification_slot: slot,
      notification_date: notificationDate,
      title: "Heart of English summary",
      body: `${formatStudentName(admin)}, there are student reminders or review items waiting.`,
      target_url: appUrl("/admin/users"),
      priority: "normal",
      metadata: {
        role: admin.role,
        pendingCount,
        hasPushSubscription: Boolean(pushMap.get(admin.id))
      }
    }, summary);
  }

  return summary;
}

async function runSlot(serviceClient: SupabaseClient, slot: string, notificationDate: string, dryRun: boolean) {
  const range = getUtcRangeForLocalDate(notificationDate, timezone);

  if (["student_morning_ready", "student_afternoon_missing", "student_evening_missing"].includes(slot)) {
    return runStudentTaskSlot({ serviceClient, slot, notificationDate, range, dryRun });
  }

  if (slot === "student_unread_message") {
    return runStudentUnreadMessageSlot(serviceClient, notificationDate, dryRun);
  }

  if (["teacher_review_waiting", "teacher_writing_review_waiting"].includes(slot)) {
    return runTeacherReviewSlot(serviceClient, slot, notificationDate, dryRun);
  }

  if (slot === "teacher_students_need_reminder") {
    return runTeacherStudentsNeedReminderSlot({ serviceClient, notificationDate, range, dryRun });
  }

  if (slot === "teacher_unread_message") {
    return runTeacherUnreadMessageSlot(serviceClient, notificationDate, dryRun);
  }

  if (slot === "admin_students_need_reminder") {
    return runAdminStudentsNeedReminderSlot({ serviceClient, notificationDate, range, dryRun });
  }

  if (slot === "admin_review_backlog") {
    return runAdminReviewBacklogSlot(serviceClient, notificationDate, dryRun);
  }

  if (slot === "admin_pending_users") {
    return runAdminPendingUsersSlot(serviceClient, notificationDate, dryRun);
  }

  return {
    ...makeSummary(slot, dryRun, notificationDate),
    skippedNoData: 1,
    failures: [{ error: `Slot ${slot} is not implemented safely in this engine.` }]
  };
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return jsonResponse(200, { ok: true });
    }

    if (req.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "Use POST to create notification events." });
    }

    let body: Record<string, unknown> = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    let supabaseUrl = "";
    let serviceRoleKey = "";
    let runSecret = "";

    try {
      supabaseUrl = getRequiredEnv("SUPABASE_URL");
      serviceRoleKey = getRequiredEnv("NOTIFICATION_ENGINE_SERVICE_ROLE_KEY");
      runSecret = getRequiredEnv("NOTIFICATION_ENGINE_SECRET");
      getRequiredEnv("APP_URL");
    } catch (error) {
      const message = normalizeError(error);
      console.error("create-notification-events: environment validation failed", message);
      return jsonResponse(500, {
        ok: false,
        error: message,
        details: "Set the missing value in Supabase Edge Function secrets. Do not commit secret values."
      });
    }

    if (!isAuthorizedRunner(req, runSecret)) {
      return jsonResponse(401, { ok: false, error: "Unauthorized" });
    }

    const dryRun = body.dryRun === true;
    const requestedSlot = cleanText(body.slot, "");
    const notificationDate = cleanText(body.notificationDate, formatLocalDate(new Date(), timezone));

    let serviceClient: SupabaseClient;

    try {
      serviceClient = createServiceRoleClient(supabaseUrl, serviceRoleKey);
      await assertServiceClientCanReadProtectedTables(serviceClient);
    } catch (error) {
      const message = normalizeError(error);
      console.error("create-notification-events: service-role client validation failed", message);
      return jsonResponse(500, {
        ok: false,
        error: "Notification engine service-role access is not configured correctly.",
        details: message
      });
    }

    const slots = requestedSlot ? [requestedSlot] : allSlots;
    const invalidSlots = slots.filter((slot) => !allSlots.includes(slot));

    if (invalidSlots.length) {
      return jsonResponse(400, {
        ok: false,
        error: "Unsupported notification slot.",
        details: `Supported slots: ${allSlots.join(", ")}`,
        invalidSlots,
        supportedSlots: allSlots
      });
    }

    const summaries = [];

    for (const slot of slots) {
      summaries.push(await runSlot(serviceClient, slot, notificationDate, dryRun));
    }

    return jsonResponse(200, summarizeRun({ requestedSlot, dryRun, notificationDate, summaries }));
  } catch (error) {
    const message = normalizeError(error);
    console.error("create-notification-events: unhandled run failure", message);
    return jsonResponse(500, {
      ok: false,
      error: "Could not create notification events.",
      details: message
    });
  }
});
