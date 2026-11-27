/* DEELA Books browser push receiver. No credentials or personal data are stored here. */
self.addEventListener("push", event => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data ? event.data.text() : "" };
  }

  const title = String(message.title || "إشعار من DEELA Books").slice(0, 120);
  const body = String(message.body || "لديك تحديث جديد في حسابك.").slice(0, 240);
  const target = String(message.url || "./#notifications");
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: String(message.tag || "deela-books"),
    data: { url: target },
    dir: "rtl",
    lang: "ar"
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "./#notifications";
  event.waitUntil((async () => {
    const destination = new URL(target, self.registration.scope).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(destination);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(destination);
  })());
});
