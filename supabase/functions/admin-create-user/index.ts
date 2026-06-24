import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const functionName = "admin-create-user";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const allowedRoles = new Set(["student", "teacher", "coordinator"]);
const allowedStatuses = new Set(["active", "pending", "inactive"]);

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

const teacherProfileColumns = [
  "id",
  "user_id",
  "title",
  "bio",
  "active",
  "created_at",
  "updated_at"
].join(", ");

type Diagnostics = {
  functionName: string;
  hasAuthHeader: boolean;
  callerUserResolved: boolean;
  callerUserIdExists: boolean;
  serviceRoleSecretPresent: boolean;
  serviceRoleSecretLooksLikeJwt: boolean;
  serviceRoleClientProfileReadSucceeded: boolean;
  adminProfileFound: boolean;
  adminRoleValue: string | null;
  adminStatusValue: string | null;
  projectUrlUsed: string | null;
  errorStage: string | null;
  errorMessage: string | null;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function cleanText(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function cleanNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeError(error: unknown) {
  if (!error) {
    return "Unknown error.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }

  return String(error);
}

function getJwtPayload(token: string | null) {
  try {
    const payload = token?.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );
    return JSON.parse(atob(paddedPayload));
  } catch {
    return null;
  }
}

function getJwtRole(token: string | null) {
  const payload = getJwtPayload(token);
  return typeof payload?.role === "string" ? payload.role : null;
}

function createDiagnostics({
  authHeader,
  serviceRoleKey,
  supabaseUrl
}: {
  authHeader: string;
  serviceRoleKey: string | undefined;
  supabaseUrl: string | undefined;
}): Diagnostics {
  return {
    functionName,
    hasAuthHeader: Boolean(authHeader),
    callerUserResolved: false,
    callerUserIdExists: false,
    serviceRoleSecretPresent: Boolean(serviceRoleKey),
    serviceRoleSecretLooksLikeJwt: Boolean(getJwtPayload(serviceRoleKey || null)),
    serviceRoleClientProfileReadSucceeded: false,
    adminProfileFound: false,
    adminRoleValue: null,
    adminStatusValue: null,
    projectUrlUsed: supabaseUrl || null,
    errorStage: null,
    errorMessage: null
  };
}

function diagnosticError(
  status: number,
  error: string,
  diagnostics: Diagnostics,
  stage: string,
  detail?: string
) {
  diagnostics.errorStage = stage;
  diagnostics.errorMessage = detail || error;

  return jsonResponse(status, {
    error,
    diagnostics
  });
}

function standardOrDiagnosticError({
  debug,
  status,
  error,
  diagnostics,
  stage,
  detail
}: {
  debug: boolean;
  status: number;
  error: string;
  diagnostics: Diagnostics;
  stage: string;
  detail?: string;
}) {
  if (debug) {
    return diagnosticError(status, error, diagnostics, stage, detail);
  }

  return jsonResponse(status, { error });
}

function buildStudentProfilePayload(userId: string, body: Record<string, unknown>) {
  return {
    user_id: userId,
    level: cleanText(body.level),
    main_goal: cleanText(body.main_goal),
    speaking_focus: cleanText(body.speaking_focus),
    pronunciation_focus: cleanText(body.pronunciation_focus),
    vocabulary_focus: cleanText(body.vocabulary_focus),
    practice_target: cleanText(body.practice_target),
    practice_duration_target: cleanNumber(body.practice_duration_target),
    preferred_practice_time: cleanText(body.preferred_practice_time),
    notes: cleanText(body.notes)
  };
}

function buildTeacherProfilePayload(userId: string, body: Record<string, unknown>) {
  return {
    user_id: userId,
    title: cleanText(body.title),
    bio: cleanText(body.bio),
    active: true
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Use POST to create an app user." });
  }

  let body: Record<string, unknown> = {};
  let bodyParseError: string | null = null;

  try {
    body = await req.json();
  } catch (error) {
    bodyParseError = normalizeError(error);
  }

  const debug = body.debug === true;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("ADMIN_CREATE_USER_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") || "";
  const authToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const diagnostics = createDiagnostics({
    authHeader,
    serviceRoleKey,
    supabaseUrl
  });

  if (bodyParseError) {
    return standardOrDiagnosticError({
      debug,
      status: 400,
      error: "Send a valid JSON request body.",
      diagnostics,
      stage: "parse_request_body",
      detail: bodyParseError
    });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return standardOrDiagnosticError({
      debug,
      status: 500,
      error: "Admin user creation is not configured on the server.",
      diagnostics,
      stage: "read_builtin_supabase_env",
      detail: "SUPABASE_URL or SUPABASE_ANON_KEY is missing in the Edge Function runtime."
    });
  }

  if (!serviceRoleKey) {
    return standardOrDiagnosticError({
      debug,
      status: 500,
      error: "Missing ADMIN_CREATE_USER_SERVICE_ROLE_KEY in the Edge Function secrets.",
      diagnostics,
      stage: "read_service_role_secret"
    });
  }

  if (getJwtRole(serviceRoleKey) !== "service_role") {
    return standardOrDiagnosticError({
      debug,
      status: 500,
      error: "ADMIN_CREATE_USER_SERVICE_ROLE_KEY is not a valid Supabase service role key for this project.",
      diagnostics,
      stage: "validate_service_role_secret",
      detail: "The configured secret is not a JWT with role service_role."
    });
  }

  if (!authHeader) {
    return standardOrDiagnosticError({
      debug,
      status: 401,
      error: "Missing Authorization bearer token. Sign in as an admin and try again.",
      diagnostics,
      stage: "read_authorization_header"
    });
  }

  if (!authToken || authToken === authHeader) {
    return standardOrDiagnosticError({
      debug,
      status: 401,
      error: "Invalid Authorization header. Expected a Bearer token.",
      diagnostics,
      stage: "parse_authorization_header"
    });
  }

  const sessionClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const {
    data: { user: caller },
    error: callerError
  } = await sessionClient.auth.getUser(authToken);

  diagnostics.callerUserResolved = Boolean(caller);
  diagnostics.callerUserIdExists = Boolean(caller?.id);

  if (callerError || !caller) {
    return standardOrDiagnosticError({
      debug,
      status: 401,
      error: "Invalid or expired admin session token. Sign in again and retry.",
      diagnostics,
      stage: "verify_caller_token",
      detail: normalizeError(callerError)
    });
  }

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from("profiles")
    .select("id, role, status")
    .eq("id", caller.id)
    .maybeSingle();

  diagnostics.serviceRoleClientProfileReadSucceeded = !callerProfileError;
  diagnostics.adminProfileFound = Boolean(callerProfile);
  diagnostics.adminRoleValue = typeof callerProfile?.role === "string" ? callerProfile.role : null;
  diagnostics.adminStatusValue = typeof callerProfile?.status === "string" ? callerProfile.status : null;

  if (callerProfileError) {
    return standardOrDiagnosticError({
      debug,
      status: 500,
      error: "Database permission/read failure while reading public.profiles with the service-role client.",
      diagnostics,
      stage: "read_admin_profile_with_service_role_client",
      detail: normalizeError(callerProfileError)
    });
  }

  if (!callerProfile) {
    return standardOrDiagnosticError({
      debug,
      status: 403,
      error: "No public.profiles row exists for this signed-in user.",
      diagnostics,
      stage: "find_admin_profile"
    });
  }

  if (!["admin", "coordinator"].includes(callerProfile.role)) {
    return standardOrDiagnosticError({
      debug,
      status: 403,
      error: `This profile role is '${callerProfile.role || "unknown"}', not 'admin' or 'coordinator'.`,
      diagnostics,
      stage: "check_admin_role"
    });
  }

  if (callerProfile.status !== "active") {
    return standardOrDiagnosticError({
      debug,
      status: 403,
      error: `This admin profile status is '${callerProfile.status || "unknown"}', not 'active'.`,
      diagnostics,
      stage: "check_admin_status"
    });
  }

  if (debug) {
    return jsonResponse(200, {
      diagnostics
    });
  }

  const email = cleanText(body.email)?.toLowerCase();
  const fullName = cleanText(body.full_name);
  const role = cleanText(body.role);
  const status = cleanText(body.status) || "pending";
  const password = cleanText(body.password) || cleanText(body.temporary_password);

  if (!email) {
    return jsonResponse(400, { error: "Email is required." });
  }

  if (!password || password.length < 8) {
    return jsonResponse(400, {
      error: "Temporary password must be at least 8 characters."
    });
  }

  if (!role || !allowedRoles.has(role)) {
    return jsonResponse(400, {
      error: "Role must be student, teacher, or coordinator."
    });
  }

  if (callerProfile.role === "coordinator" && role !== "student") {
    return jsonResponse(403, {
      error: "Coordinators can create student accounts only."
    });
  }

  if (!allowedStatuses.has(status)) {
    return jsonResponse(400, {
      error: "Status must be active, pending, or inactive."
    });
  }

  const { data: authResult, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role
    }
  });

  if (authError || !authResult.user) {
    return jsonResponse(400, {
      error: normalizeError(authError) || "Could not create Auth user."
    });
  }

  const createdUser = authResult.user;

  const rollbackAuthUser = async () => {
    await adminClient.auth.admin.deleteUser(createdUser.id);
  };

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: createdUser.id,
        full_name: fullName,
        email,
        role,
        status,
        whatsapp_number: role === "student" ? cleanText(body.whatsapp_number) : null,
        whatsapp_opt_in: role === "student" ? Boolean(body.whatsapp_opt_in) : false
      },
      { onConflict: "id" }
    )
    .select(profileColumns)
    .single();

  if (profileError || !profile) {
    await rollbackAuthUser();
    return jsonResponse(500, {
      error: `Auth user was created, but the profile could not be saved: ${normalizeError(profileError)}`
    });
  }

  let studentProfile = null;
  let teacherProfile = null;

  if (role === "student") {
    const { data, error } = await adminClient
      .from("student_profiles")
      .upsert(buildStudentProfilePayload(createdUser.id, body), { onConflict: "user_id" })
      .select(studentProfileColumns)
      .single();

    if (error) {
      await rollbackAuthUser();
      return jsonResponse(500, {
        error: `Auth user was created, but the student profile could not be saved: ${normalizeError(error)}`
      });
    }

    studentProfile = data;
  }

  if (role === "teacher") {
    const { data, error } = await adminClient
      .from("teacher_profiles")
      .upsert(buildTeacherProfilePayload(createdUser.id, body), { onConflict: "user_id" })
      .select(teacherProfileColumns)
      .single();

    if (error) {
      await rollbackAuthUser();
      return jsonResponse(500, {
        error: `Auth user was created, but the teacher profile could not be saved: ${normalizeError(error)}`
      });
    }

    teacherProfile = data;
  }

  return jsonResponse(200, {
    message: "User created successfully.",
    user: {
      id: createdUser.id,
      email: createdUser.email
    },
    profile,
    studentProfile,
    teacherProfile
  });
});
