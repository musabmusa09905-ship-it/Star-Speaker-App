import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type SupabaseClient = ReturnType<typeof createClient>;

type AppProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  status: string | null;
};

type NotificationDraft = {
  userId: string;
  actorId: string;
  notificationType: string;
  notificationSlot: string;
  title: string;
  body: string;
  targetUrl: string;
  metadata: Record<string, unknown>;
  priority?: "low" | "normal" | "high";
};

type NotificationEvent = {
  id: string;
  user_id: string;
  notification_type: string;
  notification_slot: string;
  title: string;
  body: string;
  target_url: string | null;
  metadata: Record<string, unknown> | null;
  attempts: number | null;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
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

function getBearerToken(req: Request) {
  return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

function isActiveProfile(profile: AppProfile | null) {
  return Boolean(profile?.id && profile.status === "active");
}

function displayName(profile: Pick<AppProfile, "full_name" | "email"> | null | undefined, fallback = "Someone") {
  return profile?.full_name?.trim() || profile?.email?.split("@")[0] || fallback;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getBodyString(body: Record<string, unknown>, key: string) {
  return typeof body[key] === "string" ? String(body[key]).trim() : "";
}

async function getProfile(serviceClient: SupabaseClient, profileId: string) {
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id, full_name, email, role, status")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`profiles lookup failed: ${normalizeError(error)}`);
  }

  return (data || null) as AppProfile | null;
}

async function getProfiles(serviceClient: SupabaseClient, profileIds: string[]) {
  const ids = [...new Set(profileIds.filter(Boolean))];

  if (!ids.length) {
    return new Map<string, AppProfile>();
  }

  const { data, error } = await serviceClient
    .from("profiles")
    .select("id, full_name, email, role, status")
    .in("id", ids);

  if (error) {
    throw new Error(`profiles lookup failed: ${normalizeError(error)}`);
  }

  return new Map((data || []).map((profile: AppProfile) => [profile.id, profile]));
}

async function getActiveTeachersForStudent(serviceClient: SupabaseClient, studentId: string, preferredTeacherId?: string | null) {
  const { data, error } = await serviceClient
    .from("teacher_students")
    .select("teacher_id")
    .eq("student_id", studentId)
    .eq("active", true);

  if (error) {
    throw new Error(`teacher_students lookup failed: ${normalizeError(error)}`);
  }

  const teacherIds = [
    ...(preferredTeacherId ? [preferredTeacherId] : []),
    ...((data || []).map((item: { teacher_id: string }) => item.teacher_id))
  ];

  return [...new Set(teacherIds.filter(Boolean))];
}

async function getActiveAdminLikeFallback(serviceClient: SupabaseClient) {
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id, full_name, email, role, status")
    .in("role", ["admin", "coordinator"])
    .eq("status", "active");

  if (error) {
    throw new Error(`admin fallback lookup failed: ${normalizeError(error)}`);
  }

  return (data || []) as AppProfile[];
}

function verifyStudentActor(caller: AppProfile, studentId: string) {
  if (caller.id === studentId || ["admin", "coordinator"].includes(caller.role)) {
    return;
  }

  throw new Error("The caller is not allowed to dispatch this student notification.");
}

async function verifyAssignedTeacherActor(serviceClient: SupabaseClient, caller: AppProfile, studentId: string) {
  if (["admin", "coordinator"].includes(caller.role)) {
    return;
  }

  if (caller.role !== "teacher") {
    throw new Error("Only an assigned teacher can dispatch this feedback notification.");
  }

  const { data, error } = await serviceClient
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", caller.id)
    .eq("student_id", studentId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`teacher assignment verification failed: ${normalizeError(error)}`);
  }

  if (!data?.id) {
    throw new Error("The teacher is not assigned to this student.");
  }
}

async function resolveTeacherRecipients({
  serviceClient,
  studentId,
  preferredTeacherId
}: {
  serviceClient: SupabaseClient;
  studentId: string;
  preferredTeacherId?: string | null;
}) {
  const teacherIds = await getActiveTeachersForStudent(serviceClient, studentId, preferredTeacherId);
  const profiles = await getProfiles(serviceClient, teacherIds);
  const activeTeachers = teacherIds
    .map((id) => profiles.get(id) || null)
    .filter((profile): profile is AppProfile => Boolean(profile && profile.role === "teacher" && profile.status === "active"));

  if (preferredTeacherId) {
    const preferredTeacher = activeTeachers.find((teacher) => teacher.id === preferredTeacherId);

    if (preferredTeacher) {
      return [preferredTeacher];
    }
  }

  if (activeTeachers[0]) {
    return [activeTeachers[0]];
  }

  return getActiveAdminLikeFallback(serviceClient);
}

async function buildSpeakingSubmissionDrafts(serviceClient: SupabaseClient, caller: AppProfile, submissionId: string) {
  const { data: submission, error: submissionError } = await serviceClient
    .from("submissions")
    .select("id, assigned_task_id, student_id, status, submitted_at")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError) {
    throw new Error(`submissions lookup failed: ${normalizeError(submissionError)}`);
  }

  if (!submission?.id) {
    throw new Error("No speaking submission was found for this notification.");
  }

  verifyStudentActor(caller, submission.student_id);

  const [{ data: task, error: taskError }, student] = await Promise.all([
    serviceClient
      .from("assigned_tasks")
      .select("id, title, teacher_id, student_id, status")
      .eq("id", submission.assigned_task_id)
      .maybeSingle(),
    getProfile(serviceClient, submission.student_id)
  ]);

  if (taskError) {
    throw new Error(`assigned_tasks lookup failed: ${normalizeError(taskError)}`);
  }

  if (!task?.id || task.student_id !== submission.student_id) {
    throw new Error("The speaking submission is not linked to a valid assigned task.");
  }

  const recipients = await resolveTeacherRecipients({
    serviceClient,
    studentId: submission.student_id,
    preferredTeacherId: task.teacher_id
  });
  const studentName = displayName(student, "A student");

  return recipients
    .filter((recipient) => recipient.id !== caller.id)
    .map((recipient) => ({
      userId: recipient.id,
      actorId: caller.id,
      notificationType: "speaking_submitted",
      notificationSlot: "instant_speaking_submission",
      title: "New speaking submission",
      body: `${studentName} submitted a speaking task. Review is waiting.`,
      targetUrl: "/teacher/review",
      priority: "high" as const,
      metadata: {
        sourceType: "speaking_submission",
        sourceId: submission.id,
        studentId: submission.student_id,
        assignedTaskId: submission.assigned_task_id
      }
    }));
}

