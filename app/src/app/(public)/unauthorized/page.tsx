"use client";

import Logo from "@assets/logo.png";
import { Button } from "@ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  QrCode,
  ShieldAlert,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function UnauthorizedPage() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-5xl rounded-3xl border bg-card shadow-sm">
        <div className="grid min-h-[28rem] grid-cols-1 md:grid-cols-[1.35fr_1fr]">
          <div className="flex flex-col justify-between border-b p-8 md:border-b-0 md:border-r md:p-10">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <Image
                  src={Logo}
                  alt="DICIS Tracker"
                  className="h-16 w-16 rounded-xl object-contain"
                  priority
                />
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    DICIS Tracker
                  </h1>
                </div>
              </div>

              <div className="space-y-4 text-left">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Acceso restringido por seguridad
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Para proteger datos potencialmente sensibles, reducir riesgos
                  de suplantacion y mantener la integridad de reportes y rutas,
                  esta plataforma requiere que inicies sesion por primera vez
                  desde la red universitaria de la Universidad de Guanajuato.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Una vez verificada tu sesion inicial dentro de la red UG,
                  podras seguir usando DICIS Tracker desde cualquier otra red.
                </p>
              </div>
            </div>

            <div className="mt-8 flex w-full flex-row gap-3">
              <Button
                variant="default"
                className="h-11 flex-1"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1"
                onClick={() => setIsHelpOpen(true)}
              >
                <QrCode className="mr-2 h-4 w-4" />
                Recibir sesion
              </Button>
            </div>
          </div>

          <aside className="flex items-center bg-muted/25 p-8 md:p-10">
            <div className="w-full space-y-4 rounded-2xl border bg-gradient-to-b from-background to-background/80 p-6 shadow-sm">
              <div className="rounded-xl border bg-background p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Estado actual
                </p>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      {isOnline ? (
                        <Wifi className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-destructive" />
                      )}
                      Conectividad
                    </div>
                    <span
                      className={
                        isOnline
                          ? "text-xs text-emerald-600"
                          : "text-xs text-destructive"
                      }
                    >
                      {isOnline ? "En linea" : "Sin internet"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      Verificacion red UG
                    </div>
                    <span className="text-xs text-amber-600">Pendiente</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  Aviso legal
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  DICIS Tracker no es una plataforma oficial de la Universidad
                  de Guanajuato. Cualquier intento de abuso, manipulacion de
                  reportes, automatizacion maliciosa o uso indebido podra
                  derivar en baneo permanente de la plataforma.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {isHelpOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-background shadow-xl">
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  Como recibir sesion
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sigue estos pasos para validar tu sesion inicial.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsHelpOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 p-5">
              <div className="rounded-xl border p-3">
                <p className="text-sm font-medium text-foreground">
                  1. Conectate a la red UG
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Entra a cualquier red universitaria valida de la Universidad
                  de Guanajuato.
                </p>
              </div>

              <div className="rounded-xl border p-3">
                <p className="text-sm font-medium text-foreground">
                  2. Presiona Reintentar
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  El sistema intentara validar tu sesion y vincular tu
                  dispositivo.
                </p>
              </div>

              <div className="rounded-xl border p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  3. Usa la plataforma desde cualquier red
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Una vez validada, tu sesion podra continuar fuera de la red
                  UG.
                </p>
              </div>
            </div>

            <div className="border-t p-5">
              <Button className="w-full" onClick={() => setIsHelpOpen(false)}>
                Entendido
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
