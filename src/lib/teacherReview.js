import { requireSupabaseClient } from "./supabaseClient.js";
import { dispatchInstantNotificationQuietly } from "./instantNotifications.js";

const VOICE_SUBMISSIONS_BUCKET = "voice-submissions";

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

const profileColumns = [
  "id",
  "full_name",
  "email"
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

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not load teacher review data. Please try again.";
  }

  return message;
}

async function verifyTeacherStudent(client, teacherId, studentId) {
  const { data, error } = await client
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    return {
      isAssigned: false,
      error: normalizeError(error)
    };
  }

  return {
    isAssigned: Boolean(data),
    error: null
  };
}

export async function getTeacherReviewSubmissions(teacherId) {
  try {
    const client = requireSupabaseClient();
    const { data: assignments, error: assignmentsError } = await client
      .from("teacher_students")
      .select("student_id")
      .eq("teacher_id", teacherId)
      .eq("active", true);

    if (assignmentsError) {
      return {
        submissions: [],
        error: normalizeError(assignmentsError)
      };
    }

    const studentIds = [...new Set((assignments || []).map((item) => item.student_id))];

    if (!studentIds.length) {
      return {
        submissions: [],
        error: null
      };
    }

    const { data: submissions, error: submissionsError } = await client
      .from("submissions")
      .select(submissionColumns)
      .in("student_id", studentIds)
      .in("status", ["submitted", "reviewed"])
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

    const [
      { data: students, error: studentsError },
      { data: tasks, error: tasksError },
      { data: feedback, error: feedbackError }
    ] = await Promise.all([
      client.from("profiles").select(profileColumns).in("id", studentIds),
      client.from("assigned_tasks").select(taskColumns).in("id", taskIds),
      client.from("feedback").select(feedbackColumns).in("submission_id", submissionIds).order("created_at", { ascending: false })
    ]);

    if (studentsError || tasksError || feedbackError) {
      return {
        submissions: [],
        error: normalizeError(studentsError || tasksError || feedbackError)
      };
    }

    const studentsById = new Map((students || []).map((student) => [student.id, student]));
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
        student: studentsById.get(submission.student_id) || null,
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

export async function createTeacherPlaybackUrl({
  submission,
  teacherId,
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

    const assignment = await verifyTeacherStudent(client, teacherId, submission.student_id);

    if (assignment.error) {
      return {
        signedUrl: "",
        error: assignment.error
      };
    }

    if (!assignment.isAssigned) {
      return {
        signedUrl: "",
        error: "You do not have access to this student recording."
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
      error: data?.signedUrl ? null : "Could not load private playback."
    };
  } catch (error) {
    return {
      signedUrl: "",
      error: normalizeError(error)
    };
  }
}

export async function submitTeacherFeedback({ teacherId, submission, values }) {
  try {
    const client = requireSupabaseClient();

    if (!teacherId) {
      return {
        feedback: null,
        error: "You must be logged in as a teacher to submit feedback."
      };
    }

    const assignment = await verifyTeacherStudent(client, teacherId, submission.student_id);

    if (assignment.error) {
      return {
        feedback: null,
        error: assignment.error
      };
    }

    if (!assignment.isAssigned) {
      return {
        feedback: null,
        error: "You do not have access to this student."
      };
    }

    const cleanScore = (score) => {
      const value = Number(score);
      return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
    };
    const cleanText = (value) => value?.trim() || null;

    const { data: feedback, error: feedbackError } = await client
      .from("feedback")
      .insert({
        submission_id: submission.id,
        assigned_task_id: submission.assigned_task_id,
        student_id: submission.student_id,
        teacher_id: teacherId,
        teacher_comment: cleanText(values.teacher_comment),
        correction_note: cleanText(values.correction_note),
        encouragement_note: cleanText(values.encouragement_note),
        clarity_score: cleanScore(values.clarity_score),
        confidence_score: cleanScore(values.confidence_score),
        accuracy_score: cleanScore(values.accuracy_score),
        next_focus: cleanText(values.next_focus)
      })
      .select(feedbackColumns)
      .single();

    if (feedbackError) {
      return {
        feedback: null,
        error: normalizeError(feedbackError)
      };
    }

    const { error: reviewStatusError } = await client.rpc("mark_teacher_review_complete", {
      p_submission_id: submission.id
    });

    if (reviewStatusError) {
      return {
        feedback: null,
        error: `Feedback was saved, but review status could not be updated. ${normalizeError(reviewStatusError)}`
      };
    }

    dispatchInstantNotificationQuietly({
      eventType: "feedback_created",
      sourceId: feedback.id
    });

    return {
      feedback,
      error: null
    };
  } catch (error) {
    return {
      feedback: null,
      error: normalizeError(error)
    };
  }
}