async function buildWritingSubmissionDrafts(serviceClient: SupabaseClient, caller: AppProfile, submissionId: string) {
  const { data: submission, error: submissionError } = await serviceClient
    .from("writing_submissions")
    .select("id, task_id, student_id, status, submitted_at")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError) {
    throw new Error(`writing_submissions lookup failed: ${normalizeError(submissionError)}`);
  }

  if (!submission?.id) {
    throw new Error("No writing submission was found for this notification.");
  }

  verifyStudentActor(caller, submission.student_id);

  const [{ data: task, error: taskError }, student] = await Promise.all([
    serviceClient
      .from("writing_tasks")
      .select("id, title, assigned_by, student_id, status")
      .eq("id", submission.task_id)
      .maybeSingle(),
    getProfile(serviceClient, submission.student_id)
  ]);

  if (taskError) {
    throw new Error(`writing_tasks lookup failed: ${normalizeError(taskError)}`);
  }

  if (!task?.id || task.student_id !== submission.student_id) {
    throw new Error("The writing submission is not linked to a valid writing task.");
  }

  const recipients = await resolveTeacherRecipients({
    serviceClient,
    studentId: submission.student_id,
    preferredTeacherId: task.assigned_by
  });
  const studentName = displayName(student, "A student");

  return recipients
    .filter((recipient) => recipient.id !== caller.id)
    .map((recipient) => ({
      userId: recipient.id,
      actorId: caller.id,
      notificationType: "writing_submitted",
      notificationSlot: "instant_writing_submission",
      title: "New writing submission",
      body: `${studentName} submitted a writing task. Review is waiting.`,
      targetUrl: "/writing",
      priority: "high" as const,
      metadata: {
        sourceType: "writing_submission",
        sourceId: submission.id,
        studentId: submission.student_id,
        writingTaskId: submission.task_id
      }
    }));
}

