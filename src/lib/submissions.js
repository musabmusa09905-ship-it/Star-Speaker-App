import { requireSupabaseClient } from "./supabaseClient.js";
import { dispatchInstantNotificationQuietly } from "./instantNotifications.js";

const VOICE_SUBMISSIONS_BUCKET = "voice-submissions";

function normalizeError(error) {
  if (!error) {
    return null;
  }

  return "The recording request could not be completed.";
}

function createSafeTimestamp(date = new Date()) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/:/g, "-");
}

export function createVoiceSubmissionPath(studentId, assignedTaskId, date = new Date()) {
  return `students/${studentId}/tasks/${assignedTaskId}/${createSafeTimestamp(date)}.webm`;
}

async function confirmStudentTask(client, assignedTaskId, studentId) {
  const { data, error } = await client
    .from("assigned_tasks")
    .select("id, student_id, status")
    .eq("id", assignedTaskId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    return {
      task: null,
      error: normalizeError(error)
    };
  }

  return {
    task: data || null,
    error: null
  };
}

async function markTaskSubmitted(client, assignedTaskId) {
  const { error } = await client.rpc("mark_own_assigned_task_submitted", {
    p_assigned_task_id: assignedTaskId
  });

  return normalizeError(error);
}

export async function submitVoiceRecording({
  assignedTaskId,
  studentId,
  audioBlob,
  durationSeconds,
  reflectionText,
  selfRating
}) {
  try {
    const client = requireSupabaseClient();

    if (!studentId) {
      return {
        ok: false,
        stage: "auth",
        message: "You must be logged in as a student to submit a recording."
      };
    }

    if (!assignedTaskId) {
      return {
        ok: false,
        stage: "task",
        message: "Choose a speaking task before submitting."
      };
    }

    if (!audioBlob?.size) {
      return {
        ok: false,
        stage: "recording",
        message: "Record your answer first."
      };
    }

    const taskResult = await confirmStudentTask(client, assignedTaskId, studentId);

    if (taskResult.error) {
      return {
        ok: false,
        stage: "access",
        message: "Could not verify this task. Please try again.",
        detail: taskResult.error
      };
    }

    if (!taskResult.task) {
      return {
        ok: false,
        stage: "access",
        message: "You do not have access to this task."
      };
    }

    if (!["assigned", "in_progress"].includes(taskResult.task.status)) {
      return {
        ok: false,
        stage: "task-status",
        message: "This task cannot accept another recording.",
        detail: "Submitted and reviewed tasks are locked until resubmission is added."
      };
    }

    const audioPath = createVoiceSubmissionPath(studentId, assignedTaskId);
    const uploadResult = await client.storage
      .from(VOICE_SUBMISSIONS_BUCKET)
      .upload(audioPath, audioBlob, {
        contentType: audioBlob.type || "audio/webm",
        upsert: false
      });

    if (uploadResult.error) {
      return {
        ok: false,
        stage: "upload",
        message: "Could not upload your recording. Please try again.",
        detail: "If this keeps happening, ask your teacher or school team to check private recording storage."
      };
    }

    const submittedAt = new Date().toISOString();
    const cleanReflection = reflectionText?.trim() || null;
    const cleanRating = Number.isInteger(selfRating) && selfRating >= 1 && selfRating <= 5
      ? selfRating
      : null;
    const cleanDuration = Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.round(durationSeconds)
      : null;

    const { data: submission, error: submissionError } = await client
      .from("submissions")
      .insert({
        assigned_task_id: assignedTaskId,
        student_id: studentId,
        audio_path: audioPath,
        audio_url: null,
        duration_seconds: cleanDuration,
        reflection_text: cleanReflection,
        self_rating: cleanRating,
        status: "submitted",
        submitted_at: submittedAt
      })
      .select("id, assigned_task_id, student_id, audio_path, status, submitted_at")
      .single();

    if (submissionError) {
      return {
        ok: false,
        stage: "submission",
        message: "Recording uploaded, but submission could not be saved. Please contact your teacher.",
        detail: "Your recording file was saved, but the submission record was not completed.",
        audioPath
      };
    }

    const taskUpdateError = await markTaskSubmitted(client, assignedTaskId);

    if (taskUpdateError) {
      return {
        ok: false,
        stage: "task-status",
        message: "Submission was saved, but the task status could not be updated. Please contact your teacher.",
        detail: "Your teacher can still check the submitted recording.",
        audioPath,
        submission
      };
    }

    dispatchInstantNotificationQuietly({
      eventType: "speaking_submitted",
      sourceId: submission.id
    });

    return {
      ok: true,
      audioPath,
      submission
    };
  } catch (error) {
    return {
      ok: false,
      stage: "unknown",
      message: "Could not submit your recording. Please try again.",
      detail: normalizeError(error)
    };
  }
}
