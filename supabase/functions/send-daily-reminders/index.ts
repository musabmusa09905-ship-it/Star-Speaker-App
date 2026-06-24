import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-reminder-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const reminderType = "missed_daily_practice";
const defaultTimezone = "Europe/Istanbul";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
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

function cleanText(value: unknown, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }

  const trimmed = String(value).trim();
  return trimmed || fallback;
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

function formatLocalDate(date: Date, timeZone = defaultTimezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset"
  }).formatToParts(date);
  const value = parts.find((part) => part.type === "timeZoneName")?.value || "GMT+0";
  const match = value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * ((hours * 60) + minutes);
}

function zonedDateStartToUtcIso(dateString: string, timeZone = defaultTimezone) {
  const utcGuess = new Date(`${dateString}T00:00:00.000Z`);
  const offset = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset * 60 * 1000).toISOString();
}

function getUtcRangeForLocalDate(dateString: string, timeZone = defaultTimezone) {
  const nextDate = addDays(dateString, 1);
  return {
    start: zonedDateStartToUtcIso(dateString, timeZone),
    end: zonedDateStartToUtcIso(nextDate, timeZone)
  };
}

function firstName(fullName: string | null | undefined, email: string | null | undefined) {
  const name = cleanText(fullName, "");

  if (name) {
    return name.split(/\s+/)[0];
  }

  return cleanText(email, "there").split("@")[0] || "there";
}

function buildPracticeUrl(appUrl: string) {
  return `${appUrl.replace(/\/+$/, "")}/practice`;
}

function buildEmail({
  studentName,
  tasks,
  appUrl
}: {
  studentName: string;
  tasks: Array<{ title: string; kind: string }>;
  appUrl: string;
}) {
  const practiceUrl = buildPracticeUrl(appUrl);
  const taskList = tasks.length
    ? tasks.map((task) => `- ${task.title} (${task.kind})`).join("\n")
    : "- Today's practice task";
  const taskItems = tasks.length
    ? tasks.map((task) => `<li><strong>${task.title}</strong> <span style="color:#6b7280;">${task.kind}</span></li>`).join("")
    : "<li><strong>Today's practice task</strong></li>";

  return {
    subject: "A gentle reminder for today's English habit",
    text:
      `Hi ${studentName},\n\n` +
      "Your Heart of English practice is still waiting for today. One short focused task is enough to protect the habit.\n\n" +
      `${taskList}\n\n` +
      `Open your practice page: ${practiceUrl}\n\n` +
      "Keep it simple. Speak or write one honest answer, then stop. Showing up counts.",
    html:
      `<div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#18181b;max-width:560px;">` +
      `<p>Hi ${studentName},</p>` +
      `<p>Your <strong>Heart of English</strong> practice is still waiting for today. One short focused task is enough to protect the habit.</p>` +
      `<ul>${taskItems}</ul>` +
      `<p><a href="${practiceUrl}" style="display:inline-block;background:#b0122d;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700;">Open Practice</a></p>` +
      `<p style="color:#52525b;">Keep it simple. Speak or write one honest answer, then stop. Showing up counts.</p>` +
      `</div>`
  };
}

async function requireAuthorizedRunner({
  req,
  supabaseUrl,
  supabaseAnonKey,
  serviceClient,
  reminderSecret
}: {
  req: Request;
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceClient: ReturnType<typeof createClient>;
  reminderSecret: string;
}) {
  const requestSecret = req.headers.get("x-reminder-secret") || "";

  if (reminderSecret && requestSecret && requestSecret === reminderSecret) {
    return { ok: true, error: null };
  }

  const token = getBearerToken(req);

  if (!token) {
    return {
      ok: false,
      error: jsonResponse(401, {
        error: "Missing bearer token or x-reminder-secret header."
      })
    };
  }

  const sessionClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const {
    data: { user },
    error: userError
  } = await sessionClient.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false,
      error: jsonResponse(401, {
        error: "Invalid or expired bearer token."
      })
    };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      error: jsonResponse(500, {
        error: "Could not verify admin permissions for reminder run.",
        detail: normalizeError(profileError)
      })
    };
  }

  if (!profile) {
    return {
      ok: false,
      error: jsonResponse(403, {
        error: "No profile row exists for this signed-in user."
      })
    };
  }

  if (profile.role !== "admin" || profile.status !== "active") {
    return {
      ok: false,
      error: jsonResponse(403, {
        error: "Only active admin accounts can manually run reminder emails."
      })
    };
  }

  return { ok: true, error: null };
}