async function buildSpeakingFeedbackDraft(serviceClient: SupabaseClient, caller: AppProfile, feedbackId: string) {
  const { data: feedback, error: feedbackError } = await serviceClient
    .from("feedback")
    .select("id, submission_id, assigned_task_id, student_id, teacher_id")
    .eq("id", feedbackId)
    .maybeSingle();

  if (feedbackError) {
    throw new Error(`feedback lookup failed: ${normalizeError(feedbackError)}`);
  }

  if (!feedback?.id) {
    throw new Error("No speaking feedback row was found for this notification.");
  }

  await verifyAssignedTeacherActor(serviceClient, caller, feedback.student_id);

  const [student, teacher] = await Promise.all([
    getProfile(serviceClient, feedback.student_id),
    getProfile(serviceClient, feedback.teacher_id)
  ]);

  if (!isActiveProfile(student)) {
    return [];
  }

  const studentName = displayName(student, "Student");

  return [{
    userId: feedback.student_id,
    actorId: caller.id,
    notificationType: "feedback_ready",
    notificationSlot: "instant_feedback_ready",
    title: `${studentName}, your feedback is ready`,
    body: "Your teacher reviewed your work. Open it and use one correction today.",
    targetUrl: "/feedback",
    priority: "high" as const,
    metadata: {
      sourceType: "speaking_feedback",
      sourceId: feedback.id,
      feedbackId: feedback.id,
      submissionId: feedback.submission_id,
      studentId: feedback.student_id,
      assignedTaskId: feedback.assigned_task_id
    }
  }];
}

async function buildWritingFeedbackDraft(serviceClient: SupabaseClient, caller: AppProfile, submissionId: string) {
  const { data: submission, error: submissionError } = await serviceClient
    .from("writing_submissions")
    .select("id, task_id, student_id, status, reviewed_at")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError) {
    throw new Error(`writing_submissions feedback lookup failed: ${normalizeError(submissionError)}`);
  }

  if (!submission?.id) {
    throw new Error("No reviewed writing submission was found for this notification.");
  }

  if (submission.status !== "reviewed") {
    throw new Error("Writing feedback notification requires a reviewed writing submission.");
  }

  await verifyAssignedTeacherActor(serviceClient, caller, submission.student_id);

  const [student, teacher] = await Promise.all([
    getProfile(serviceClient, submission.student_id),
    getProfile(serviceClient, caller.id)
  ]);

  if (!isActiveProfile(student)) {
    return [];
  }

  const studentName = displayName(student, "Student");

  return [{
    userId: submission.student_id,
    actorId: caller.id,
    notificationType: "feedback_ready",
    notificationSlot: "instant_feedback_ready",
    title: `${studentName}, your feedback is ready`,
    body: "Your teacher reviewed your work. Open it and use one correction today.",
    targetUrl: "/writing",
    priority: "high" as const,
    metadata: {
      sourceType: "writing_feedback",
      sourceId: submission.id,
      submissionId: submission.id,
      studentId: submission.student_id,
      writingTaskId: submission.task_id
    }
  }];
}

