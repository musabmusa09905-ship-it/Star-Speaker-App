import { requireSupabaseClient } from "./supabaseClient.js";
import { cleanWhatsAppInputValue } from "./whatsappReminders.js";
import { getStudentMotivationProfilesForStudents } from "./studentMotivationProfiles.js";

const profileColumns = [
  "id",
  "full_name",
  "email",
  "role",
  "status",
  "whatsapp_number",
  "whatsapp_opt_in",
  "created_at",
  "updated_at"
].join(", ");

const teacherStudentColumns = [
  "id",
  "teacher_id",
  "student_id",
  "active",
  "created_at"
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

const allowedRoles = new Set(["admin", "coordinator", "teacher", "student"]);
const allowedCreateRoles = new Set(["coordinator", "teacher", "student"]);
const allowedStatuses = new Set(["active", "pending", "inactive"]);

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not reach Supabase. Please check your connection.";
  }

  return message;
}

async function normalizeFunctionError(error) {
  if (!error) {
    return null;
  }

  const body = await readFunctionErrorBody(error);

  if (body?.error) {
    return body.error;
  }

  const message = normalizeError(error);

  if (message?.toLowerCase().includes("function not found")) {
    return "The admin-create-user Edge Function is not deployed yet. Deploy it or use the manual fallback.";
  }

  return message;
}

async function readFunctionErrorBody(error) {
  if (!error?.context?.json) {
    return null;
  }

  try {
    return await error.context.json();
  } catch {
    return null;
  }
}

