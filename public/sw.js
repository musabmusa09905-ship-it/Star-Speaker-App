self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title = payload.title || "Heart of English";
  const options = {
    body: payload.body || "You have something waiting in the app.",
    icon: payload.icon || "/app-icon.png",
    badge: payload.badge || "/favicon.png",
    tag: payload.tag || "heart-of-english",
    data: {
      url: normalizeNotificationUrl(payload.target_url || payload.url || payload.path || "/"),
      notificationId: payload.notification_id || null,
      notificationType: payload.notification_type || null,
      notificationSlot: payload.notification_slot || null
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = normalizeNotificationUrl(event.notification.data?.url || "/");

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        const clientUrl = new URL(client.url);

        if (clientUrl.origin === self.location.origin) {
          if ("navigate" in client) {
            return client.navigate(targetUrl).then((navigatedClient) => {
              if (navigatedClient) {
                return navigatedClient.focus();
              }

              return client.focus();
            });
          }

          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});

function readPushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json();
  } catch (_error) {
    try {
      return { body: event.data.text() };
    } catch (_textError) {
      return {};
    }
  }
}

function normalizeNotificationUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? url.href : self.location.origin;
  } catch (_error) {
    return self.location.origin;
  }
}
