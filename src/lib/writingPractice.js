import { requireSupabaseClient } from "./supabaseClient.js";
import { dispatchInstantNotificationQuietly } from "./instantNotifications.js";

const writingTaskColumns = [
  "id",
  "student_id",
  "assigned_by",
  "title",
  "prompt",
  "instructions",
  "level",
  "focus",
  "due_date",
  "min_words",
  "status",
  "created_at",
  "updated_at"
].join(", ");

const writingSubmissionColumns = [
  "id",
  "task_id",
  "student_id",
  "answer_text",
  "self_reflection",
  "teacher_feedback",
  "correction_note",
  "one_correction",
  "corrected_version",
  "encouragement_note",
  "encouragement",
  "clarity_score",
  "accuracy_score",
  "structure_score",
  "next_focus",
  "status",
  "submitted_at",
  "reviewed_at",
  "created_at",
  "updated_at"
].join(", ");

const studentProfileColumns = [
  "id",
  "full_name",
  "email",
  "status"
].join(", ");

function normalizeError(error, fallback = "Writing practice could not be loaded. Please try again.") {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);
  console.warn("Writing practice Supabase request failed:", error);

  if (message.toLowerCase().includes("duplicate key")) {
    return "This writing task already has a submission.";
  }

  if (message.toLowerCase().includes("permission denied")) {
    return "Please ask your teacher to check your writing access.";
  }

  if (message.toLowerCase().includes("failed to fetch")) {
    return fallback;
  }

  if (message.toLowerCase().includes("does not exist")) {
    return "Writing practice needs the latest database setup before this page can be used.";
  }

  return fallback;
}

function cleanText(value) {
  return value?.trim() || null;
}

function normalizeScore(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const score = Number(value);

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return null;
  }

  return score;
}

function byLatestSubmissionDate(a, b) {
  return new Date(b.submitted_at || b.created_at || 0) - new Date(a.submitted_at || a.created_at || 0);
}

function attachLatestSubmission(tasks, submissions) {
  const submissionsByTaskId = new Map();

  [...submissions].sort(byLatestSubmissionDate).forEach((submission) => {
    if (!submissionsByTaskId.has(submission.task_id)) {
      submissionsByTaskId.set(submission.task_id, submission);
    }
  });

  return tasks.map((task) => ({
    ...task,
    latestSubmission: submissionsByTaskId.get(task.id) || null
  }));
}

function buildWritingStats(tasks, submissions) {
  const submittedTaskIds = new Set(submissions.map((submission) => submission.task_id));
  const reviewedTaskIds = new Set(
    submissions
      .filter((submission) => submission.status === "reviewed")
      .map((submission) => submission.task_id)
  );

  tasks.forEach((task) => {
    if (["submitted", "reviewed"].includes(task.status)) {
      submittedTaskIds.add(task.id);
    }

    if (task.status === "reviewed") {
      reviewedTaskIds.add(task.id);
    }
  });

  return {
    totalTasks: tasks.length,
    assignedTasks: tasks.filter((task) => task.status === "assigned").length,
    submittedTasks: submittedTaskIds.size,
    reviewedTasks: reviewedTaskIds.size,
    waitingForReview: submissions.filter((submission) => submission.status === "submitted").length
  };
}

async function getAssignedStudentIds(client, teacherId) {
  const { data, error } = await client
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherId)
    .eq("active", true);

  if (error) {
    return {
      studentIds: [],
      error: normalizeError(error, "Could not load assigned students. Please try again.")
    };
  }

  return {
    studentIds: [...new Set((data || []).map((assignment) => assignment.student_id))],
    error: null
  };
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
      error: normalizeError(error, "Could not verify this student relationship.")
    };
  }

  return {
    isAssigned: Boolean(data),
    error: null
  };
}

