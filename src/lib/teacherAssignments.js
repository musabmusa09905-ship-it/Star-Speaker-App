import { requireSupabaseClient } from "./supabaseClient.js";

const studentProfileColumns = [
  "user_id",
  "level",
  "main_goal",
  "speaking_focus",
  "pronunciation_focus",
  "vocabulary_focus",
  "practice_target",
  "practice_duration_target",
  "preferred_practice_time",
  "notes"
].join(", ");

const profileColumns = [
  "id",
  "full_name",
  "email",
  "status"
].join(", ");

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not load assigned students. Please try again.";
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

export async function getAssignedStudentsForTeacher(teacherId) {
  try {
    const client = requireSupabaseClient();
    const { data: assignments, error: assignmentsError } = await client
      .from("teacher_students")
      .select("student_id")
      .eq("teacher_id", teacherId)
      .eq("active", true);

    if (assignmentsError) {
      return {
        students: [],
        error: normalizeError(assignmentsError)
      };
    }

    const studentIds = [...new Set((assignments || []).map((item) => item.student_id))];

    if (!studentIds.length) {
      return {
        students: [],
        error: null
      };
    }

    const [
      { data: profiles, error: profilesError },
      { data: learningProfiles, error: learningProfilesError }
    ] = await Promise.all([
      client.from("profiles").select(profileColumns).in("id", studentIds),
      client.from("student_profiles").select(studentProfileColumns).in("user_id", studentIds)
    ]);

    if (profilesError || learningProfilesError) {
      return {
        students: [],
        error: normalizeError(profilesError || learningProfilesError)
      };
    }

    const learningProfileByUserId = new Map(
      (learningProfiles || []).map((profile) => [profile.user_id, profile])
    );

    return {
      students: (profiles || []).map((profile) => ({
        ...profile,
        learningProfile: learningProfileByUserId.get(profile.id) || null
      })),
      error: null
    };
  } catch (error) {
    return {
      students: [],
      error: normalizeError(error)
    };
  }
}

export async function createAssignedTaskForTeacher({ teacherId, values }) {
  try {
    const client = requireSupabaseClient();
    const studentId = values.student_id;

    if (!teacherId || !studentId) {
      return {
        task: null,
        error: "Choose an assigned student before creating a task."
      };
    }

    const assignment = await verifyTeacherStudent(client, teacherId, studentId);

    if (assignment.error) {
      return {
        task: null,
        error: assignment.error
      };
    }

    if (!assignment.isAssigned) {
      return {
        task: null,
        error: "You can only assign tasks to your assigned students."
      };
    }

    const cleanText = (value) => value?.trim() || null;
    const cleanArray = (items) => {
      if (!Array.isArray(items) || !items.length) {
        return null;
      }

      return items;
    };

    const { data, error } = await client
      .from("assigned_tasks")
      .insert({
        student_id: studentId,
        teacher_id: teacherId,
        title: values.title.trim(),
        description: cleanText(values.description),
        task_type: values.task_type,
        instructions: cleanText(values.instructions),
        guiding_phrases: cleanArray(values.guiding_phrases),
        checklist: cleanArray(values.checklist),
        estimated_minutes: values.estimated_minutes,
        level: cleanText(values.level),
        focus: cleanText(values.focus),
        due_date: values.due_date || null,
        status: "assigned"
      })
      .select("id, student_id, teacher_id, title, due_date, status, created_at")
      .single();

    if (error) {
      return {
        task: null,
        error: normalizeError(error)
      };
    }

    return {
      task: data,
      error: null
    };
  } catch (error) {
    return {
      task: null,
      error: normalizeError(error)
    };
  }
}
