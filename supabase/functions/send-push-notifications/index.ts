import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const defaultLimit = 25;
const maxLimit = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type SupabaseClient = ReturnType<typeof createClient>;

type NotificationEvent = {
  id: string;
  user_id: string;
  notification_type: string;
  notification_slot: string;
  title: string;
  body: string;
  target_url: string | null;
  metadata: Record<string, unknown> | null;
  attempts: number | null;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
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

function getBearerToken(req: Request) {
  return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

function normalizeLimit(value: unknown) {
  const parsed = Number(value || defaultLimit);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultLimit;
  }

  return Math.min(Math.floor(parsed), maxLimit);
}

async function requireAuthorizedRunner({
  req,
  supabaseUrl,
  supabaseAnonKey,
  serviceClient,
  runSecret
}: {
  req: Request;
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceClient: SupabaseClient;
  runSecret: string;
}) {
  const requestSecret = req.headers.get("x-push-secret") || "";

  if (runSecret && requestSecret && requestSecret === runSecret) {
    return { ok: true, error: null };
  }

  const token = getBearerToken(req);

  if (!token) {
    return {
      ok: false,
      error: jsonResponse(401, {
        error: "Missing bearer token or x-push-secret header."
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
        error: "Could not verify push sender runner permissions.",
        detail: normalizeError(profileError)
      })
    };
  }

  if (!profile || !["admin", "coordinator"].includes(profile.role) || profile.status !== "active") {
    return {
      ok: false,
      error: jsonResponse(403, {
        error: "Only active admin or coordinator accounts can manually send push notifications."
      })
    };
  }

  return { ok: true, error: null };
}

async function fetchPendingEvents({
  serviceClient,
  notificationId,
  slot,
  limit
}: {
  serviceClient: SupabaseClient;
  notificationId: string;
  slot: string;
  limit: number;
}) {
  let query = serviceClient
    .from("notification_events")
    .select("id,user_id,notification_type,notification_slot,title,body,target_url,metadata,attempts")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (notificationId) {
    query = query.eq("id", notificationId).limit(1);
  }

  if (slot) {
    query = query.eq("notification_slot", slot);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not read pending notification events: ${normalizeError(error)}`);
  }

  return (data || []) as NotificationEvent[];
}

async function claimEvent(serviceClient: SupabaseClient, event: NotificationEvent) {
  const now = new Date().toISOString();
  const { data, error } = await serviceClient
    .from("notification_events")
    .update({
      status: "sending",
      attempts: (event.attempts || 0) + 1,
      last_attempt_at: now,
      error_message: null
    })
    .eq("id", event.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not claim notification event ${event.id}: ${normalizeError(error)}`);
  }

  return Boolean(data?.id);
}

