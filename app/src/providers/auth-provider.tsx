"use client";

import { supabase } from "@lib/supabase/client";
import { AuthSessionMissingError, type User } from "@supabase/supabase-js";
import { useThumbmark } from "@thumbmarkjs/react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

type AuthProviderType = {
  visitorId: string | null;
  isLoading: boolean;
  userType: "student" | "admin" | null;
  userData: User | null;
  credibilityScore: number | null;
};

const AuthContext = createContext<AuthProviderType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { thumbmark, isLoading: isThumbmarkLoading } = useThumbmark();
  const router = useRouter();
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  const [userType, setUserType] = useState<"student" | "admin" | null>(null);
  const [credibilityScore, setCredibilityScore] = useState<number | null>(null);

  const studentLogin = useCallback(
    async (visitorId: string) => {
      let success = false;
      try {
        const response = await fetch("/api/auth/login/student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Student login failed:", errorData);
          toast.error("No estas autorizado para acceder a esta aplicación");
          return;
        }

        toast.success("Bienvenido estudiante");
        // Do NOT set userType here — onAuthStateChange SIGNED_IN will call getCurrentUser
        // which sets userType + credibilityScore + userData atomically (HIGH-4 fix)
        success = true;
      } catch (error) {
        toast.error("Error al iniciar sesión como estudiante");
        console.error("Error during student login:", error);
      }

      if (success) {
        router.push("/");
      }
    },
    [router],
  );

  const getCurrentUser = useCallback(
    async (visitorId: string) => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!user && error instanceof AuthSessionMissingError) {
          setUserData(null);
          await studentLogin(visitorId);
          return;
        }

        if (error || !user) {
          console.error("Error fetching current user:", error);
          toast.error("Error al obtener información del usuario");
          return;
        }

        setUserData(user);

        const { data: publicUser } = await supabase
          .from("users")
          .select("role, credibility_score")
          .eq("id", user.id)
          .single();

        if (publicUser) {
          setUserType(publicUser.role as "student" | "admin");
          setCredibilityScore(publicUser.credibility_score ?? null);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        toast.error("Error al obtener información del usuario");
      }
    },
    [studentLogin],
  );

  useEffect(() => {
    let cancelled = false;

    if (thumbmark && !isThumbmarkLoading) {
      setVisitorId(thumbmark);
      getCurrentUser(thumbmark).finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    } else if (!isThumbmarkLoading && !thumbmark) {
      setVisitorId(null);
      setUserData(null);
      setUserType(null);
      setCredibilityScore(null);
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
    // getCurrentUser excluded: stable useCallback ref, including it causes extra runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbmark, isThumbmarkLoading]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && thumbmark) {
        getCurrentUser(thumbmark);
      } else if (event === "SIGNED_OUT") {
        setUserData(null);
        setUserType(null);
        setCredibilityScore(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [thumbmark, getCurrentUser]);

  return (
    <AuthContext.Provider
      value={{ visitorId, userType, isLoading, userData, credibilityScore }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