async function buildMessageDraft(serviceClient: SupabaseClient, caller: AppProfile, messageId: string) {
  const { data: message, error: messageError } = await serviceClient
    .from("messages")
    .select("id, thread_id, sender_id, sender_role, body, created_at")
    .eq("id", messageId)
    .maybeSingle();

  if (messageError) {
    throw new Error(`messages lookup failed: ${normalizeError(messageError)}`);
  }

  if (!message?.id) {
    throw new Error("No message was found for this notification.");
  }

  if (message.sender_id !== caller.id && !["admin", "coordinator"].includes(caller.role)) {
    throw new Error("The caller is not allowed to dispatch this message notification.");
  }

  const { data: thread, error: threadError } = await serviceClient
    .from("message_threads")
    .select("id, student_id, teacher_id, status, subject")
    .eq("id", message.thread_id)
    .maybeSingle();

  if (threadError) {
    throw new Error(`message_threads lookup failed: ${normalizeError(threadError)}`);
  }

  if (!thread?.id) {
    throw new Error("The message is not linked to a valid support thread.");
  }

  const recipientIds =
    message.sender_id === thread.student_id
      ? [thread.teacher_id]
      : message.sender_id === thread.teacher_id
        ? [thread.student_id]
        : ["admin", "coordinator"].includes(caller.role)
          ? [thread.student_id, thread.teacher_id]
          : [];

  if (!recipientIds.length) {
    return [];
  }

  const [recipientsById, sender, student] = await Promise.all([
    getProfiles(serviceClient, recipientIds),
    getProfile(serviceClient, message.sender_id),
    getProfile(serviceClient, thread.student_id)
  ]);

  return recipientIds
    .map((recipientId) => recipientsById.get(recipientId) || null)
    .filter((recipient): recipient is AppProfile => isActiveProfile(recipient))
    .map((recipient) => {
      const targetUrl = recipient.role === "teacher" ? "/teacher/messages" : "/messages";
      const studentName = displayName(student, "your student");
      const title = recipient.role === "teacher"
        ? `New message from ${studentName}`
        : message.sender_id === thread.teacher_id
          ? "New message from your teacher"
          : "New message in Heart of English";
      const body = recipient.role === "teacher"
        ? `${studentName} sent you a message in Heart of English.`
        : `${studentName}, your teacher sent you a message.`;

      return {
        userId: recipient.id,
        actorId: caller.id,
        notificationType: "message_received",
        notificationSlot: "instant_message_received",
        title,
        body,
        targetUrl,
        priority: "normal" as const,
        metadata: {
          sourceType: "message",
          sourceId: message.id,
          messageId: message.id,
          threadId: thread.id,
          studentId: thread.student_id,
          senderId: message.sender_id
        }
      };
    });
}

async function buildNotificationDrafts(serviceClient: SupabaseClient, caller: AppProfile, body: Record<string, unknown>) {
  const eventType = getBodyString(body, "eventType");
  const sourceType = getBodyString(body, "sourceType");
  const sourceId = getBodyString(body, "sourceId");
  const submissionId = getBodyString(body, "submissionId") || sourceId;
  const feedbackId = getBodyString(body, "feedbackId") || sourceId;
  const messageId = getBodyString(body, "messageId") || sourceId;

  if (eventType === "speaking_submitted") {
    if (!submissionId) {
      throw new Error("speaking_submitted requires submissionId.");
    }

    return buildSpeakingSubmissionDrafts(serviceClient, caller, submissionId);
  }

  if (eventType === "writing_submitted") {
    if (!submissionId) {
      throw new Error("writing_submitted requires submissionId.");
    }

    return buildWritingSubmissionDrafts(serviceClient, caller, submissionId);
  }

  if (eventType === "feedback_created") {
    if (feedbackId) {
      return buildSpeakingFeedbackDraft(serviceClient, caller, feedbackId);
    }

    if (submissionId && sourceType === "writing_submission") {
      return buildWritingFeedbackDraft(serviceClient, caller, submissionId);
    }

    throw new Error("feedback_created requires feedbackId or a writing submissionId with sourceType=writing_submission.");
  }

  if (eventType === "message_sent") {
    if (!messageId) {
      throw new Error("message_sent requires messageId.");
    }

    return buildMessageDraft(serviceClient, caller, messageId);
  }

  throw new Error("Unsupported instant notification eventType.");
}

async function findExistingSourceEvent(serviceClient: SupabaseClient, draft: NotificationDraft) {
  const { data, error } = await serviceClient
    .from("notification_events")
    .select("id, status")
    .eq("user_id", draft.userId)
    .eq("notification_type", draft.notificationType)
    .eq("notification_slot", draft.notificationSlot)
    .contains("metadata", {
      sourceType: draft.metadata.sourceType,
      sourceId: draft.metadata.sourceId
    })
    .maybeSingle();

  if (error) {
    throw new Error(`notification_events duplicate lookup failed: ${normalizeError(error)}`);
  }

  return data || null;
}

