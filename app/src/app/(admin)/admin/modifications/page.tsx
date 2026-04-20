"use client";

import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { supabase } from "@lib/supabase/client";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface RouteOption {
  id: string;
  name: string;
}

interface Modification {
  id: string;
  route_id: string | null;
  description: string;
  status: "active" | "resolved";
  valid_from: string;
  valid_to: string | null;
  created_at: string;
}

export default function AdminModificationsPage() {
  const [modifications, setModifications] = useState<Modification[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    route_id: "",
    description: "",
    valid_from: new Date().toISOString().split("T")[0],
    valid_to: "",
  });

  async function load() {
    const [modsRes, routesRes] = await Promise.all([
      supabase
        .from("route_modifications")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("routes").select("id, name").eq("is_active", true),
    ]);
    if (modsRes.data) setModifications(modsRes.data);
    if (routesRes.data) setRoutes(routesRes.data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!form.description) return;
    setSaving(true);

    const payload: Record<string, string | null> = {
      description: form.description,
      valid_from: new Date(form.valid_from).toISOString(),
      status: "active",
      route_id: form.route_id || null,
      valid_to: form.valid_to ? new Date(form.valid_to).toISOString() : null,
    };

    const { error } = await supabase.from("route_modifications").insert(payload);
    setSaving(false);

    if (error) {
      toast.error("Error al crear modificación");
      return;
    }

    toast.success("Modificación creada");
    setShowModal(false);
    setForm({
      route_id: "",
      description: "",
      valid_from: new Date().toISOString().split("T")[0],
      valid_to: "",
    });
    load();
  }

  async function handleResolve(id: string) {
    const { error } = await supabase
      .from("route_modifications")
      .update({ status: "resolved" })
      .eq("id", id);

    if (error) {
      toast.error("Error al actualizar");
      return;
    }

    toast.success("Marcada como resuelta");
    setModifications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "resolved" } : m)),
    );
  }

  const routeName = (id: string | null) =>
    routes.find((r) => r.id === id)?.name ?? "Sin ruta específica";

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Modificaciones de Ruta
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Cambios temporales al servicio
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-white text-black hover:bg-zinc-200 font-semibold gap-2"
        >
          <Plus size={15} />
          Nueva modificación
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : modifications.length === 0 ? (
        <p className="text-sm text-zinc-500">Sin modificaciones</p>
      ) : (
        <div className="flex flex-col gap-3">
          {modifications.map((mod) => (
            <div
              key={mod.id}
              className={`rounded-xl border p-4 flex items-start gap-3 transition-opacity ${
                mod.status === "resolved"
                  ? "border-zinc-800/40 bg-zinc-900/20 opacity-50"
                  : "border-orange-500/20 bg-orange-500/8"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-zinc-500">
                    {routeName(mod.route_id)}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      mod.status === "active"
                        ? "text-orange-400 border-orange-500/30"
                        : "text-zinc-500 border-zinc-700"
                    }`}
                  >
                    {mod.status === "active" ? "Activa" : "Resuelta"}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {mod.description}
                </p>
                {mod.valid_to && (
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Hasta:{" "}
                    {new Date(mod.valid_to).toLocaleDateString("es-MX")}
                  </p>
                )}
              </div>
              {mod.status === "active" && (
                <button
                  onClick={() => handleResolve(mod.id)}
                  className="text-zinc-500 hover:text-emerald-400 transition-colors shrink-0 mt-0.5"
                  title="Marcar como resuelta"
                >
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                Nueva modificación
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">
                  Ruta (opcional)
                </label>
                <select
                  value={form.route_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, route_id: e.target.value }))
                  }
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                >
                  <option value="">Todas las rutas</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Describe la modificación…"
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs text-zinc-400">Desde</label>
                  <Input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valid_from: e.target.value }))
                    }
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs text-zinc-400">
                    Hasta (opcional)
                  </label>
                  <Input
                    type="date"
                    value={form.valid_to}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valid_to: e.target.value }))
                    }
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={saving || !form.description}
              className="w-full bg-white text-black hover:bg-zinc-200 font-semibold"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin mr-2" />
              ) : null}
              Crear modificación
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
