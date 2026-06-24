import { requireSupabaseClient } from "./supabaseClient.js";
import { getBadgeSummary } from "./studentBadges.js";
import { mapWeeklyPlan } from "./weeklyFocus.js";
import { mapReminderPreferences, reminderPreferenceColumns } from "./studentReminders.js";
import { cleanWhatsAppInputValue } from "./whatsappReminders.js";
import { getStudentMotivationProfilesForStudents } from "./studentMotivationProfiles.js";

const profileColumns = [
  "id",
  "full_name",
  "email",
  "avatar_url",
  "whatsapp_number",
  "whatsapp_opt_in",
  "status"
].join(", ");

const studentProfileColumns = [
  "id",
  "user_id",
  "level",
  "main_goal",
  "speaking_focus",
  "pronunciation_focus",
  "vocabulary_focus",
  "practice_target",
  "practice_duration_target",
  "preferred_practice_time",
  "notes",
  "created_at",
  "updated_at"
].join(", ");

const assignedTaskColumns = [
  "id",
  "student_id",
  "teacher_id",
  "title",
  "task_type",
  "focus",
  "level",
  "due_date",
  "status",
  "created_at",
  "updated_at"
].join(", ");

const submissionColumns = [
  "id",
  "assigned_task_id",
  "student_id",
  "status",
  "submitted_at",
  "created_at"
].join(", ");

const feedbackColumns = [
  "id",
  "submission_id",
  "assigned_task_id",
  "student_id",
  "created_at"
].join(", ");

const weeklyPlanColumns = [
  "id",
  "student_id",
  "teacher_id",
  "week_start",
  "week_end",
  "weekly_focus",
  "notes",
  "status",
  "created_at",
  "updated_at"
].join(", ");

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not load teacher students. Please try again.";
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

function firstBy(items, key) {
  const map = new Map();

  items.forEach((item) => {
    const value = item[key];

    if (value && !map.has(value)) {
      map.set(value, item);
    }
  });

  return map;
}

export async function getTeacherStudentsOverview(teacherId) {
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
        hasAssignedStudents: false,
        error: normalizeError(assignmentsError)
      };
    }

    const studentIds = [...new Set((assignments || []).map((item) => item.student_id))];

    if (!studentIds.length) {
      return {
        students: [],
        hasAssignedStudents: false,
        error: null
      };
    }

    const [
      { data: profiles, error: profilesError },
      { data: learningProfiles, error: learningProfilesError },
      { data: tasks, error: tasksError },
      { data: submissions, error: submissionsError },
      { data: feedback, error: feedbackError },
      { data: weeklyPlans, error: weeklyPlansError },
      { data: reminderPreferences, error: reminderPreferencesError },
      motivationProfilesResult
    ] = await Promise.all([
      client.from("profiles").select(profileColumns).in("id", studentIds),
      client.from("student_profiles").select(studentProfileColumns).in("user_id", studentIds),
      client
        .from("assigned_tasks")
        .select(assignedTaskColumns)
        .eq("teacher_id", teacherId)
        .in("student_id", studentIds)
        .order("created_at", { ascending: false }),
      client
        .from("submissions")
        .select(submissionColumns)
        .in("student_id", studentIds)
        .order("submitted_at", { ascending: false }),
      client
        .from("feedback")
        .select(feedbackColumns)
        .in("student_id", studentIds)
        .order("created_at", { ascending: false }),
      client
        .from("weekly_plans")
        .select(weeklyPlanColumns)
        .eq("teacher_id", teacherId)
        .in("student_id", studentIds)
        .eq("status", "active")
        .order("week_start", { ascending: false })
        .order("created_at", { ascending: false }),
      client
        .from("student_reminder_preferences")
        .select(reminderPreferenceColumns)
        .in("student_id", studentIds),
      getStudentMotivationProfilesForStudents({
        profile: {
          id: teacherId,
          role: "teacher"
        },
        studentIds
      })
    ]);

    const firstError =
      profilesError ||
      learningProfilesError ||
      tasksError ||
      submissionsError ||
      feedbackError ||
      weeklyPlansError ||
      reminderPreferencesError;

    if (firstError) {
      return {
        students: [],
        hasAssignedStudents: true,
        error: normalizeError(firstError)
      };
    }

    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const learningProfileByUserId = new Map(
      (learningProfiles || []).map((profile) => [profile.user_id, profile])
    );
    const latestTaskByStudentId = firstBy(tasks || [], "student_id");
    const latestSubmissionByStudentId = firstBy(submissions || [], "student_id");
    const latestFeedbackByStudentId = firstBy(feedback || [], "student_id");
    const activeWeeklyFocusByStudentId = firstBy(weeklyPlans || [], "student_id");
    const reminderPreferencesByStudentId = new Map(
      (reminderPreferences || []).map((preferences) => [preferences.student_id, preferences])
    );
    const submissionsByStudentId = (submissions || []).reduce((map, submission) => {
      const current = map.get(submission.student_id) || [];
      current.push(submission);
      map.set(submission.student_id, current);
      return map;
    }, new Map());

    return {
      students: studentIds.map((studentId) => ({
        ...(profileById.get(studentId) || { id: studentId }),
        learningProfile: learningProfileByUserId.get(studentId) || null,
        latestTask: latestTaskByStudentId.get(studentId) || null,
        latestSubmission: latestSubmissionByStudentId.get(studentId) || null,
        latestFeedback: latestFeedbackByStudentId.get(studentId) || null,
        weeklyFocus: mapWeeklyPlan(activeWeeklyFocusByStudentId.get(studentId) || null),
        reminderPreferences: mapReminderPreferences(reminderPreferencesByStudentId.get(studentId) || null),
        motivationProfile: motivationProfilesResult.profilesByStudentId.get(studentId) || null,
        badgeSummary: getBadgeSummary(submissionsByStudentId.get(studentId) || [])
      })),
      hasAssignedStudents: true,
      error: null
    };
  } catch (error) {
    return {
      students: [],
      hasAssignedStudents: false,
      error: normalizeError(error)
    };
  }
}

