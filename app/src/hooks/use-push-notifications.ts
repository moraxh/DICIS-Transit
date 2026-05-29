"use client";

import { NEXT_PUBLIC_FIREBASE_VAPID_KEY } from "@lib/env.client";
import {
  getFirebaseMessaging,
  getToken,
  onMessage,
} from "@lib/firebase-client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const FCM_TOKEN_KEY = "dicis-fcm-token";

export interface PushPreferences {
  notifyUrgentNotices: boolean;
  notifyRouteMods: boolean;
  notifyDelayAlerts: boolean;
  notifyReportVerified: boolean;
  notifyServiceCuts: boolean;
  notifyScheduleChanges: boolean;
  notifyFullCapacity: boolean;
  notifyServiceRestored: boolean;
}

interface UsePushNotificationsReturn {
  mounted: boolean;
  verifying: boolean;
  subscribing: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  fcmToken: string | null;
  preferences: PushPreferences;
  subscribeError: string | null;
  requestPermissionAndSubscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  updatePreferences: (prefs: Partial<PushPreferences>) => Promise<void>;
}

const DEFAULT_PREFERENCES: PushPreferences = {
  notifyUrgentNotices: true,
  notifyRouteMods: true,
  notifyDelayAlerts: true,
  notifyReportVerified: true,
  notifyServiceCuts: true,
  notifyScheduleChanges: true,
  notifyFullCapacity: false,
  notifyServiceRestored: true,
};

const hasVapidKey =
  typeof NEXT_PUBLIC_FIREBASE_VAPID_KEY === "string" &&
  NEXT_PUBLIC_FIREBASE_VAPID_KEY.length > 0;

async function isBraveBrowser() {
  const brave = (
    navigator as Navigator & {
      brave?: { isBrave: () => Promise<boolean> };
    }
  ).brave;
  if (!brave?.isBrave) return false;
  try {
    return await brave.isBrave();
  } catch {
    return false;
  }
}

async function getPushSubscribeErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    if (await isBraveBrowser()) {
      return "Brave bloquea las notificaciones push. Ve a brave://settings/privacy y activa “Usar servicios de Google para mensajería push”, luego reinicia el navegador.";
    }
    return "El servicio push del navegador no pudo completar el registro.";
  }

  return "No se pudieron activar las notificaciones.";
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [mounted, setMounted] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [preferences, setPreferences] =
    useState<PushPreferences>(DEFAULT_PREFERENCES);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const subscribingRef = useRef(false);

  const isSubscribed = fcmToken !== null;

  useEffect(() => {
    setMounted(true);

    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    if (
      !hasVapidKey ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    const stored = localStorage.getItem(FCM_TOKEN_KEY);
    if (stored && Notification.permission === "granted") {
      const messaging = getFirebaseMessaging();
      if (messaging) {
        setVerifying(true);
        navigator.serviceWorker
          .register("/firebase-messaging-sw.js")
          .then((registration) =>
            getToken(messaging, {
              vapidKey: NEXT_PUBLIC_FIREBASE_VAPID_KEY,
              serviceWorkerRegistration: registration,
            }),
          )
          .then((refreshed) => {
            if (refreshed && refreshed !== stored) {
              fetch("/api/push/unsubscribe", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fcmToken: stored }),
              }).catch(console.error);

              fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fcmToken: refreshed }),
              }).catch(console.error);

              localStorage.setItem(FCM_TOKEN_KEY, refreshed);
              setFcmToken(refreshed);
            } else if (refreshed) {
              setFcmToken(refreshed);
            } else {
              localStorage.removeItem(FCM_TOKEN_KEY);
            }
          })
          .catch(() => {
            localStorage.removeItem(FCM_TOKEN_KEY);
          })
          .finally(() => {
            setVerifying(false);
          });
      } else {
        localStorage.removeItem(FCM_TOKEN_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!fcmToken) return;

    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    const unsub = onMessage(messaging, (payload) => {
      const title = payload.data?.title;
      const body = payload.data?.body;
      if (title) toast(title, { description: body });
    });
    unsubscribeRef.current = unsub;

    return () => {
      unsubscribeRef.current?.();
    };
  }, [fcmToken]);

  const requestPermissionAndSubscribe = async () => {
    if (subscribingRef.current) return;
    subscribingRef.current = true;
    setSubscribing(true);
    setSubscribeError(null);

    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !hasVapidKey
    ) {
      subscribingRef.current = false;
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const messaging = getFirebaseMessaging();
      if (!messaging) return;

      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
      );
      const token = await getToken(messaging, {
        vapidKey: NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!token) return;

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fcmToken: token }),
      });

      localStorage.setItem(FCM_TOKEN_KEY, token);
      setFcmToken(token);
    } catch (err) {
      setSubscribeError(await getPushSubscribeErrorMessage(err));
    } finally {
      subscribingRef.current = false;
      setSubscribing(false);
    }
  };

  const unsubscribe = async () => {
    if (!fcmToken) return;

    try {
      await fetch("/api/push/unsubscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fcmToken }),
      });
    } catch (err) {
      console.error("FCM unsubscribe error:", err);
    } finally {
      localStorage.removeItem(FCM_TOKEN_KEY);
      setFcmToken(null);
    }
  };

  const updatePreferences = async (prefs: Partial<PushPreferences>) => {
    if (!fcmToken) return;

    const merged = { ...preferences, ...prefs };
    setPreferences(merged);

    try {
      await fetch("/api/push/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fcmToken, ...prefs }),
      });
    } catch (err) {
      console.error("FCM preferences update error:", err);
      setPreferences(preferences);
    }
  };

  return {
    mounted,
    verifying,
    subscribing,
    permission,
    isSubscribed,
    fcmToken,
    preferences,
    subscribeError,
    requestPermissionAndSubscribe,
    unsubscribe,
    updatePreferences,
  };
}