function byId(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function isActive(profile) {
  return profile?.status === "active";
}

function cleanText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function cleanNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function attachLearningProfiles(users, learningProfiles) {
  const learningProfileByUserId = new Map(
    (learningProfiles || []).map((profile) => [profile.user_id, profile])
  );

  return (users || []).map((user) => ({
    ...user,
    learningProfile: learningProfileByUserId.get(user.id) || null
  }));
}

function attachMotivationProfiles(users, motivationProfilesByStudentId) {
  return (users || []).map((user) => ({
    ...user,
    motivationProfile: user.role === "student"
      ? motivationProfilesByStudentId.get(user.id) || null
      : null
  }));
}

async function fetchStudentProfiles(client, users) {
  const studentIds = (users || [])
    .filter((user) => user.role === "student")
    .map((user) => user.id);

  if (!studentIds.length) {
    return {
      data: [],
      error: null
    };
  }

  return client
    .from("student_profiles")
    .select(studentProfileColumns)
    .in("user_id", studentIds);
}

function buildStudentProfilePayload(userId, values) {
  return {
    user_id: userId,
    level: cleanText(values.level),
    main_goal: cleanText(values.main_goal),
    speaking_focus: cleanText(values.speaking_focus),
    pronunciation_focus: cleanText(values.pronunciation_focus),
    vocabulary_focus: cleanText(values.vocabulary_focus),
    practice_target: cleanText(values.practice_target),
    practice_duration_target: cleanNumber(values.practice_duration_target),
    preferred_practice_time: cleanText(values.preferred_practice_time),
    notes: cleanText(values.notes)
  };
}

function buildCreateUserPayload(values) {
  return {
    full_name: cleanText(values.full_name),
    email: cleanText(values.email),
    password: cleanText(values.password || values.temporary_password),
    temporary_password: cleanText(values.password || values.temporary_password),
    role: cleanText(values.role),
    status: cleanText(values.status),
    level: cleanText(values.level),
    main_goal: cleanText(values.main_goal),
    speaking_focus: cleanText(values.speaking_focus),
    pronunciation_focus: cleanText(values.pronunciation_focus),
    vocabulary_focus: cleanText(values.vocabulary_focus),
    practice_target: cleanText(values.practice_target),
    practice_duration_target: cleanNumber(values.practice_duration_target),
    preferred_practice_time: cleanText(values.preferred_practice_time),
    whatsapp_number: cleanWhatsAppInputValue(values.whatsapp_number),
    whatsapp_opt_in: Boolean(values.whatsapp_opt_in),
    notes: cleanText(values.notes),
    title: cleanText(values.title),
    bio: cleanText(values.bio)
  };
}

export async function getAdminUsersOverview() {
  try {
    const client = requireSupabaseClient();
    const [
      { data: users, error: usersError },
      { data: links, error: linksError }
    ] = await Promise.all([
      client.from("profiles").select(profileColumns).order("created_at", { ascending: false }),
      client.from("teacher_students").select(teacherStudentColumns).order("created_at", { ascending: false })
    ]);

    if (usersError || linksError) {
      return {
        users: [],
        activeTeachers: [],
        activeStudents: [],
        relationships: [],
        error: normalizeError(usersError || linksError)
      };
    }

    const { data: studentProfiles, error: studentProfilesError } = await fetchStudentProfiles(client, users || []);

    if (studentProfilesError) {
      return {
        users: [],
        activeTeachers: [],
        activeStudents: [],
        relationships: [],
        error: normalizeError(studentProfilesError)
      };
    }

    const studentIds = (users || [])
      .filter((item) => item.role === "student")
      .map((item) => item.id);
    const motivationProfilesResult = await getStudentMotivationProfilesForStudents({
      profile: {
        id: "admin",
        role: "admin"
      },
      studentIds
    });

    const usersWithLearningProfiles = attachLearningProfiles(users || [], studentProfiles || []);
    const usersWithMotivationProfiles = attachMotivationProfiles(
      usersWithLearningProfiles,
      motivationProfilesResult.profilesByStudentId
    );
    const profilesById = byId(usersWithMotivationProfiles);
    const relationships = (links || []).map((link) => ({
      ...link,
      teacher: profilesById.get(link.teacher_id) || null,
      student: profilesById.get(link.student_id) || null
    }));

    return {
      users: usersWithMotivationProfiles,
      activeTeachers: usersWithMotivationProfiles.filter((user) => user.role === "teacher" && isActive(user)),
      activeStudents: usersWithMotivationProfiles.filter((user) => user.role === "student" && isActive(user)),
      relationships,
      error: null
    };
  } catch (error) {
    return {
      users: [],
      activeTeachers: [],
      activeStudents: [],
      relationships: [],
      error: normalizeError(error)
    };
  }
}

export async function createUserWithAdminFunction(values) {
  try {
    const client = requireSupabaseClient();
    const role = cleanText(values.role);
    const status = cleanText(values.status) || "pending";
    const email = cleanText(values.email);
    const password = cleanText(values.password || values.temporary_password);

    if (!email) {
      return {
        profile: null,
        error: "Email is required."
      };
    }

    if (!password || password.length < 8) {
      return {
        profile: null,
        error: "Temporary password must be at least 8 characters."
      };
    }

    if (!allowedCreateRoles.has(role)) {
      return {
        profile: null,
        error: "Choose student, teacher, or coordinator for a new app user."
      };
    }

    if (!allowedStatuses.has(status)) {
      return {
        profile: null,
        error: "Choose a valid account status."
      };
    }

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (sessionError || !accessToken) {
      return {
        profile: null,
        error: "Your admin session token is missing. Sign out, sign in again, and try creating the user."
      };
    }

    const { data, error } = await client.functions.invoke("admin-create-user", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: buildCreateUserPayload({
        ...values,
        status
      })
    });

    if (error) {
      return {
        profile: null,
        error: await normalizeFunctionError(error)
      };
    }

    if (data?.error) {
      return {
        profile: null,
        error: data.error
      };
    }

    return {
      profile: data?.profile
        ? {
            ...data.profile,
            learningProfile: data.studentProfile || null
          }
        : null,
      user: data?.user || null,
      message: data?.message || "User created successfully.",
      error: null
    };
  } catch (error) {
    return {
      profile: null,
      error: normalizeError(error)
    };
  }
}

