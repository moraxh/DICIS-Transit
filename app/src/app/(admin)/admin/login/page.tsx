"use client";

import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Lock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Credenciales inválidas");
        return;
      }

      toast.success("Sesión iniciada");
      router.replace("/admin");
    } catch {
      toast.error("Error al conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Lock size={18} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white">
              Panel de administrador
            </h1>
            <p className="text-sm text-zinc-500">DICIS Transit</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">Correo</label>
            <Input
              type="email"
              placeholder="admin@ugto.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">
              Contraseña
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-white text-black hover:bg-zinc-200 font-semibold"
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin mr-2" />
            ) : null}
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
