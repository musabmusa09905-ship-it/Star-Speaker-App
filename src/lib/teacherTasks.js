import { requireSupabaseClient } from "./supabaseClient.js";

const assignedTaskColumns = [
  "id",
  "student_id",
  "teacher_id",
  "title",
  "description",
  "instructions",
  "task_type",
  "guiding_phrases",
  "checklist",
  "estimated_minutes",
  "level",
  "focus",
  "due_date",
  "status",
  "created_at",
  "updated_at"
].join(", ");

const profileColumns = [
  "id",
  "full_name",
  "email",
  "status"
].join(", ");

const submissionColumns = [
  "id",
  "assigned_task_id",
  "student_id",
  "status",
  "submitted_at",
  "created_at",
  "updated_at"
].join(", ");

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not load teacher tasks. Please try again.";
  }

  return message;
}

export async function getTeacherAssignedTasks(teacherId) {
  try {
    const client = requireSupabaseClient();

    const { data: assignments, error: assignmentsError } = await client
      .from("teacher_students")
      .select("student_id")
      .eq("teacher_id", teacherId)
      .eq("active", true);

    if (assignmentsError) {
      return {
        tasks: [],
        hasAssignedStudents: false,
        error: normalizeError(assignmentsError)
      };
    }

    const studentIds = [...new Set((assignments || []).map((item) => item.student_id))];

    if (!studentIds.length) {
      return {
        tasks: [],
        hasAssignedStudents: false,
        error: null
      };
    }

    const { data: tasks, error: tasksError } = await client
      .from("assigned_tasks")
      .select(assignedTaskColumns)
      .eq("teacher_id", teacherId)
      .in("student_id", studentIds)
      .order("created_at", { ascending: false });

    if (tasksError) {
      return {
        tasks: [],
        hasAssignedStudents: true,
        error: normalizeError(tasksError)
      };
    }

    if (!tasks?.length) {
      return {
        tasks: [],
        hasAssignedStudents: true,
        error: null
      };
    }

    const taskStudentIds = [...new Set(tasks.map((task) => task.student_id))];
    const taskIds = tasks.map((task) => task.id);

    const [
      { data: students, error: studentsError },
      { data: submissions, error: submissionsError }
    ] = await Promise.all([
      client.from("profiles").select(profileColumns).in("id", taskStudentIds),
      client
        .from("submissions")
        .select(submissionColumns)
        .in("assigned_task_id", taskIds)
        .order("submitted_at", { ascending: false })
    ]);

    if (studentsError || submissionsError) {
      return {
        tasks: [],
        hasAssignedStudents: true,
        error: normalizeError(studentsError || submissionsError)
      };
    }

    const studentsById = new Map((students || []).map((student) => [student.id, student]));
    const latestSubmissionByTaskId = new Map();

    (submissions || []).forEach((submission) => {
      if (!latestSubmissionByTaskId.has(submission.assigned_task_id)) {
        latestSubmissionByTaskId.set(submission.assigned_task_id, submission);
      }
    });

    return {
      tasks: tasks.map((task) => ({
        ...task,
        student: studentsById.get(task.student_id) || null,
        latestSubmission: latestSubmissionByTaskId.get(task.id) || null
      })),
      hasAssignedStudents: true,
      error: null
    };
  } catch (error) {
    return {
      tasks: [],
      hasAssignedStudents: false,
      error: normalizeError(error)
    };
  }
}
