importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDuc0tlcpb2vRHG-tAQ9pnW1AYNOAtRioA",
  authDomain: "dicis-transit.firebaseapp.com",
  projectId: "dicis-transit",
  storageBucket: "dicis-transit.firebasestorage.app",
  messagingSenderId: "861355143912",
  appId: "1:861355143912:web:040bfa52e165c20d30cf5d",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title ?? payload.notification?.title ?? "DICIS Transit";
  const body = payload.data?.body ?? payload.notification?.body ?? "";
  const url = payload.data?.url ?? "/";

  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find(
          (c) => c.url.includes(url) && "focus" in c,
        );
        if (existing) return existing.focus();
        return clients.openWindow(url);
      }),
  );
});
