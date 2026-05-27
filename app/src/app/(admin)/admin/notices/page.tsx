"use client";

import { DatePicker } from "@components/admin/date-picker";
import { StatusBadge } from "@components/admin/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@components/ui/alert-dialog";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Checkbox } from "@components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Textarea } from "@components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActiveRoutes } from "@hooks/admin/use-active-routes";
import {
  type Notice,
  type NoticeCategory,
  type NoticePayload,
  useCreateNotice,
  useDeleteNotice,
  useNotices,
} from "@hooks/admin/use-notices";
import { useAuth } from "@providers/auth-provider";
import { differenceInHours } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Bus,
  CalendarClock,
  Clock,
  Construction,
  Info,
  Loader2,
  MapPin,
  Megaphone,
  Navigation,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

// ─── Category config ──────────────────────────────────────────────────────────

const categoryConfig: Record<
  NoticeCategory,
  { label: string; icon: React.ElementType; color: string; placeholder: string }
> = {
  delay: {
    label: "Retraso",
    icon: Clock,
    color: "text-yellow-400",
    placeholder:
      "Ej: La ruta 1 presenta un retraso de aproximadamente 20 minutos debido a tráfico en Av. Universidad. Se estima normalización a las 14:30 hrs.",
  },
  detour: {
    label: "Desvío",
    icon: Navigation,
    color: "text-orange-400",
    placeholder:
      "Ej: Por obras en Blvd. López Mateos, la ruta 2 (Regreso) tomará desvío por Calle Jalisco. El tiempo de recorrido aumenta ~10 min.",
  },
  cancellation: {
    label: "Cancelación",
    icon: Ban,
    color: "text-red-400",
    placeholder:
      "Ej: El servicio del turno vespertino queda cancelado el día de hoy. El próximo servicio disponible será mañana en horario regular.",
  },
  schedule_change: {
    label: "Cambio de horario",
    icon: CalendarClock,
    color: "text-blue-400",
    placeholder:
      "Ej: Durante el período vacacional (21–25 julio) el servicio operará en horario de sábado. Primer salida: 7:00 hrs.",
  },
  incident: {
    label: "Incidente",
    icon: AlertTriangle,
    color: "text-red-500",
    placeholder:
      "Ej: Se reporta accidente en Periférico que afecta el retorno de rutas. Se están habilitando rutas alternas. Mantenerse pendiente.",
  },
  info: {
    label: "Información",
    icon: Info,
    color: "text-sky-400",
    placeholder:
      "Ej: Recordatorio: durante exámenes (10–14 jun) se habilitarán salidas adicionales a las 19:30 hrs para las rutas 1 y 3.",
  },
  maintenance: {
    label: "Mantenimiento",
    icon: Construction,
    color: "text-zinc-400",
    placeholder:
      "Ej: La unidad B-04 estará en mantenimiento preventivo. Se sustituirá temporalmente con capacidad reducida. Disculpe las molestias.",
  },
};

// ─── Priority config ──────────────────────────────────────────────────────────

const priorityConfig = {
  urgent: {
    badge: "critical" as const,
    label: "Crítico",
    border: "border-red-500/20 bg-red-500/5",
    dot: "bg-red-500",
    ring: "shadow-red-500/10",
    icon: Zap,
    iconColor: "text-red-400",
  },
  high: {
    badge: "warning" as const,
    label: "Alto",
    border: "border-yellow-500/20 bg-yellow-500/5",
    dot: "bg-yellow-500",
    ring: "shadow-yellow-500/10",
    icon: AlertTriangle,
    iconColor: "text-yellow-400",
  },
  medium: {
    badge: "info" as const,
    label: "Medio",
    border: "border-blue-500/20 bg-blue-500/5",
    dot: "bg-blue-500",
    ring: "shadow-blue-500/10",
    icon: AlertCircle,
    iconColor: "text-blue-400",
  },
  low: {
    badge: "muted" as const,
    label: "Bajo",
    border: "border-zinc-700/40 bg-zinc-900/40",
    dot: "bg-zinc-600",
    ring: "",
    icon: Info,
    iconColor: "text-zinc-500",
  },
};

const priorityOptions: {
  value: Notice["priority"];
  label: string;
  desc: string;
}[] = [
  { value: "urgent", label: "Crítico", desc: "Afecta servicio inmediatamente" },
  { value: "high", label: "Alto", desc: "Impacto significativo en usuarios" },
  { value: "medium", label: "Medio", desc: "Situación controlada" },
  { value: "low", label: "Bajo", desc: "Informativo, sin urgencia" },
];