export async function testAdminCreateUserSetup() {
  try {
    const client = requireSupabaseClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (sessionError || !accessToken) {
      return {
        diagnostics: null,
        error: "Your admin session token is missing. Sign out, sign in again, and test setup again."
      };
    }

    const { data, error } = await client.functions.invoke("admin-create-user", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: {
        debug: true
      }
    });

    if (error) {
      const errorBody = await readFunctionErrorBody(error);
      return {
        diagnostics: errorBody?.diagnostics || null,
        error: errorBody?.error || normalizeError(error)
      };
    }

    if (data?.error) {
      return {
        diagnostics: data?.diagnostics || null,
        error: data.error
      };
    }

    return {
      diagnostics: data?.diagnostics || data || null,
      error: null
    };
  } catch (error) {
    return {
      diagnostics: null,
      error: normalizeError(error)
    };
  }
}

export async function createProfileForExistingAuthUser({ authUserId, values }) {
  try {
    const client = requireSupabaseClient();
    const profileId = cleanText(authUserId);
    const role = cleanText(values.role);
    const status = cleanText(values.status) || "pending";

    if (!profileId) {
      return {
        profile: null,
        error: "Paste the Supabase Auth user ID before connecting the profile."
      };
    }

    if (!allowedCreateRoles.has(role)) {
      return {
        profile: null,
        error: "Choose student, teacher, or coordinator for a new app user."
      };
    }

    if (!allowedStatuses.has(status)) {
      return {
        profile: null,
        error: "Choose a valid account status."
      };
    }

    const email = cleanText(values.email);

    if (!email) {
      return {
        profile: null,
        error: "Email is required to connect a profile."
      };
    }

    const { data: createdProfile, error: profileError } = await client
      .from("profiles")
      .insert({
        id: profileId,
        full_name: cleanText(values.full_name),
        email,
        role,
        status,
        whatsapp_number: role === "student" ? cleanWhatsAppInputValue(values.whatsapp_number) : null,
        whatsapp_opt_in: role === "student" ? Boolean(values.whatsapp_opt_in) : false
      })
      .select(profileColumns)
      .single();

    if (profileError) {
      const normalized = normalizeError(profileError);
      return {
        profile: null,
        error: normalized?.toLowerCase().includes("foreign key")
          ? "Create this user in Supabase Auth first, then connect the profile with the Auth user ID."
          : normalized
      };
    }

    let learningProfile = null;

    if (role === "student") {
      const { data, error } = await client
        .from("student_profiles")
        .upsert(buildStudentProfilePayload(profileId, values), { onConflict: "user_id" })
        .select(studentProfileColumns)
        .single();

      if (error) {
        return {
          profile: {
            ...createdProfile,
            learningProfile: null
          },
          error: normalizeError(error)
        };
      }

      learningProfile = data;
    }

    return {
      profile: {
        ...createdProfile,
        learningProfile
      },
      error: null
    };
  } catch (error) {
    return {
      profile: null,
      error: normalizeError(error)
    };
  }
}

export async function updateProfileFromAdmin({ profileId, values }) {
  try {
    const client = requireSupabaseClient();
    const role = cleanText(values.role);
    const status = cleanText(values.status);

    if (!profileId) {
      return {
        profile: null,
        error: "Choose a user before saving changes."
      };
    }

    if (!allowedRoles.has(role)) {
      return {
        profile: null,
        error: "Choose a valid role."
      };
    }

    if (!allowedStatuses.has(status)) {
      return {
        profile: null,
        error: "Choose a valid account status."
      };
    }

    const email = cleanText(values.email);

    if (!email) {
      return {
        profile: null,
        error: "Email is required."
      };
    }

    const { data: updatedProfile, error: profileError } = await client
      .from("profiles")
      .update({
        full_name: cleanText(values.full_name),
        email,
        role,
        status,
        whatsapp_number: role === "student" ? cleanWhatsAppInputValue(values.whatsapp_number) : null,
        whatsapp_opt_in: role === "student" ? Boolean(values.whatsapp_opt_in) : false
      })
      .eq("id", profileId)
      .select(profileColumns)
      .single();

    if (profileError) {
      return {
        profile: null,
        error: normalizeError(profileError)
      };
    }

    let learningProfile = null;

    if (role === "student") {
      const { data, error } = await client
        .from("student_profiles")
        .upsert(buildStudentProfilePayload(profileId, values), { onConflict: "user_id" })
        .select(studentProfileColumns)
        .single();

      if (error) {
        return {
          profile: {
            ...updatedProfile,
            learningProfile: null
          },
          error: normalizeError(error)
        };
      }

      learningProfile = data;
    }

    return {
      profile: {
        ...updatedProfile,
        learningProfile
      },
      error: null
    };
  } catch (error) {
    return {
      profile: null,
      error: normalizeError(error)
    };
  }
}

