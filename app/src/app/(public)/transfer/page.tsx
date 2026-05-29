"use client";

import { supabase } from "@lib/supabase/client";
import { useThumbmark } from "@thumbmarkjs/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type State = "loading" | "error" | "success";

function TransferContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { thumbmark, isLoading: isThumbmarkLoading } = useThumbmark();
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("Verificando sesion...");
  const didRun = useRef(false);

  useEffect(() => {
    if (isThumbmarkLoading || !thumbmark) return;
    if (didRun.current) return;
    didRun.current = true;

    const token = searchParams.get("token");

    if (!token) {
      setState("error");
      setMessage("Token de transferencia no encontrado en la URL.");
      return;
    }

    (async () => {
      setMessage("Canjeando sesion...");

      const redeemRes = await fetch("/api/auth/transfer/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newVisitorId: thumbmark }),
      });

      if (!redeemRes.ok) {
        const err = await redeemRes.json().catch(() => ({}));
        const code = err.code ?? "UNKNOWN";
        if (code === "TOKEN_USED") {
          setMessage("Este codigo ya fue utilizado. Solicita uno nuevo.");
        } else if (code === "TOKEN_EXPIRED") {
          setMessage("El codigo expiro. Solicita uno nuevo.");
        } else if (code === "TOKEN_NOT_FOUND") {
          setMessage("Codigo invalido.");
        } else {
          setMessage("Error al transferir la sesion. Intenta de nuevo.");
        }
        setState("error");
        return;
      }

      const { accessToken, refreshToken } = await redeemRes.json();

      setMessage("Estableciendo sesion...");

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setState("error");
        setMessage("Error al establecer la sesion. Intenta de nuevo.");
        return;
      }

      setState("success");
      setMessage("Sesion transferida correctamente. Redirigiendo...");
      setTimeout(() => router.replace("/"), 1500);
    })();
  }, [thumbmark, isThumbmarkLoading, searchParams, router]);

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm text-center space-y-4">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            state === "success"
              ? "bg-emerald-500/10"
              : state === "error"
                ? "bg-red-500/10"
                : "bg-zinc-800"
          }`}
        >
          {state === "success" ? (
            <span className="text-emerald-400 text-xl">✓</span>
          ) : state === "error" ? (
            <span className="text-red-400 text-xl">✕</span>
          ) : (
            <span className="animate-spin inline-block w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        {state === "error" && (
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="text-xs text-zinc-500 underline"
          >
            Volver al inicio
          </button>
        )}
      </div>
    </main>
  );
}

export default function TransferPage() {
  return (
    <Suspense>
      <TransferContent />
    </Suspense>
  );
}
