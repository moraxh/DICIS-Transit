"use client";

import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { supabase } from "@lib/supabase/client";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: "urgent" | "high" | "medium" | "low";
  created_at: string;
  expires_at: string | null;
}

const priorityColors = {
  urgent: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

const priorityLabels = {
  urgent: "Urgente",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "medium" as Notice["priority"],
    expires_at: "",
  });

  async function load() {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setNotices(data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!form.title || !form.content) return;
    setSaving(true);

    const payload: Record<string, string> = {
      title: form.title,
      content: form.content,
      priority: form.priority,
    };
    if (form.expires_at) payload.expires_at = new Date(form.expires_at).toISOString();

    const { error } = await supabase.from("notices").insert(payload);
    setSaving(false);

    if (error) {
      toast.error("Error al crear aviso");
      return;
    }

    toast.success("Aviso creado");
    setShowModal(false);
    setForm({ title: "", content: "", priority: "medium", expires_at: "" });
    load();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar");
      return;
    }
    toast.success("Aviso eliminado");
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }

  const isExpired = (n: Notice) =>
    n.expires_at ? new Date(n.expires_at) < new Date() : false;

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Avisos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gestión de avisos generales</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-white text-black hover:bg-zinc-200 font-semibold gap-2"
        >
          <Plus size={15} />
          Nuevo aviso
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <p className="text-sm text-zinc-500">Sin avisos</p>
      ) : (
        <div className="flex flex-col gap-3">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`rounded-xl border p-4 flex items-start gap-3 ${
                isExpired(notice)
                  ? "border-zinc-800/50 bg-zinc-900/20 opacity-50"
                  : priorityColors[notice.priority]
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">
                    {notice.title}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border ${priorityColors[notice.priority]}`}
                  >
                    {priorityLabels[notice.priority]}
                  </span>
                  {isExpired(notice) && (
                    <span className="text-[10px] text-zinc-600 border border-zinc-700 px-1.5 py-0.5 rounded-full">
                      Expirado
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {notice.content}
                </p>
                {notice.expires_at && (
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Expira: {new Date(notice.expires_at).toLocaleDateString("es-MX")}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(notice.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors shrink-0 mt-0.5"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Nuevo aviso</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Título</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Título del aviso"
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Contenido</label>
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, content: e.target.value }))
                  }
                  placeholder="Descripción del aviso…"
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs text-zinc-400">Prioridad</label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        priority: e.target.value as Notice["priority"],
                      }))
                    }
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="low">Bajo</option>
                    <option value="medium">Medio</option>
                    <option value="high">Alto</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs text-zinc-400">Expira (opcional)</label>
                  <Input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expires_at: e.target.value }))
                    }
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={saving || !form.title || !form.content}
              className="w-full bg-white text-black hover:bg-zinc-200 font-semibold"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin mr-2" />
              ) : null}
              Crear aviso
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
