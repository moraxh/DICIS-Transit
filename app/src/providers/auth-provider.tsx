"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { createContext, useContext, useEffect, useState } from "react";

type AuthProviderType = {
  visitorId: string | null;
  userType: "student" | "admin" | null;
};

const AuthContext = createContext<AuthProviderType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [userType, setUserType] = useState<"student" | "admin" | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initFingerprint() {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();

        console.log("FingerprintJS visitor ID:", result);
        if (mounted) {
          setVisitorId(result.visitorId);
        }
      } catch (error) {
        console.error("Error initializing FingerprintJS:", error);
      }
    }

    initFingerprint();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ visitorId, userType }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
