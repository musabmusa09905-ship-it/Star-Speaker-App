import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notification-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
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

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function isAuthorizedRunner(req: Request, runSecret: string) {
  const requestSecret = req.headers.get("x-notification-secret") || "";
  return Boolean(runSecret && requestSecret && requestSecret === runSecret);
}

async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function callFunction({
  url,
  secretHeaderName,
  secret,
  body
}: {
  url: string;
  secretHeaderName: string;
  secret: string;
  body: Record<string, unknown>;
}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [secretHeaderName]: secret
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data: Record<string, unknown>;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return {
    ok: response.ok && data.ok !== false,
    status: response.status,
    data
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL").replace(/\/+$/, "");
    const notificationSecret = getRequiredEnv("NOTIFICATION_ENGINE_SECRET");
    const pushSecret = getRequiredEnv("PUSH_NOTIFICATION_SECRET");

    if (!isAuthorizedRunner(req, notificationSecret)) {
      return jsonResponse(401, {
        ok: false,
        error: "Unauthorized"
      });
    }

    const body = await readJson(req);
    const slot = String(body.slot || "").trim();
    const dryRun = body.dryRun === true;
    const limit = Number.isFinite(Number(body.limit)) ? Math.max(1, Math.min(100, Number(body.limit))) : 25;
    const notificationDate = typeof body.notificationDate === "string" ? body.notificationDate : undefined;

    if (!slot) {
      return jsonResponse(400, {
        ok: false,
        error: "Missing slot"
      });
    }

    const createBody: Record<string, unknown> = { slot, dryRun };

    if (notificationDate) {
      createBody.notificationDate = notificationDate;
    }

    const createResult = await callFunction({
      url: `${supabaseUrl}/functions/v1/create-notification-events`,
      secretHeaderName: "x-notification-secret",
      secret: notificationSecret,
      body: createBody
    });

    if (!createResult.ok) {
      return jsonResponse(500, {
        ok: false,
        error: "Could not create notification events.",
        details: createResult.data,
        stage: "create-notification-events"
      });
    }

    const sendResult = await callFunction({
      url: `${supabaseUrl}/functions/v1/send-push-notifications`,
      secretHeaderName: "x-push-secret",
      secret: pushSecret,
      body: {
        slot,
        dryRun,
        limit
      }
    });

    if (!sendResult.ok) {
      return jsonResponse(500, {
        ok: false,
        error: "Could not send push notifications.",
        details: sendResult.data,
        stage: "send-push-notifications"
      });
    }

    return jsonResponse(200, {
      ok: true,
      slot,
      dryRun,
      limit,
      notificationDate: createResult.data.notificationDate || notificationDate || null,
      created: createResult.data.created || 0,
      wouldCreate: createResult.data.wouldCreate || 0,
      create: createResult.data,
      send: sendResult.data
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: "Could not run scheduled notification slot.",
      details: normalizeError(error)
    });
  }
});