async function hasCompletedToday({
  serviceClient,
  studentId,
  range
}: {
  serviceClient: ReturnType<typeof createClient>;
  studentId: string;
  range: { start: string; end: string };
}) {
  const { data: speakingRows, error: speakingError } = await serviceClient
    .from("submissions")
    .select("id")
    .eq("student_id", studentId)
    .gte("submitted_at", range.start)
    .lt("submitted_at", range.end)
    .in("status", ["submitted", "reviewed"])
    .limit(1);

  if (speakingError) {
    throw new Error(`Could not read speaking submissions: ${normalizeError(speakingError)}`);
  }

  if ((speakingRows || []).length > 0) {
    return true;
  }

  const { data: writingRows, error: writingError } = await serviceClient
    .from("writing_submissions")
    .select("id")
    .eq("student_id", studentId)
    .gte("submitted_at", range.start)
    .lt("submitted_at", range.end)
    .in("status", ["submitted", "reviewed"])
    .limit(1);

  if (writingError) {
    throw new Error(`Could not read writing submissions: ${normalizeError(writingError)}`);
  }

  return (writingRows || []).length > 0;
}

async function getDueTasks({
  serviceClient,
  studentId,
  localDate
}: {
  serviceClient: ReturnType<typeof createClient>;
  studentId: string;
  localDate: string;
}) {
  const { data: speakingTasks, error: speakingError } = await serviceClient
    .from("assigned_tasks")
    .select("id, title, status, due_date")
    .eq("student_id", studentId)
    .eq("due_date", localDate)
    .in("status", ["assigned", "in_progress"])
    .order("created_at", { ascending: false });

  if (speakingError) {
    throw new Error(`Could not read assigned speaking tasks: ${normalizeError(speakingError)}`);
  }

  const { data: writingTasks, error: writingError } = await serviceClient
    .from("writing_tasks")
    .select("id, title, status, due_date")
    .eq("student_id", studentId)
    .eq("due_date", localDate)
    .eq("status", "assigned")
    .order("created_at", { ascending: false });

  if (writingError) {
    throw new Error(`Could not read assigned writing tasks: ${normalizeError(writingError)}`);
  }

  return [
    ...(speakingTasks || []).map((task) => ({ id: task.id, title: task.title, kind: "speaking" })),
    ...(writingTasks || []).map((task) => ({ id: task.id, title: task.title, kind: "writing" }))
  ];
}

