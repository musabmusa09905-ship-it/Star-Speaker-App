import { requireSupabaseClient } from "./supabaseClient.js";

export const STUDENT_ACTIVITY_EVENT_TYPES = {
  appOpened: "app_opened",
  taskViewed: "task_viewed",
  recordingStarted: "recording_started",
  taskSubmitted: "task_submitted",
  feedbackViewed: "feedback_viewed"
};

const allowedEventTypes = new Set(Object.values(STUDENT_ACTIVITY_EVENT_TYPES));

function getDedupeKey({ profile, eventType, dedupeKey }) {
  if (!dedupeKey || typeof window === "undefined") {
    return "";
  }

  return `hoe:activity:${profile.id}:${eventType}:${dedupeKey}`;
}

function hasDedupeMarker(key) {
  if (!key || typeof window === "undefined") {
    return false;
  }

  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setDedupeMarker(key) {
  if (!key || typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Tracking should never block the student experience.
  }
}

function reportTrackingFailure(eventType, error) {
  if (import.meta.env.DEV) {
    console.warn("Student activity event could not be saved.", {
      eventType,
      message: error?.message || "Unknown tracking error"
    });
  }
}

export async function logStudentActivityEvent({
  profile,
  eventType,
  taskId = null,
  submissionId = null,
  teacherId = null,
  metadata = {},
  dedupeKey = ""
}) {
  if (!profile?.id || profile.role !== "student" || !allowedEventTypes.has(eventType)) {
    return { ok: false, skipped: true };
  }

  const storageKey = getDedupeKey({ profile, eventType, dedupeKey });

  if (hasDedupeMarker(storageKey)) {
    return { ok: true, skipped: true };
  }

  try {
    const client = requireSupabaseClient();
    const { error } = await client.from("student_activity_events").insert({
      student_id: profile.id,
      teacher_id: teacherId || null,
      task_id: taskId || null,
      submission_id: submissionId || null,
      event_type: eventType,
      metadata: metadata || {}
    });

    if (error) {
      throw error;
    }

    setDedupeMarker(storageKey);
    return { ok: true, skipped: false };
  } catch (error) {
    reportTrackingFailure(eventType, error);
    return { ok: false, skipped: false, error };
  }
}

export function logStudentActivityEventQuietly(args) {
  void logStudentActivityEvent(args);
}