export async function saveStudentLearningProfileForTeacher({ teacherId, studentId, values }) {
  try {
    const client = requireSupabaseClient();

    if (!teacherId || !studentId) {
      return {
        learningProfile: null,
        error: "Choose an assigned student before saving profile details."
      };
    }

    const assignment = await verifyTeacherStudent(client, teacherId, studentId);

    if (assignment.error) {
      return {
        learningProfile: null,
        error: assignment.error
      };
    }

    if (!assignment.isAssigned) {
      return {
        learningProfile: null,
        error: "You can only edit profiles for your assigned students."
      };
    }

    const cleanText = (value) => value?.trim() || null;
    const practiceDurationTarget = values.practice_duration_target
      ? Math.round(Number(values.practice_duration_target))
      : null;

    if (practiceDurationTarget !== null && (!Number.isFinite(practiceDurationTarget) || practiceDurationTarget <= 0)) {
      return {
        learningProfile: null,
        error: "Practice duration target must be a positive number."
      };
    }

    const payload = {
      user_id: studentId,
      level: cleanText(values.level),
      main_goal: cleanText(values.main_goal),
      speaking_focus: cleanText(values.speaking_focus),
      pronunciation_focus: cleanText(values.pronunciation_focus),
      vocabulary_focus: cleanText(values.vocabulary_focus),
      practice_target: cleanText(values.practice_target),
      practice_duration_target: practiceDurationTarget,
      preferred_practice_time: cleanText(values.preferred_practice_time),
      notes: cleanText(values.notes)
    };
    const profilePayload = {
      whatsapp_number: cleanWhatsAppInputValue(values.whatsapp_number),
      whatsapp_opt_in: Boolean(values.whatsapp_opt_in)
    };

    const { data: updatedProfile, error: profileUpdateError } = await client
      .from("profiles")
      .update(profilePayload)
      .eq("id", studentId)
      .select(profileColumns)
      .single();

    if (profileUpdateError) {
      return {
        learningProfile: null,
        profile: null,
        error: normalizeError(profileUpdateError)
      };
    }

    const { data: existingProfile, error: existingError } = await client
      .from("student_profiles")
      .select("id")
      .eq("user_id", studentId)
      .maybeSingle();

    if (existingError) {
      return {
        learningProfile: null,
        error: normalizeError(existingError)
      };
    }

    const query = existingProfile
      ? client
          .from("student_profiles")
          .update(payload)
          .eq("user_id", studentId)
          .select(studentProfileColumns)
          .single()
      : client
          .from("student_profiles")
          .insert(payload)
          .select(studentProfileColumns)
          .single();

    const { data, error } = await query;

    if (error) {
      return {
        learningProfile: null,
        error: normalizeError(error)
      };
    }

    return {
      learningProfile: data,
      profile: updatedProfile,
      error: null
    };
  } catch (error) {
    return {
      learningProfile: null,
      profile: null,
      error: normalizeError(error)
    };
  }
}