async function createEvent(serviceClient: SupabaseClient, draft: NotificationDraft) {
  const existing = await findExistingSourceEvent(serviceClient, draft);

  if (existing?.id) {
    return {
      event: {
        id: existing.id,
        user_id: draft.userId,
        notification_type: draft.notificationType,
        notification_slot: draft.notificationSlot,
        title: draft.title,
        body: draft.body,
        target_url: draft.targetUrl,
        metadata: draft.metadata,
        attempts: 0
      } as NotificationEvent,
      duplicate: true,
      existingStatus: existing.status as string
    };
  }

  const { data, error } = await serviceClient
    .from("notification_events")
    .insert({
      user_id: draft.userId,
      actor_id: draft.actorId,
      notification_type: draft.notificationType,
      notification_slot: draft.notificationSlot,
      notification_date: todayDate(),
      title: draft.title,
      body: draft.body,
      target_url: draft.targetUrl,
      status: "pending",
      priority: draft.priority || "normal",
      metadata: draft.metadata
    })
    .select("id,user_id,notification_type,notification_slot,title,body,target_url,metadata,attempts")
    .single();

  if (error) {
    throw new Error(`notification_events insert failed: ${normalizeError(error)}`);
  }

  return {
    event: data as NotificationEvent,
    duplicate: false,
    existingStatus: null
  };
}

async function claimEvent(serviceClient: SupabaseClient, event: NotificationEvent) {
  const { data, error } = await serviceClient
    .from("notification_events")
    .update({
      status: "sending",
      attempts: (event.attempts || 0) + 1,
      last_attempt_at: new Date().toISOString(),
      error_message: null
    })
    .eq("id", event.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`notification_events claim failed: ${normalizeError(error)}`);
  }

  return Boolean(data?.id);
}

async function getActiveSubscriptions(serviceClient: SupabaseClient, userId: string) {
  const { data, error } = await serviceClient
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`push_subscriptions lookup failed: ${normalizeError(error)}`);
  }

  return (data || []) as PushSubscriptionRow[];
}

function buildPayload(event: NotificationEvent) {
  const targetUrl = event.target_url || "/";

  return JSON.stringify({
    title: event.title || "Heart of English",
    body: event.body || "You have something waiting in the app.",
    icon: "/app-icon.png",
    badge: "/favicon.png",
    target_url: targetUrl,
    url: targetUrl,
    notification_id: event.id,
    notification_type: event.notification_type,
    notification_slot: event.notification_slot,
    data: event.metadata || {}
  });
}

function toWebPushSubscription(subscription: PushSubscriptionRow) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };
}

function isExpiredSubscriptionError(error: unknown) {
  const statusCode = Number((error as { statusCode?: unknown })?.statusCode || 0);
  const message = normalizeError(error).toLowerCase();

  return statusCode === 404 || statusCode === 410 || message.includes("expired") || message.includes("gone");
}

async function updateFinalEventStatus({
  serviceClient,
  eventId,
  status,
  deliverySummary,
  errorMessage
}: {
  serviceClient: SupabaseClient;
  eventId: string;
  status: string;
  deliverySummary: Record<string, unknown>;
  errorMessage: string | null;
}) {
  const { error } = await serviceClient
    .from("notification_events")
    .update({
      status,
      sent_at: ["sent", "partially_sent"].includes(status) ? new Date().toISOString() : null,
      error_message: errorMessage,
      delivery_summary: deliverySummary
    })
    .eq("id", eventId)
    .eq("status", "sending");

  if (error) {
    throw new Error(`notification_events status update failed: ${normalizeError(error)}`);
  }
}

async function deactivateSubscription(serviceClient: SupabaseClient, subscription: PushSubscriptionRow, errorMessage: string) {
  await serviceClient
    .from("push_subscriptions")
    .update({
      is_active: false,
      last_seen_at: new Date().toISOString()
    })
    .eq("id", subscription.id);

  return {
    subscriptionId: subscription.id,
    deactivated: true,
    error: errorMessage
  };
}