export async function getWritingStudentOverview(studentId) {
  try {
    const client = requireSupabaseClient();
    const [
      { data: tasks, error: tasksError },
      { data: submissions, error: submissionsError }
    ] = await Promise.all([
      client
        .from("writing_tasks")
        .select(writingTaskColumns)
        .eq("student_id", studentId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      client
        .from("writing_submissions")
        .select(writingSubmissionColumns)
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })
    ]);

    if (tasksError || submissionsError) {
      return {
        tasks: [],
        submissions: [],
        stats: buildWritingStats([], []),
        error: normalizeError(tasksError || submissionsError)
      };
    }

    const safeTasks = tasks || [];
    const safeSubmissions = submissions || [];

    return {
      tasks: attachLatestSubmission(safeTasks, safeSubmissions),
      submissions: safeSubmissions,
      stats: buildWritingStats(safeTasks, safeSubmissions),
      error: null
    };
  } catch (error) {
    return {
      tasks: [],
      submissions: [],
      stats: buildWritingStats([], []),
      error: normalizeError(error)
    };
  }
}

export async function submitWritingAnswer({ studentId, task, values }) {
  try {
    const client = requireSupabaseClient();

    if (!studentId || task?.student_id !== studentId) {
      return {
        submission: null,
        error: "You do not have access to this writing task."
      };
    }

    if (task.status !== "assigned") {
      return {
        submission: null,
        error: "This writing task is already submitted or reviewed."
      };
    }

    const answerText = values.answer_text?.trim() || "";

    if (!answerText) {
      return {
        submission: null,
        error: "Write your answer before submitting."
      };
    }

    if (answerText.length > 3000) {
      return {
        submission: null,
        error: "Please keep your answer under 3000 characters for this MVP step."
      };
    }

    const { data: submission, error: submissionError } = await client
      .from("writing_submissions")
      .insert({
        task_id: task.id,
        student_id: studentId,
        answer_text: answerText,
        self_reflection: cleanText(values.self_reflection),
        status: "submitted",
        submitted_at: new Date().toISOString()
      })
      .select(writingSubmissionColumns)
      .single();

    if (submissionError) {
      return {
        submission: null,
        error: normalizeError(submissionError, "Could not submit your writing. Please try again.")
      };
    }

    const { error: taskError } = await client
      .from("writing_tasks")
      .update({
        status: "submitted"
      })
      .eq("id", task.id)
      .eq("student_id", studentId);

    if (taskError) {
      return {
        submission: null,
        error: `Your writing was saved, but the task status could not be updated. ${normalizeError(taskError)}`
      };
    }

    dispatchInstantNotificationQuietly({
      eventType: "writing_submitted",
      sourceId: submission.id
    });

    return {
      submission,
      error: null
    };
  } catch (error) {
    return {
      submission: null,
      error: normalizeError(error, "Could not submit your writing. Please try again.")
    };
  }
}

export async function getWritingManagementData(profile) {
  try {
    const client = requireSupabaseClient();
    const isAdmin = profile?.role === "admin";
    const isTeacher = profile?.role === "teacher";

    if (!isAdmin && !isTeacher) {
      return {
        students: [],
        tasks: [],
        submissions: [],
        error: null
      };
    }

    let studentIds = [];

    if (isTeacher) {
      const assignmentResult = await getAssignedStudentIds(client, profile.id);

      if (assignmentResult.error) {
        return {
          students: [],
          tasks: [],
          submissions: [],
          error: assignmentResult.error
        };
      }

      studentIds = assignmentResult.studentIds;

      if (!studentIds.length) {
        return {
          students: [],
          tasks: [],
          submissions: [],
          error: null
        };
      }
    }

    const studentsQuery = client
      .from("profiles")
      .select(studentProfileColumns)
      .eq("role", "student")
      .order("full_name", { ascending: true, nullsFirst: false });

    if (isTeacher) {
      studentsQuery.in("id", studentIds);
    }

    const tasksQuery = client
      .from("writing_tasks")
      .select(writingTaskColumns)
      .order("created_at", { ascending: false });

    const submissionsQuery = client
      .from("writing_submissions")
      .select(writingSubmissionColumns)
      .order("submitted_at", { ascending: false });

    if (isTeacher) {
      tasksQuery.in("student_id", studentIds);
      submissionsQuery.in("student_id", studentIds);
    }

    const [
      { data: students, error: studentsError },
      { data: tasks, error: tasksError },
      { data: submissions, error: submissionsError }
    ] = await Promise.all([studentsQuery, tasksQuery, submissionsQuery]);

    if (studentsError || tasksError || submissionsError) {
      return {
        students: [],
        tasks: [],
        submissions: [],
        error: normalizeError(studentsError || tasksError || submissionsError)
      };
    }

    const studentsById = new Map((students || []).map((student) => [student.id, student]));
    const tasksById = new Map((tasks || []).map((task) => [task.id, task]));

    return {
      students: students || [],
      tasks: attachLatestSubmission(tasks || [], submissions || []),
      submissions: (submissions || []).map((submission) => ({
        ...submission,
        task: tasksById.get(submission.task_id) || null,
        student: studentsById.get(submission.student_id) || null
      })),
      error: null
    };
  } catch (error) {
    return {
      students: [],
      tasks: [],
      submissions: [],
      error: normalizeError(error)
    };
  }
}