const categoryOptions: NoticeCategory[] = [
  "delay",
  "detour",
  "cancellation",
  "schedule_change",
  "incident",
  "info",
  "maintenance",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExpiryStatus(
  notice: Notice,
): "expired" | "expiring-soon" | "ok" | "none" {
  if (!notice.expires_at) return "none";
  const now = new Date();
  const exp = new Date(notice.expires_at);
  if (exp < now) return "expired";
  if (differenceInHours(exp, now) < 48) return "expiring-soon";
  return "ok";
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const noticeSchema = z
  .object({
    title: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(120, "Máximo 120 caracteres"),
    content: z
      .string()
      .min(10, "Mínimo 10 caracteres")
      .max(1500, "Máximo 1500 caracteres"),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    category: z.enum([
      "delay",
      "detour",
      "cancellation",
      "schedule_change",
      "incident",
      "info",
      "maintenance",
    ]),
    affected_route_ids: z.array(z.string()),
    start_at: z.date().optional(),
    expires_at: z.date().optional(),
  })
  .refine(
    (data) =>
      !data.start_at || !data.expires_at || data.start_at < data.expires_at,
    {
      message: "La fecha de inicio debe ser anterior a la de expiración",
      path: ["expires_at"],
    },
  );

type NoticeFormValues = z.infer<typeof noticeSchema>;

// ─── Route multiselect ────────────────────────────────────────────────────────

function RouteMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data: routes = [], isLoading } = useActiveRoutes();
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    );
  };

  const selectedNames = routes
    .filter((r) => value.includes(r.id))
    .map((r) => r.name);

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
        <Bus size={11} />
        Rutas afectadas
        <span className="text-zinc-700">(opcional)</span>
      </Label>

      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left text-sm transition-colors hover:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700"
      >
        <span className="text-zinc-400 truncate text-xs">
          {selectedNames.length === 0
            ? "Seleccionar rutas..."
            : selectedNames.length === routes.length
              ? "Todas las rutas"
              : selectedNames.join(", ")}
        </span>
        {value.length > 0 && (
          <span className="shrink-0 text-[10px] font-semibold bg-blue-500/20 text-blue-400 rounded-full px-1.5 py-0.5">
            {value.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden"
          >
            {isLoading ? (
              <div className="p-3 text-xs text-zinc-500 text-center">
                Cargando rutas...
              </div>
            ) : routes.length === 0 ? (
              <div className="p-3 text-xs text-zinc-500 text-center">
                Sin rutas activas
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto divide-y divide-zinc-900">
                {routes.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => toggle(route.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-900 transition-colors"
                  >
                    <Checkbox
                      checked={value.includes(route.id)}
                      readOnly
                      className="pointer-events-none"
                    />
                    <span className="text-xs text-zinc-300">{route.name}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function NoticeForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (values: NoticeFormValues) => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeSchema),
    defaultValues: {
      priority: "medium",
      category: "info",
      affected_route_ids: [],
    },
  });

  const content = watch("content") ?? "";
  const category = watch("category");
  const catCfg = categoryConfig[category];
  const CategoryIcon = catCfg.icon;

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 px-5 pb-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-zinc-500 font-medium">
          Tipo de aviso
        </Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-4 gap-1.5">
              {categoryOptions.map((cat) => {
                const cfg = categoryConfig[cat];
                const Icon = cfg.icon;
                const active = field.value === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => field.onChange(cat)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-all ${
                      active
                        ? "border-zinc-600 bg-zinc-800 shadow-sm"
                        : "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900"
                    }`}
                  >
                    <Icon
                      size={14}
                      className={active ? cfg.color : "text-zinc-600"}
                    />
                    <span
                      className={`text-[9px] font-medium leading-tight ${active ? "text-zinc-200" : "text-zinc-600"}`}
                    >
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="notice-title"
          className="text-xs text-zinc-500 font-medium"
        >
          Título
        </Label>
        <Input
          id="notice-title"
          placeholder={`Ej: ${catCfg.label} en ruta 1 — ${new Date().toLocaleDateString("es-MX", { weekday: "long" })}`}
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && (
          <p className="text-[11px] text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="notice-content"
          className="text-xs text-zinc-500 font-medium flex items-center gap-1.5"
        >
          <CategoryIcon size={11} className={catCfg.color} />
          Descripción
        </Label>
        <Textarea
          id="notice-content"
          placeholder={catCfg.placeholder}
          rows={5}
          aria-invalid={!!errors.content}
          className="resize-none"
          {...register("content")}
        />
        <div className="flex items-center justify-between gap-2">
          {errors.content ? (
            <p className="text-[11px] text-destructive">
              {errors.content.message}
            </p>
          ) : (
            <p className="text-[10px] text-zinc-600">
              Sé claro: qué pasó, qué rutas afecta y qué deben hacer los
              usuarios.
            </p>
          )}
          <p className="text-[10px] text-zinc-600 shrink-0">
            {content.length}/1500
          </p>
        </div>
      </div>

      {/* Affected routes */}
      <Controller
        name="affected_route_ids"
        control={control}
        render={({ field }) => (
          <RouteMultiSelect value={field.value} onChange={field.onChange} />
        )}
      />

      {/* Priority */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-zinc-500 font-medium">Prioridad</Label>
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-1.5">
              {priorityOptions.map((opt) => {
                const active = field.value === opt.value;
                const cfg = priorityConfig[opt.value];
                const Icon = cfg.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                      active
                        ? `${cfg.border} border-opacity-100`
                        : "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700"
                    }`}
                  >
                    <Icon
                      size={13}
                      className={active ? cfg.iconColor : "text-zinc-700"}
                    />
                    <div>
                      <p
                        className={`text-xs font-medium ${active ? "text-zinc-200" : "text-zinc-500"}`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-[9px] text-zinc-600 leading-tight">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      {/* Dates */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
            <Clock size={10} />
            Inicio (opcional)
          </Label>
          <Controller
            name="start_at"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Ahora"
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <Label className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
            <CalendarClock size={10} />
            Expira (opcional)
          </Label>
          <Controller
            name="expires_at"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Sin fecha"
                fromDate={new Date()}
              />
            )}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full mt-1">
        {isPending && <Loader2 size={14} className="animate-spin mr-2" />}
        Publicar aviso
      </Button>
    </motion.form>
  );
}

// ─── Notice card ──────────────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.96, y: -4 },
};

function NoticeCard({
  notice,
  index,
  onDelete,
  isDeleting,
  routeNames,
}: {
  notice: Notice;
  index: number;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  routeNames: Record<string, string>;
}) {
  const cfg = priorityConfig[notice.priority];
  const catCfg = categoryConfig[notice.category];
  const expiryStatus = getExpiryStatus(notice);
  const PriorityIcon = cfg.icon;
  const CategoryIcon = catCfg.icon;

  const affectedRoutes = notice.affected_route_ids
    .map((id) => routeNames[id])
    .filter(Boolean);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.3, delay: index * 0.05 }}
      layout
      className={`rounded-xl border p-4 flex items-start gap-3 shadow-sm ${cfg.border}`}
    >
      <div className="shrink-0 mt-0.5">
        <PriorityIcon size={15} className={cfg.iconColor} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-sm font-semibold text-white">
            {notice.title}
          </span>
          <StatusBadge variant={cfg.badge}>{cfg.label}</StatusBadge>
          {expiryStatus === "expiring-soon" && (
            <StatusBadge variant="warning">Expira pronto</StatusBadge>
          )}
        </div>

        {/* Category tag */}
        <div className="flex items-center gap-1.5 mb-2">
          <CategoryIcon size={10} className={catCfg.color} />
          <span className={`text-[10px] font-medium ${catCfg.color}`}>
            {catCfg.label}
          </span>
        </div>

        {/* Content */}
        <p className="text-xs text-zinc-400 leading-relaxed">
          {notice.content}
        </p>

        {/* Affected routes */}
        {affectedRoutes.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <Bus size={10} className="text-zinc-600 shrink-0" />
            {affectedRoutes.map((name) => (
              <span
                key={name}
                className="text-[10px] font-medium bg-zinc-800 text-zinc-400 rounded-full px-2 py-0.5"
              >
                {name}
              </span>
            ))}
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {notice.start_at && (
            <p className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Clock size={9} />
              Desde{" "}
              {new Date(notice.start_at).toLocaleDateString("es-MX", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {notice.expires_at && (
            <p
              className={`text-[10px] flex items-center gap-1 font-medium ${
                expiryStatus === "expiring-soon"
                  ? "text-yellow-500"
                  : "text-zinc-600"
              }`}
            >
              <CalendarClock size={9} />
              Expira{" "}
              {new Date(notice.expires_at).toLocaleDateString("es-MX", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Delete */}
      <AlertDialog>
        <AlertDialogTrigger
          disabled={isDeleting}
          className="text-zinc-700 hover:text-red-400 transition-colors shrink-0 mt-0.5 p-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-40"
        >
          <Trash2 size={14} />
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar aviso?</AlertDialogTitle>
            <AlertDialogDescription>
              "{notice.title}" se eliminará permanentemente y dejará de
              mostrarse a los usuarios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => onDelete(notice.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminNoticesPage() {
  const { userData } = useAuth();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: notices = [], isLoading } = useNotices();
  const { data: routes = [] } = useActiveRoutes();
  const createNotice = useCreateNotice();
  const deleteNotice = useDeleteNotice();

  const routeNames = Object.fromEntries(routes.map((r) => [r.id, r.name]));

  useEffect(() => {
    if (searchParams.get("new") === "1") setDialogOpen(true);
  }, [searchParams]);

  function handleCreate(values: NoticeFormValues) {
    if (!userData) return;

    const payload: NoticePayload = {
      title: values.title,
      content: values.content,
      priority: values.priority,
      category: values.category,
      affected_route_ids: values.affected_route_ids,
      admin_id: userData.id,
    };
    if (values.start_at) payload.start_at = values.start_at.toISOString();
    if (values.expires_at) payload.expires_at = values.expires_at.toISOString();

    createNotice.mutate(payload, {
      onSuccess: () => setDialogOpen(false),
    });
  }

  const active = notices.filter((n) => getExpiryStatus(n) !== "expired");
  const expired = notices.filter((n) => getExpiryStatus(n) === "expired");

  return (
    <motion.div
      className="p-6 flex flex-col gap-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white">Avisos</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            <span className="text-zinc-300 font-medium">{active.length}</span>{" "}
            activos
            {expired.length > 0 && (
              <span className="text-zinc-600">
                {" "}
                · {expired.length} expirados
              </span>
            )}
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={() => setDialogOpen(true)}
            className="gap-2 text-sm font-medium"
          >
            <Plus size={14} />
            Nuevo aviso
          </Button>
        </motion.div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="h-28 rounded-xl bg-white/5"
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
            <Megaphone size={22} className="text-zinc-700" />
          </div>
          <div className="text-center">
            <p className="text-sm text-zinc-400 font-medium">
              Sin avisos publicados
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Crea un aviso para informar a los usuarios sobre retrasos, desvíos
              o cambios
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => setDialogOpen(true)}
              variant="outline"
              className="gap-2 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white text-xs"
            >
              <Plus size={13} />
              Crear primer aviso
            </Button>
          </motion.div>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">
                  Activos ({active.length})
                </p>
              </div>

              <AnimatePresence mode="popLayout">
                {active.map((notice, i) => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    index={i}
                    onDelete={(id) => deleteNotice.mutate(id)}
                    isDeleting={deleteNotice.isPending}
                    routeNames={routeNames}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {expired.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
                  Expirados ({expired.length})
                </p>
              </div>

              <AnimatePresence mode="popLayout">
                {expired.map((notice, i) => (
                  <motion.div
                    key={notice.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    layout
                    className="rounded-xl border border-zinc-800/40 p-4 flex items-start gap-3 opacity-50"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0 mt-1.5 bg-zinc-700" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-zinc-400 line-through">
                          {notice.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-zinc-600 border-zinc-700 font-normal text-[10px]"
                        >
                          Expirado
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                        {notice.content}
                      </p>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger
                        disabled={deleteNotice.isPending}
                        className="text-zinc-700 hover:text-red-400 transition-colors shrink-0 mt-0.5 p-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </AlertDialogTrigger>
                      <AlertDialogContent size="sm">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar aviso?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{notice.title}" se eliminará permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => deleteNotice.mutate(notice.id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Megaphone size={16} className="text-zinc-400" />
              Nuevo aviso
            </DialogTitle>
            <p className="text-xs text-zinc-500 mt-1">
              Informa a los usuarios sobre cambios en el servicio
            </p>
          </DialogHeader>
          <div className="mt-4">
            <NoticeForm
              onSubmit={handleCreate}
              isPending={createNotice.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