async function getActiveSubscriptions(serviceClient: SupabaseClient, userId: string) {
  const { data, error } = await serviceClient
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Could not read push subscriptions: ${normalizeError(error)}`);
  }

  return (data || []) as PushSubscriptionRow[];
}

function buildPayload(event: NotificationEvent) {
  const targetUrl = event.target_url || "/";

  return JSON.stringify({
    title: event.title || "Heart of English",
    body: event.body || "You have something waiting in the app.",
    icon: "/app-icon.png",
    badge: "/favicon.png",
    target_url: targetUrl,
    url: targetUrl,
    notification_id: event.id,
    notification_type: event.notification_type,
    notification_slot: event.notification_slot,
    data: event.metadata || {}
  });
}

function toWebPushSubscription(subscription: PushSubscriptionRow) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };
}

function isExpiredSubscriptionError(error: unknown) {
  const statusCode = Number((error as { statusCode?: unknown })?.statusCode || 0);
  const message = normalizeError(error).toLowerCase();

  return statusCode === 404 || statusCode === 410 || message.includes("expired") || message.includes("gone");
}

async function deactivateSubscription(serviceClient: SupabaseClient, subscription: PushSubscriptionRow, errorMessage: string) {
  await serviceClient
    .from("push_subscriptions")
    .update({
      is_active: false,
      last_seen_at: new Date().toISOString()
    })
    .eq("id", subscription.id);

  return {
    subscriptionId: subscription.id,
    deactivated: true,
    error: errorMessage
  };
}

async function updateFinalEventStatus({
  serviceClient,
  eventId,
  status,
  deliverySummary,
  errorMessage
}: {
  serviceClient: SupabaseClient;
  eventId: string;
  status: string;
  deliverySummary: Record<string, unknown>;
  errorMessage: string | null;
}) {
  const { error } = await serviceClient
    .from("notification_events")
    .update({
      status,
      sent_at: ["sent", "partially_sent"].includes(status) ? new Date().toISOString() : null,
      error_message: errorMessage,
      delivery_summary: deliverySummary
    })
    .eq("id", eventId)
    .eq("status", "sending");

  if (error) {
    throw new Error(`Could not update notification event status: ${normalizeError(error)}`);
  }
}

async function sendEvent({
  serviceClient,
  event,
  dryRun
}: {
  serviceClient: SupabaseClient;
  event: NotificationEvent;
  dryRun: boolean;
}) {
  const subscriptions = await getActiveSubscriptions(serviceClient, event.user_id);

  if (!subscriptions.length) {
    if (!dryRun) {
      await updateFinalEventStatus({
        serviceClient,
        eventId: event.id,
        status: "skipped_no_subscription",
        deliverySummary: {
          attempted: 0,
          succeeded: 0,
          failed: 0,
          reason: "No active push subscriptions."
        },
        errorMessage: "No active push subscriptions for this user."
      });
    }

    return {
      status: "skipped_no_subscription",
      attempted: 0,
      succeeded: 0,
      failed: 0,
      deactivated: 0
    };
  }

  if (dryRun) {
    return {
      status: "would_send",
      attempted: subscriptions.length,
      succeeded: 0,
      failed: 0,
      deactivated: 0
    };
  }

  const payload = buildPayload(event);
  let succeeded = 0;
  let failed = 0;
  let deactivated = 0;
  const errors: Array<{ subscriptionId: string; error: string; deactivated?: boolean }> = [];

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(toWebPushSubscription(subscription), payload);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      const errorMessage = normalizeError(error);

      if (isExpiredSubscriptionError(error)) {
        const cleanup = await deactivateSubscription(serviceClient, subscription, errorMessage);
        deactivated += 1;
        errors.push(cleanup);
      } else {
        errors.push({
          subscriptionId: subscription.id,
          error: errorMessage
        });
      }
    }
  }

  const finalStatus =
    succeeded === subscriptions.length
      ? "sent"
      : succeeded > 0
        ? "partially_sent"
        : "failed";
  const deliverySummary = {
    attempted: subscriptions.length,
    succeeded,
    failed,
    deactivated,
    errors
  };

  await updateFinalEventStatus({
    serviceClient,
    eventId: event.id,
    status: finalStatus,
    deliverySummary,
    errorMessage: errors.length ? errors.map((item) => item.error).join("; ").slice(0, 1000) : null
  });

  return {
    status: finalStatus,
    attempted: subscriptions.length,
    succeeded,
    failed,
    deactivated
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Use POST to send push notifications." });
  }

  let body: Record<string, unknown> = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("PUSH_NOTIFICATION_SERVICE_ROLE_KEY");
  const runSecret = Deno.env.get("PUSH_NOTIFICATION_SECRET") || "";
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  const dryRun = body.dryRun === true;
  const limit = normalizeLimit(body.limit);
  const notificationId = String(body.notificationId || "").trim();
  const slot = String(body.slot || "").trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, {
      error: "SUPABASE_URL or SUPABASE_ANON_KEY is missing in the Edge Function runtime."
    });
  }

  if (!serviceRoleKey) {
    return jsonResponse(500, {
      error: "Missing PUSH_NOTIFICATION_SERVICE_ROLE_KEY in the Edge Function secrets."
    });
  }

  if (!dryRun && (!vapidPublicKey || !vapidPrivateKey || !vapidSubject)) {
    return jsonResponse(500, {
      error: "Missing VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, or VAPID_SUBJECT in Edge Function secrets."
    });
  }

  if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
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
    runSecret
  });

  if (!authorization.ok) {
    return authorization.error || jsonResponse(401, { error: "Push sender run is not authorized." });
  }

  try {
    const events = await fetchPendingEvents({
      serviceClient,
      notificationId,
      slot,
      limit
    });

    const summary = {
      dryRun,
      checked: events.length,
      claimed: 0,
      sent: 0,
      partiallySent: 0,
      failed: 0,
      skippedNoSubscription: 0,
      skippedDuplicate: 0,
      wouldSend: 0,
      subscriptionsAttempted: 0,
      subscriptionsSucceeded: 0,
      subscriptionsFailed: 0,
      subscriptionsDeactivated: 0,
      results: [] as Array<Record<string, unknown>>
    };

    for (const event of events) {
      if (!dryRun) {
        const claimed = await claimEvent(serviceClient, event);

        if (!claimed) {
          summary.skippedDuplicate += 1;
          summary.results.push({
            notificationId: event.id,
            status: "skipped_duplicate"
          });
          continue;
        }

        summary.claimed += 1;
      }

      const result = await sendEvent({
        serviceClient,
        event,
        dryRun
      });

      if (result.status === "sent") {
        summary.sent += 1;
      } else if (result.status === "partially_sent") {
        summary.partiallySent += 1;
      } else if (result.status === "failed") {
        summary.failed += 1;
      } else if (result.status === "skipped_no_subscription") {
        summary.skippedNoSubscription += 1;
      } else if (result.status === "would_send") {
        summary.wouldSend += 1;
      }

      summary.subscriptionsAttempted += result.attempted;
      summary.subscriptionsSucceeded += result.succeeded;
      summary.subscriptionsFailed += result.failed;
      summary.subscriptionsDeactivated += result.deactivated;
      summary.results.push({
        notificationId: event.id,
        userId: event.user_id,
        slot: event.notification_slot,
        ...result
      });
    }

    return jsonResponse(summary.failed > 0 || summary.partiallySent > 0 ? 207 : 200, summary);
  } catch (error) {
    return jsonResponse(500, {
      error: "Could not send push notifications.",
      detail: normalizeError(error)
    });
  }
});
