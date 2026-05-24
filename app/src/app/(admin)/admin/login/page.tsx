"use client";

import logo from "@assets/logo.png";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { ArrowLeft, Eye, EyeOff, Loader2, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  function validate(): boolean {
    const e: typeof errors = {};
    if (!email) e.email = "Requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Correo inválido";
    if (!password) e.password = "Requerido";
    else if (password.length < 6) e.password = "Mínimo 6 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/login/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) toast.error("Email o contraseña incorrectos");
        else if (res.status === 403)
          toast.error("Sin permisos de administrador");
        else if (res.status === 429)
          toast.error("Demasiados intentos. Intenta más tarde.");
        else toast.error(data.error ?? "Error al iniciar sesión");
        return;
      }
      router.refresh();
      router.replace("/admin");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      {/* Back to map button */}
      <Link
        href="/"
        className="fixed top-5 left-5 flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors group"
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/[0.08] bg-zinc-900/60 backdrop-blur group-hover:border-white/[0.16] transition-colors">
          <ArrowLeft size={13} />
        </span>
        <span className="hidden sm:inline">Volver al mapa</span>
      </Link>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/70 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">
          <div className="p-8 space-y-7">
            {/* Header */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-white/[0.08] flex items-center justify-center overflow-hidden shadow-inner">
                  <Image
                    src={logo}
                    alt="DICIS Transit"
                    width={44}
                    height={44}
                    className="object-contain"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-800 border border-white/[0.08] flex items-center justify-center">
                  <Shield size={10} className="text-blue-400" />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Panel administrativo
                </h1>
                <p className="text-xs text-zinc-500 mt-0.5">DICIS Transit</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.05]" />

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest"
                >
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="text"
                  inputMode="email"
                  placeholder="admin@ugto.mx"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email)
                      setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  disabled={isLoading}
                  aria-invalid={!!errors.email}
                  className={
                    errors.email
                      ? "border-red-500/50 focus-visible:ring-red-500/30"
                      : ""
                  }
                />
                {errors.email && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest"
                >
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password)
                        setErrors((p) => ({ ...p, password: undefined }));
                    }}
                    disabled={isLoading}
                    aria-invalid={!!errors.password}
                    className={`pr-10 ${errors.password ? "border-red-500/50 focus-visible:ring-red-500/30" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isLoading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                    {errors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full mt-2 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Verificando…
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-700 mt-5">
          Solo personal autorizado · DICIS Transit
        </p>
      </div>
    </div>
  );
}