async function sendResendEmail({
  resendApiKey,
  from,
  to,
  subject,
  text,
  html
}: {
  resendApiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html
    })
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(cleanText(body?.message || body?.error, `Resend returned ${response.status}.`));
  }

  return cleanText(body?.id, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Use POST to run daily reminders." });
  }

  let body: Record<string, unknown> = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("REMINDER_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("REMINDER_FROM_EMAIL");
  const appUrl = Deno.env.get("APP_URL");
  const reminderSecret = Deno.env.get("REMINDER_CRON_SECRET") || "";
  const dryRun = body.dryRun === true;

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, {
      error: "SUPABASE_URL or SUPABASE_ANON_KEY is missing in the Edge Function runtime."
    });
  }

  if (!serviceRoleKey) {
    return jsonResponse(500, {
      error: "Missing REMINDER_SERVICE_ROLE_KEY in the Edge Function secrets."
    });
  }

  if (!dryRun && (!resendApiKey || !fromEmail || !appUrl)) {
    return jsonResponse(500, {
      error: "Email reminders are not configured. Set RESEND_API_KEY, REMINDER_FROM_EMAIL, and APP_URL."
    });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
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

  const authorization = await requireAuthorizedRunner({
    req,
    supabaseUrl,
    supabaseAnonKey,
    serviceClient,
    reminderSecret
  });

  if (!authorization.ok) {
    return authorization.error || jsonResponse(401, { error: "Reminder run is not authorized." });
  }

  const { data: students, error: studentsError } = await serviceClient
    .from("profiles")
    .select("id, full_name, email, status")
    .eq("role", "student")
    .eq("status", "active");

  if (studentsError) {
    return jsonResponse(500, {
      error: "Could not read active student profiles.",
      detail: normalizeError(studentsError)
    });
  }

  const studentIds = (students || []).map((student) => student.id);

  if (studentIds.length === 0) {
    return jsonResponse(200, {
      sent: 0,
      skippedCompleted: 0,
      skippedNoTask: 0,
      skippedOptedOut: 0,
      skippedDuplicate: 0,
      failed: 0,
      message: "No active students found."
    });
  }

  const { data: preferences, error: preferencesError } = await serviceClient
    .from("student_reminder_preferences")
    .select("student_id, reminders_enabled, email_reminders_enabled, preferred_email_time, email_timezone")
    .in("student_id", studentIds);

  if (preferencesError) {
    return jsonResponse(500, {
      error: "Could not read student reminder preferences. Run the reminder migration if email columns are missing.",
      detail: normalizeError(preferencesError)
    });
  }

  const preferenceByStudentId = new Map((preferences || []).map((item) => [item.student_id, item]));
  const summary = {
    sent: 0,
    skippedCompleted: 0,
    skippedNoTask: 0,
    skippedOptedOut: 0,
    skippedDuplicate: 0,
    failed: 0,
    dryRun: dryRun ? 0 : undefined,
    failures: [] as Array<{ studentId: string; error: string }>
  };

  for (const student of students || []) {
    const preference = preferenceByStudentId.get(student.id);
    const timezone = cleanText(preference?.email_timezone, defaultTimezone);
    const reminderDate = cleanText(body.targetDate, formatLocalDate(new Date(), timezone));

    if (!student.email || preference?.reminders_enabled === false || preference?.email_reminders_enabled !== true) {
      summary.skippedOptedOut += 1;
      continue;
    }

    try {
      const range = getUtcRangeForLocalDate(reminderDate, timezone);
      const completed = await hasCompletedToday({
        serviceClient,
        studentId: student.id,
        range
      });

      if (completed) {
        summary.skippedCompleted += 1;
        continue;
      }

      const dueTasks = await getDueTasks({
        serviceClient,
        studentId: student.id,
        localDate: reminderDate
      });

      if (dueTasks.length === 0) {
        summary.skippedNoTask += 1;
        continue;
      }

      if (dryRun) {
        summary.dryRun = (summary.dryRun || 0) + 1;
        continue;
      }

      const { error: queuedError } = await serviceClient.from("reminder_logs").insert({
        student_id: student.id,
        reminder_date: reminderDate,
        channel: "email",
        reminder_type: reminderType,
        status: "queued",
        provider: "resend",
        task_summary: {
          tasks: dueTasks,
          timezone,
          preferredEmailTime: preference?.preferred_email_time || "18:00"
        }
      });

      if (queuedError) {
        if (queuedError.code === "23505") {
          summary.skippedDuplicate += 1;
          continue;
        }

        throw new Error(`Could not create reminder log: ${normalizeError(queuedError)}`);
      }

      const email = buildEmail({
        studentName: firstName(student.full_name, student.email),
        tasks: dueTasks,
        appUrl: appUrl || ""
      });
      const providerMessageId = await sendResendEmail({
        resendApiKey: resendApiKey || "",
        from: fromEmail || "",
        to: student.email,
        subject: email.subject,
        text: email.text,
        html: email.html
      });

      await serviceClient
        .from("reminder_logs")
        .update({
          status: "sent",
          provider_message_id: providerMessageId || null,
          error_message: null
        })
        .eq("student_id", student.id)
        .eq("reminder_date", reminderDate)
        .eq("channel", "email")
        .eq("reminder_type", reminderType);

      summary.sent += 1;
    } catch (error) {
      summary.failed += 1;
      summary.failures.push({
        studentId: student.id,
        error: normalizeError(error)
      });

      await serviceClient
        .from("reminder_logs")
        .update({
          status: "failed",
          error_message: normalizeError(error)
        })
        .eq("student_id", student.id)
        .eq("reminder_date", reminderDate)
        .eq("channel", "email")
        .eq("reminder_type", reminderType);
    }
  }

  return jsonResponse(summary.failed > 0 ? 207 : 200, summary);
});