export async function linkStudentToTeacher({ teacherId, studentId }) {
  try {
    const client = requireSupabaseClient();

    if (!teacherId || !studentId) {
      return {
        relationship: null,
        error: "Choose both a teacher and a student before linking."
      };
    }

    if (teacherId === studentId) {
      return {
        relationship: null,
        error: "Teacher and student must be different users."
      };
    }

    const { data: selectedProfiles, error: profileError } = await client
      .from("profiles")
      .select(profileColumns)
      .in("id", [teacherId, studentId]);

    if (profileError) {
      return {
        relationship: null,
        error: normalizeError(profileError)
      };
    }

    const selectedById = byId(selectedProfiles || []);
    const teacher = selectedById.get(teacherId);
    const student = selectedById.get(studentId);

    if (teacher?.role !== "teacher" || teacher?.status !== "active") {
      return {
        relationship: null,
        error: "Choose an active teacher account."
      };
    }

    if (student?.role !== "student" || student?.status !== "active") {
      return {
        relationship: null,
        error: "Choose an active student account."
      };
    }

    const { data: existingLinks, error: existingError } = await client
      .from("teacher_students")
      .select(teacherStudentColumns)
      .eq("teacher_id", teacherId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (existingError) {
      return {
        relationship: null,
        error: normalizeError(existingError)
      };
    }

    const activeLink = (existingLinks || []).find((link) => link.active);

    if (activeLink) {
      return {
        relationship: activeLink,
        error: "This student is already linked to this teacher."
      };
    }

    const inactiveLink = (existingLinks || [])[0];

    if (inactiveLink) {
      const { data, error } = await client
        .from("teacher_students")
        .update({ active: true })
        .eq("id", inactiveLink.id)
        .select(teacherStudentColumns)
        .single();

      if (error) {
        return {
          relationship: null,
          error: normalizeError(error)
        };
      }

      return {
        relationship: data,
        error: null,
        message: "Existing teacher-student link reactivated."
      };
    }

    const { data, error } = await client
      .from("teacher_students")
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
        active: true
      })
      .select(teacherStudentColumns)
      .single();

    if (error) {
      return {
        relationship: null,
        error: normalizeError(error)
      };
    }

    return {
      relationship: data,
      error: null,
      message: "Student linked to teacher successfully."
    };
  } catch (error) {
    return {
      relationship: null,
      error: normalizeError(error)
    };
  }
}

export async function unlinkStudentFromTeacher(relationshipId) {
  try {
    const client = requireSupabaseClient();

    if (!relationshipId) {
      return {
        relationship: null,
        error: "Choose a teacher-student link before removing it."
      };
    }

    const { data, error } = await client
      .from("teacher_students")
      .update({ active: false })
      .eq("id", relationshipId)
      .select(teacherStudentColumns)
      .single();

    if (error) {
      return {
        relationship: null,
        error: normalizeError(error)
      };
    }

    return {
      relationship: data,
      error: null,
      message: "Teacher-student link removed."
    };
  } catch (error) {
    return {
      relationship: null,
      error: normalizeError(error)
    };
  }
}
