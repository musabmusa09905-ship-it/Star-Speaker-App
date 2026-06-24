import { requireSupabaseClient } from "./supabaseClient.js";

const submissionColumns = [
  "id",
  "assigned_task_id",
  "student_id",
  "audio_path",
  "duration_seconds",
  "reflection_text",
  "self_rating",
  "status",
  "submitted_at",
  "created_at",
  "updated_at"
].join(", ");

const taskColumns = [
  "id",
  "title",
  "task_type",
  "focus",
  "due_date",
  "status"
].join(", ");

const feedbackColumns = [
  "id",
  "submission_id",
  "assigned_task_id",
  "student_id",
  "teacher_id",
  "teacher_comment",
  "correction_note",
  "encouragement_note",
  "clarity_score",
  "confidence_score",
  "accuracy_score",
  "next_focus",
  "created_at",
  "updated_at"
].join(", ");
const VOICE_SUBMISSIONS_BUCKET = "voice-submissions";

function normalizeError(error) {
  if (!error) {
    return null;
  }

  return "Could not load feedback. Please try again.";
}

export async function getSubmissionsForStudent(studentId) {
  try {
    const client = requireSupabaseClient();
    const { data: submissions, error: submissionsError } = await client
      .from("submissions")
      .select(submissionColumns)
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false });

    if (submissionsError) {
      return {
        submissions: [],
        error: normalizeError(submissionsError)
      };
    }

    if (!submissions?.length) {
      return {
        submissions: [],
        error: null
      };
    }

    const taskIds = [...new Set(submissions.map((submission) => submission.assigned_task_id))];
    const submissionIds = submissions.map((submission) => submission.id);

    const { data: tasks, error: tasksError } = await client
      .from("assigned_tasks")
      .select(taskColumns)
      .in("id", taskIds);

    if (tasksError) {
      return {
        submissions: [],
        error: normalizeError(tasksError)
      };
    }

    const { data: feedback, error: feedbackError } = await client
      .from("feedback")
      .select(feedbackColumns)
      .in("submission_id", submissionIds)
      .order("created_at", { ascending: false });

    if (feedbackError) {
      return {
        submissions: [],
        error: normalizeError(feedbackError)
      };
    }

    const tasksById = new Map((tasks || []).map((task) => [task.id, task]));
    const feedbackBySubmissionId = new Map();

    (feedback || []).forEach((item) => {
      if (!feedbackBySubmissionId.has(item.submission_id)) {
        feedbackBySubmissionId.set(item.submission_id, item);
      }
    });

    return {
      submissions: submissions.map((submission) => ({
        ...submission,
        assignedTask: tasksById.get(submission.assigned_task_id) || null,
        feedback: feedbackBySubmissionId.get(submission.id) || null
      })),
      error: null
    };
  } catch (error) {
    return {
      submissions: [],
      error: normalizeError(error)
    };
  }
}

export async function getLatestSubmissionForTask({ studentId, assignedTaskId }) {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("submissions")
      .select(submissionColumns)
      .eq("student_id", studentId)
      .eq("assigned_task_id", assignedTaskId)
      .order("submitted_at", { ascending: false })
      .limit(1);

    if (error) {
      return {
        submission: null,
        error: normalizeError(error)
      };
    }

    return {
      submission: data?.[0] || null,
      error: null
    };
  } catch (error) {
    return {
      submission: null,
      error: normalizeError(error)
    };
  }
}

export async function createSubmissionPlaybackUrl({
  submission,
  currentStudentId,
  expiresInSeconds = 300
}) {
  try {
    const client = requireSupabaseClient();

    if (!submission?.audio_path) {
      return {
        signedUrl: "",
        error: "No recording file found for this submission."
      };
    }

    if (!currentStudentId || submission.student_id !== currentStudentId) {
      return {
        signedUrl: "",
        error: "You do not have access to this recording."
      };
    }

    const { data, error } = await client.storage
      .from(VOICE_SUBMISSIONS_BUCKET)
      .createSignedUrl(submission.audio_path, expiresInSeconds);

    if (error) {
      return {
        signedUrl: "",
        error: normalizeError(error)
      };
    }

    return {
      signedUrl: data?.signedUrl || "",
      error: data?.signedUrl ? null : "Could not load private playback. Please try again."
    };
  } catch (error) {
    return {
      signedUrl: "",
      error: normalizeError(error)
    };
  }
}
