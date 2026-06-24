import { requireSupabaseClient } from "./supabaseClient.js";

export const motivationStyleOptions = [
  { value: "soft_encouragement", label: "Soft encouragement" },
  { value: "funny_push", label: "Funny push" },
  { value: "strict_kind", label: "Strict but kind" },
  { value: "emotional_reminder", label: "Emotional reminder" },
  { value: "challenge_mode", label: "Challenge mode" }
];

export const studentMotivationProfileColumns = [
  "id",
  "student_id",
  "teacher_id",
  "goal",
  "motivation_style",
  "personal_trigger",
  "strength_note",
  "struggle_note",
  "preferred_push",
  "avoid_note",
  "is_active",
  "created_at",
  "updated_at"
].join(", ");

const allowedMotivationStyles = new Set(motivationStyleOptions.map((option) => option.value));

function cleanText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function cleanNullableText(value) {
  const text = cleanText(value);
  return text || null;
}

function cleanMotivationStyle(value) {
  return allowedMotivationStyles.has(value) ? value : "soft_encouragement";
}

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);
  const lower = message.toLowerCase();

  if (lower.includes("student_motivation_profiles") || lower.includes("does not exist")) {
    return "Student Motivation Profiles need the latest database migration before they can be saved.";
  }

  if (lower.includes("permission denied") || lower.includes("row-level security")) {
    return "Student Motivation Profiles are blocked by database policies. Run the motivation profile migration and try again.";
  }

  if (lower.includes("failed to fetch")) {
    return "Could not reach Supabase. Please check your connection.";
  }

  return message;
}

function getTimestamp(row) {
  return new Date(row?.updated_at || row?.created_at || 0).getTime();
}

export function mapStudentMotivationProfile(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id || null,
    student_id: row.student_id || row.studentId || null,
    teacher_id: row.teacher_id || row.teacherId || null,
    goal: cleanText(row.goal),
    motivation_style: cleanMotivationStyle(row.motivation_style || row.motivationStyle),
    personal_trigger: cleanText(row.personal_trigger || row.personalTrigger),
    strength_note: cleanText(row.strength_note || row.strengthNote),
    struggle_note: cleanText(row.struggle_note || row.struggleNote),
    preferred_push: cleanText(row.preferred_push || row.preferredPush),
    avoid_note: cleanText(row.avoid_note || row.avoidNote),
    is_active: row.is_active !== undefined ? row.is_active !== false : row.isActive !== false,
    created_at: row.created_at || row.createdAt || null,
    updated_at: row.updated_at || row.updatedAt || null,
    studentId: row.student_id || row.studentId || null,
    teacherId: row.teacher_id || row.teacherId || null,
    motivationStyle: cleanMotivationStyle(row.motivation_style || row.motivationStyle),
    personalTrigger: cleanText(row.personal_trigger || row.personalTrigger),
    strengthNote: cleanText(row.strength_note || row.strengthNote),
    struggleNote: cleanText(row.struggle_note || row.struggleNote),
    preferredPush: cleanText(row.preferred_push || row.preferredPush),
    avoidNote: cleanText(row.avoid_note || row.avoidNote),
    isActive: row.is_active !== undefined ? row.is_active !== false : row.isActive !== false,
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
    hasProfile: Boolean(row.id)
  };
}

export function motivationProfileToForm(profile) {
  const mapped = mapStudentMotivationProfile(profile) || {};

  return {
    goal: mapped.goal || "",
    motivation_style: mapped.motivation_style || "soft_encouragement",
    personal_trigger: mapped.personal_trigger || "",
    strength_note: mapped.strength_note || "",
    struggle_note: mapped.struggle_note || "",
    preferred_push: mapped.preferred_push || "",
    avoid_note: mapped.avoid_note || ""
  };
}

function buildPayload({ actorProfile, studentId, values }) {
  return {
    student_id: studentId,
    teacher_id: actorProfile.id,
    goal: cleanNullableText(values.goal),
    motivation_style: cleanMotivationStyle(values.motivation_style),
    personal_trigger: cleanNullableText(values.personal_trigger),
    strength_note: cleanNullableText(values.strength_note),
    struggle_note: cleanNullableText(values.struggle_note),
    preferred_push: cleanNullableText(values.preferred_push),
    avoid_note: cleanNullableText(values.avoid_note),
    is_active: true
  };
}

export async function getStudentMotivationProfilesForStudents({ profile, studentIds = [] }) {
  try {
    const client = requireSupabaseClient();
    const uniqueStudentIds = [...new Set(studentIds.filter(Boolean))];

    if (!uniqueStudentIds.length || !["teacher", "admin"].includes(profile?.role)) {
      return {
        profilesByStudentId: new Map(),
        error: null
      };
    }

    let query = client
      .from("student_motivation_profiles")
      .select(studentMotivationProfileColumns)
      .in("student_id", uniqueStudentIds)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (profile.role === "teacher") {
      query = query.eq("teacher_id", profile.id);
    }

    const { data, error } = await query;

    if (error) {
      return {
        profilesByStudentId: new Map(),
        error: normalizeError(error)
      };
    }

    const profilesByStudentId = new Map();

    [...(data || [])]
      .sort((a, b) => getTimestamp(b) - getTimestamp(a))
      .forEach((row) => {
        if (!profilesByStudentId.has(row.student_id)) {
          profilesByStudentId.set(row.student_id, mapStudentMotivationProfile(row));
        }
      });

    return {
      profilesByStudentId,
      error: null
    };
  } catch (error) {
    return {
      profilesByStudentId: new Map(),
      error: normalizeError(error)
    };
  }
}

export async function saveStudentMotivationProfile({ actorProfile, studentId, values }) {
  try {
    const client = requireSupabaseClient();

    if (!["teacher", "admin"].includes(actorProfile?.role)) {
      return {
        motivationProfile: null,
        error: "Student Motivation Profiles can only be edited by teacher or admin accounts."
      };
    }

    if (!actorProfile?.id || !studentId) {
      return {
        motivationProfile: null,
        error: "Choose a student before saving a motivation profile."
      };
    }

    const payload = buildPayload({
      actorProfile,
      studentId,
      values
    });

    const { data, error } = await client
      .from("student_motivation_profiles")
      .upsert(payload, { onConflict: "student_id,teacher_id" })
      .select(studentMotivationProfileColumns)
      .single();

    if (error) {
      return {
        motivationProfile: null,
        error: normalizeError(error)
      };
    }

    return {
      motivationProfile: mapStudentMotivationProfile(data),
      error: null
    };
  } catch (error) {
    return {
      motivationProfile: null,
      error: normalizeError(error)
    };
  }
}