async function sendEvent(serviceClient: SupabaseClient, event: NotificationEvent) {
  const claimed = await claimEvent(serviceClient, event);

  if (!claimed) {
    return {
      status: "skipped_duplicate",
      attempted: 0,
      succeeded: 0,
      failed: 0,
      deactivated: 0
    };
  }

  const subscriptions = await getActiveSubscriptions(serviceClient, event.user_id);

  if (!subscriptions.length) {
    await updateFinalEventStatus({
      serviceClient,
      eventId: event.id,
      status: "skipped_no_subscription",
      deliverySummary: {
        attempted: 0,
        succeeded: 0,
        failed: 0,
        reason: "No active push subscriptions."
      },
      errorMessage: "No active push subscriptions for this user."
    });

    return {
      status: "skipped_no_subscription",
      attempted: 0,
      succeeded: 0,
      failed: 0,
      deactivated: 0
    };
  }

  const payload = buildPayload(event);
  let succeeded = 0;
  let failed = 0;
  let deactivated = 0;
  const errors: Array<{ subscriptionId: string; error: string; deactivated?: boolean }> = [];

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(toWebPushSubscription(subscription), payload);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      const errorMessage = normalizeError(error);

      if (isExpiredSubscriptionError(error)) {
        const cleanup = await deactivateSubscription(serviceClient, subscription, errorMessage);
        deactivated += 1;
        errors.push(cleanup);
      } else {
        errors.push({
          subscriptionId: subscription.id,
          error: errorMessage
        });
      }
    }
  }

  const finalStatus =
    succeeded === subscriptions.length
      ? "sent"
      : succeeded > 0
        ? "partially_sent"
        : "failed";
  const deliverySummary = {
    attempted: subscriptions.length,
    succeeded,
    failed,
    deactivated,
    errors
  };

  await updateFinalEventStatus({
    serviceClient,
    eventId: event.id,
    status: finalStatus,
    deliverySummary,
    errorMessage: errors.length ? errors.map((item) => item.error).join("; ").slice(0, 1000) : null
  });

  return {
    status: finalStatus,
    attempted: subscriptions.length,
    succeeded,
    failed,
    deactivated
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Use POST to dispatch instant notifications." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("PUSH_NOTIFICATION_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, {
      ok: false,
      error: "SUPABASE_URL or SUPABASE_ANON_KEY is missing in the Edge Function runtime."
    });
  }

  if (!serviceRoleKey) {
    return jsonResponse(500, {
      ok: false,
      error: "Missing PUSH_NOTIFICATION_SERVICE_ROLE_KEY in the Edge Function secrets."
    });
  }

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return jsonResponse(500, {
      ok: false,
      error: "Missing VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, or VAPID_SUBJECT in Edge Function secrets."
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return jsonResponse(401, {
      ok: false,
      error: "Missing Authorization bearer token."
    });
  }

  let body: Record<string, unknown> = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const sessionClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  try {
    const {
      data: { user },
      error: userError
    } = await sessionClient.auth.getUser(token);

    if (userError || !user?.id) {
      return jsonResponse(401, {
        ok: false,
        error: "Invalid or expired Authorization bearer token.",
        detail: userError ? normalizeError(userError) : undefined
      });
    }

    const caller = await getProfile(serviceClient, user.id);

    if (!caller?.id) {
      return jsonResponse(403, {
        ok: false,
        error: "No app profile row exists for the authenticated caller."
      });
    }

    if (caller.status !== "active") {
      return jsonResponse(403, {
        ok: false,
        error: "Only active app users can dispatch instant notifications."
      });
    }

    const drafts = await buildNotificationDrafts(serviceClient, caller, body);

    if (!drafts.length) {
      return jsonResponse(200, {
        ok: true,
        created: 0,
        sent: 0,
        skipped: 1,
        results: [{
          status: "skipped_no_recipient"
        }]
      });
    }

    const summary = {
      ok: true,
      created: 0,
      sent: 0,
      partiallySent: 0,
      failed: 0,
      skippedNoSubscription: 0,
      skippedDuplicate: 0,
      results: [] as Array<Record<string, unknown>>
    };

    for (const draft of drafts) {
      const { event, duplicate, existingStatus } = await createEvent(serviceClient, draft);

      if (duplicate) {
        summary.skippedDuplicate += 1;
        summary.results.push({
          notificationId: event.id,
          userId: draft.userId,
          status: "skipped_duplicate",
          existingStatus
        });
        continue;
      }

      summary.created += 1;
      const result = await sendEvent(serviceClient, event);

      if (result.status === "sent") {
        summary.sent += 1;
      } else if (result.status === "partially_sent") {
        summary.partiallySent += 1;
      } else if (result.status === "failed") {
        summary.failed += 1;
      } else if (result.status === "skipped_no_subscription") {
        summary.skippedNoSubscription += 1;
      } else if (result.status === "skipped_duplicate") {
        summary.skippedDuplicate += 1;
      }

      summary.results.push({
        notificationId: event.id,
        userId: draft.userId,
        ...result
      });
    }

    return jsonResponse(summary.failed || summary.partiallySent ? 207 : 200, summary);
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: "Could not dispatch instant notification.",
      detail: normalizeError(error)
    });
  }
});
