"use client";

import { supabase } from "@lib/supabase/client";
import { AuthSessionMissingError, type User } from "@supabase/supabase-js";
import { useThumbmark } from "@thumbmarkjs/react";
import { redirect } from "next/navigation";
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
};

const AuthContext = createContext<AuthProviderType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { thumbmark, isLoading: isThumbmarkLoading } = useThumbmark();
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  const [userType, setUserType] = useState<"student" | "admin" | null>(null);

  const studentLogin = useCallback(async (visitorId: string) => {
    let success = false;
    try {
      const response = await fetch("/api/auth/login/student", {
        method: "POST",
        body: JSON.stringify({ visitorId: visitorId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Student login failed:", errorData);
        toast.error("No estas autorizado para acceder a esta aplicación");
        return;
      }

      toast.success("Bienvenido estudiante");
      setUserType("student");
      success = true;
    } catch (error) {
      toast.error("Error al iniciar sesión como estudiante");
      console.error("Error during student login:", error);
    }

    if (success) {
      redirect("/");
    }
  }, []);

  const getCurrentUser = useCallback(
    async (visitorId: string) => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!user && error instanceof AuthSessionMissingError) {
          setUserData(null);
          studentLogin(visitorId);
          return;
        }

        if (error || !user) {
          console.error("Error fetching current user:", error);
          toast.error("Error al obtener información del usuario");
          return;
        }

        setUserData(user);
      } catch (error) {
        console.error("Error fetching current user:", error);
        toast.error("Error al obtener información del usuario");
      }
    },
    [studentLogin],
  );

  useEffect(() => {
    if (thumbmark && !isThumbmarkLoading) {
      setVisitorId(thumbmark);
      getCurrentUser(thumbmark);
      setIsLoading(false);
    }
  }, [thumbmark, getCurrentUser, isThumbmarkLoading]);

  return (
    <AuthContext.Provider value={{ visitorId, userType, isLoading, userData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
