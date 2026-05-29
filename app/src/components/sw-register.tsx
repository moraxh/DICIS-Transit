"use client";

import { getFirebaseMessaging, onMessage } from "@lib/firebase-client";
import { useEffect } from "react";
import { toast } from "sonner";

export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      const title = payload.data?.title;
      const body = payload.data?.body;
      if (title) toast(title, { description: body });
    });

    return unsubscribe;
  }, []);

  return null;
}
