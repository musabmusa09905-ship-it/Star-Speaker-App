import { requireSupabaseClient } from "./supabaseClient.js";

const SERVICE_WORKER_PATH = "/sw.js";
const SERVICE_WORKER_SCOPE = "/";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function isPushSupported() {
  return Boolean(
    typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      window.isSecureContext
  );
}

export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function getPushNotificationSnapshot(userId) {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: getNotificationPermission(),
      subscribed: false,
      error: ""
    };
  }

  try {
    const registration = await getServiceWorkerRegistration();
    const browserSubscription = await registration.pushManager.getSubscription();
    const savedSubscription = userId ? await getSavedActiveSubscription(userId, browserSubscription) : null;

    return {
      supported: true,
      permission: getNotificationPermission(),
      subscribed: Boolean(browserSubscription && savedSubscription),
      error: ""
    };
  } catch (error) {
    return {
      supported: true,
      permission: getNotificationPermission(),
      subscribed: false,
      error: normalizePushError(error)
    };
  }
}

export async function enablePushNotifications({ userId, role }) {
  if (!userId) {
    return { error: "You must be signed in to enable notifications." };
  }

  if (!isPushSupported()) {
    return { error: "Push notifications are not supported on this browser/device." };
  }

  if (!VAPID_PUBLIC_KEY) {
    return {
      error: "Notification setup is missing VITE_VAPID_PUBLIC_KEY. Add it to the frontend environment and redeploy."
    };
  }

  const permission = await requestNotificationPermission();

  if (permission === "denied") {
    return {
      error: "Notifications are blocked in your browser settings. Please allow notifications for this site to use this feature."
    };
  }

  if (permission !== "granted") {
    return { error: "Notification permission was not granted." };
  }

  try {
    const registration = await getServiceWorkerRegistration();
    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription =
      existingSubscription ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      }));

    const result = await savePushSubscription({
      userId,
      role,
      subscription
    });

    if (result.error) {
      return result;
    }

    return {
      subscription,
      savedSubscription: result.subscription,
      permission: "granted",
      error: ""
    };
  } catch (error) {
    return { error: normalizePushError(error) };
  }
}

export async function disablePushNotifications({ userId }) {
  if (!userId) {
    return { error: "You must be signed in to disable notifications." };
  }

  if (!isPushSupported()) {
    return { error: "" };
  }

  try {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();
    const endpoint = subscription?.endpoint || null;

    if (subscription) {
      await subscription.unsubscribe();
    }

    if (endpoint) {
      const supabase = requireSupabaseClient();
      const { error } = await supabase
        .from("push_subscriptions")
        .update({
          is_active: false,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("endpoint", endpoint);

      if (error) {
        return { error: normalizePushError(error) };
      }
    }

    return { error: "" };
  } catch (error) {
    return { error: normalizePushError(error) };
  }
}

async function getServiceWorkerRegistration() {
  const existingRegistration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);

  if (existingRegistration) {
    return existingRegistration;
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
    scope: SERVICE_WORKER_SCOPE
  });
}

async function requestNotificationPermission() {
  const currentPermission = getNotificationPermission();

  if (currentPermission !== "default") {
    return currentPermission;
  }

  return Notification.requestPermission();
}

async function savePushSubscription({ userId, role, subscription }) {
  const subscriptionJson = subscription.toJSON();
  const endpoint = subscription.endpoint;
  const p256dh = subscriptionJson.keys?.p256dh;
  const auth = subscriptionJson.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return { error: "Could not read this browser's notification subscription keys." };
  }

  const now = new Date().toISOString();
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent || "",
        device_label: getDeviceLabel(),
        role: role || null,
        is_active: true,
        last_seen_at: now,
        updated_at: now
      },
      {
        onConflict: "user_id,endpoint"
      }
    )
    .select("id,user_id,endpoint,is_active,last_seen_at,created_at,updated_at")
    .single();

  if (error) {
    return { error: normalizePushError(error) };
  }

  return { subscription: data, error: "" };
}

async function getSavedActiveSubscription(userId, browserSubscription) {
  if (!browserSubscription?.endpoint) {
    return null;
  }

  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,is_active")
    .eq("user_id", userId)
    .eq("endpoint", browserSubscription.endpoint)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function getDeviceLabel() {
  if (typeof navigator === "undefined") {
    return "Unknown browser";
  }

  const browser = detectBrowser(navigator.userAgent || "");
  const platform = navigator.platform || "this device";

  return `${browser} on ${platform}`;
}

function detectBrowser(userAgent) {
  if (userAgent.includes("Edg/")) {
    return "Edge";
  }

  if (userAgent.includes("Chrome/")) {
    return "Chrome";
  }

  if (userAgent.includes("Firefox/")) {
    return "Firefox";
  }

  if (userAgent.includes("Safari/")) {
    return "Safari";
  }

  return "Browser";
}

function normalizePushError(error) {
  const message = error?.message || String(error || "");

  if (message.toLowerCase().includes("permission")) {
    return "Notification permission was blocked. Please allow notifications and try again.";
  }

  if (message.toLowerCase().includes("vapid")) {
    return "Notification setup is missing or has an invalid VAPID public key.";
  }

  if (message.toLowerCase().includes("service worker")) {
    return "Could not start the notification service worker. Please refresh and try again.";
  }

  return message || "Could not update notification settings. Please try again.";
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
