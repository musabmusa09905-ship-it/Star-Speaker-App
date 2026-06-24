import { supabase } from "./supabaseClient.js";

function normalizeNotificationError(error) {
  if (!error) {
    return "Instant notification dispatch failed.";
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message || "Instant notification dispatch failed.";
}

export async function dispatchInstantNotification(payload) {
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase is not configured."
    };
  }

  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      return {
        ok: false,
        error: "No active session is available for instant notification dispatch."
      };
    }

    const { data, error } = await supabase.functions.invoke("dispatch-instant-notification", {
      body: payload,
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (error) {
      console.warn("Instant notification dispatch failed:", normalizeNotificationError(error));
      return {
        ok: false,
        error: normalizeNotificationError(error)
      };
    }

    if (data?.ok === false) {
      console.warn("Instant notification dispatch returned an error:", data.error || data.detail);
    }

    return data || { ok: true };
  } catch (error) {
    console.warn("Instant notification dispatch failed:", normalizeNotificationError(error));
    return {
      ok: false,
      error: normalizeNotificationError(error)
    };
  }
}

export function dispatchInstantNotificationQuietly(payload) {
  void dispatchInstantNotification(payload);
}