export async function createWritingTask({ profile, values }) {
  try {
    const client = requireSupabaseClient();
    const studentId = values.student_id;

    if (!studentId) {
      return {
        task: null,
        error: "Choose a student before assigning writing."
      };
    }

    if (!values.title?.trim() || !values.prompt?.trim()) {
      return {
        task: null,
        error: "Add a title and writing prompt before assigning."
      };
    }

    if (profile.role === "teacher") {
      const assignment = await verifyTeacherStudent(client, profile.id, studentId);

      if (assignment.error) {
        return {
          task: null,
          error: assignment.error
        };
      }

      if (!assignment.isAssigned) {
        return {
          task: null,
          error: "You can only assign writing to your assigned students."
        };
      }
    }

    const { data, error } = await client
      .from("writing_tasks")
      .insert({
        student_id: studentId,
        assigned_by: profile.id,
        title: values.title.trim(),
        prompt: values.prompt.trim(),
        instructions: cleanText(values.instructions),
        level: cleanText(values.level),
        focus: cleanText(values.focus),
        due_date: values.due_date || null,
        min_words: Number(values.min_words) > 0 ? Number(values.min_words) : 80,
        status: "assigned"
      })
      .select(writingTaskColumns)
      .single();

    if (error) {
      return {
        task: null,
        error: normalizeError(error, "Could not assign writing task. Please try again.")
      };
    }

    return {
      task: data,
      error: null
    };
  } catch (error) {
    return {
      task: null,
      error: normalizeError(error, "Could not assign writing task. Please try again.")
    };
  }
}

export async function reviewWritingSubmission({ profile, submission, values }) {
  try {
    const client = requireSupabaseClient();

    if (profile?.role === "teacher") {
      const assignment = await verifyTeacherStudent(client, profile.id, submission.student_id);

      if (assignment.error) {
        return {
          submission: null,
          error: assignment.error
        };
      }

      if (!assignment.isAssigned) {
        return {
          submission: null,
          error: "You can only review writing from your assigned students."
        };
      }
    }

    if (!["teacher", "admin"].includes(profile?.role)) {
      return {
        submission: null,
        error: "Writing review is only available for teacher and admin accounts."
      };
    }

    const oneCorrection = cleanText(values.one_correction) || cleanText(values.correction_note);
    const encouragement = cleanText(values.encouragement) || cleanText(values.encouragement_note);

    const { data, error } = await client
      .from("writing_submissions")
      .update({
        teacher_feedback: cleanText(values.teacher_feedback),
        correction_note: oneCorrection,
        one_correction: oneCorrection,
        corrected_version: cleanText(values.corrected_version),
        encouragement_note: encouragement,
        encouragement,
        clarity_score: normalizeScore(values.clarity_score),
        accuracy_score: normalizeScore(values.accuracy_score),
        structure_score: normalizeScore(values.structure_score),
        next_focus: cleanText(values.next_focus),
        status: "reviewed",
        reviewed_at: new Date().toISOString()
      })
      .eq("id", submission.id)
      .select(writingSubmissionColumns)
      .single();

    if (error) {
      return {
        submission: null,
        error: normalizeError(error, "Could not save writing feedback. Please try again.")
      };
    }

    if (submission.task_id) {
      await client
        .from("writing_tasks")
        .update({
          status: "reviewed"
        })
        .eq("id", submission.task_id);
    }

    dispatchInstantNotificationQuietly({
      eventType: "feedback_created",
      sourceType: "writing_submission",
      sourceId: data.id
    });

    return {
      submission: data,
      error: null
    };
  } catch (error) {
    return {
      submission: null,
      error: normalizeError(error, "Could not save writing feedback. Please try again.")
    };
  }
}
