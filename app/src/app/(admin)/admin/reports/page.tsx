"use client";

import { ReportDetailSheet } from "@components/admin/report-detail-sheet";
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
} from "@components/ui/alert-dialog";
import { Button } from "@components/ui/button";
import { Checkbox } from "@components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import { useActiveRoutes } from "@hooks/admin/use-active-routes";
import type { Report, ReportStatus } from "@hooks/admin/use-reports";
import {
  useBulkUpdateReportStatus,
  useReports,
  useUpdateReportStatus,
} from "@hooks/admin/use-reports";
import { cn } from "@lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Filter, MoreHorizontal, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const typeLabels: Record<string, string> = {
  did_not_pass: "No pasó",
  full_bus: "Venía lleno",
  early: "Se adelantó",
  delay: "Se tardó",
};

const statusConfig: Record<
  ReportStatus,
  { label: string; badge: "pending" | "ok" | "critical" | "muted" | "warning" }
> = {
  pending: { label: "Pendiente", badge: "pending" },
  verified: { label: "Verificado", badge: "ok" },
  rejected: { label: "Rechazado", badge: "critical" },
  spam: { label: "Spam", badge: "warning" },
};

const bulkActionLabels: Record<ReportStatus, string> = {
  spam: "Marcar como spam",
  verified: "Verificar",
  rejected: "Rechazar",
  pending: "Marcar como pendiente",
};

function CredibilityBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "text-emerald-400"
      : score >= 50
        ? "text-amber-400"
        : "text-red-400";
  return (
    <span className={cn("text-xs font-mono tabular-nums font-semibold", color)}>
      {score}
    </span>
  );
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

const toolbarVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};

export default function AdminReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<ReportStatus | null>(null);
  const [sheetReport, setSheetReport] = useState<Report | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filterRoute = searchParams.get("route") ?? "";
  const filterType = searchParams.get("type") ?? "";
  const filterStatus = searchParams.get("status") ?? "";

  const { data: reports = [], isLoading } = useReports();
  const { data: routes = [] } = useActiveRoutes();
  const updateStatus = useUpdateReportStatus();
  const bulkUpdate = useBulkUpdateReportStatus();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
    setSelectedIds(new Set());
  }

  function clearFilters() {
    router.replace(pathname);
    setSelectedIds(new Set());
  }

  const routeName = (id: string | null) =>
    routes.find((r) => r.id === id)?.name ?? "—";

  const filtered = reports.filter((r) => {
    if (filterRoute && r.route_id !== filterRoute) return false;
    if (filterType && r.report_type !== filterType) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const hasActiveFilters = filterRoute || filterType || filterStatus;
  const allSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openSheet(report: Report) {
    setSheetReport(report);
    setSheetOpen(true);
  }

  function executeBulkUpdate() {
    if (!bulkAction) return;
    const ids = [...selectedIds];
    bulkUpdate.mutate(
      { ids, status: bulkAction },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setBulkAction(null);
        },
        onError: () => setBulkAction(null),
      },
    );
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <motion.div
      className="p-6 flex flex-col gap-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Reportes
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {filtered.length} de {reports.length} reportes
            {hasActiveFilters && (
              <span className="text-zinc-600"> · filtros activos</span>
            )}
          </p>
        </div>

        {pendingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
          >
            <TriangleAlert size={12} className="text-amber-400 shrink-0" />
            <span className="text-xs text-amber-400 font-medium">
              {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
            </span>
          </motion.div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-zinc-600">
          <Filter size={13} />
          <span className="text-xs font-medium">Filtrar:</span>
        </div>

        <Select
          value={filterRoute}
          onValueChange={(v) => setFilter("route", v ?? "")}
        >
          <SelectTrigger className="h-8 text-xs w-auto min-w-36 border-zinc-800 bg-zinc-900/60">
            <SelectValue placeholder="Todas las rutas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las rutas</SelectItem>
            {routes.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterType}
          onValueChange={(v) => setFilter("type", v ?? "")}
        >
          <SelectTrigger className="h-8 text-xs w-auto min-w-36 border-zinc-800 bg-zinc-900/60">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los tipos</SelectItem>
            {Object.entries(typeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus}
          onValueChange={(v) => setFilter("status", v ?? "")}
        >
          <SelectTrigger className="h-8 text-xs w-auto min-w-36 border-zinc-800 bg-zinc-900/60">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los estados</SelectItem>
            {Object.entries(statusConfig).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              type="button"
              onClick={clearFilters}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/8 transition-colors border border-zinc-800"
            >
              <X size={12} />
              Limpiar
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            variants={toolbarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900 rounded-xl border border-zinc-700/60 shadow-lg"
          >
            <span className="text-sm text-zinc-200 font-semibold">
              {selectedIds.size} seleccionado{selectedIds.size > 1 ? "s" : ""}
            </span>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-1.5">
              {(
                ["verified", "spam", "rejected", "pending"] as ReportStatus[]
              ).map((action) => {
                const colorMap = {
                  verified:
                    "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
                  spam: "bg-orange-500/15 text-orange-400 hover:bg-orange-500/25",
                  rejected: "bg-red-500/15 text-red-400 hover:bg-red-500/25",
                  pending: "bg-zinc-700/60 text-zinc-300 hover:bg-zinc-700",
                };
                return (
                  <motion.button
                    key={action}
                    type="button"
                    onClick={() => setBulkAction(action)}
                    disabled={bulkUpdate.isPending}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40",
                      colorMap[action],
                    )}
                  >
                    {bulkActionLabels[action]}
                  </motion.button>
                );
              })}
            </div>
            <motion.button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="ml-auto text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded"
            >
              <X size={14} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              className="h-12 rounded-xl bg-white/5"
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <TriangleAlert size={20} className="text-zinc-700" />
          </div>
          <div className="text-center">
            <p className="text-sm text-zinc-400 font-medium">Sin reportes</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {hasActiveFilters
                ? "Prueba con otros filtros"
                : "No hay reportes registrados"}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-zinc-500 hover:text-white transition-colors underline underline-offset-4"
            >
              Limpiar filtros
            </button>
          )}
        </motion.div>
      ) : (
        <div className="rounded-xl border border-zinc-800/70 overflow-hidden bg-zinc-900/20">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800/60 bg-zinc-900/60 hover:bg-zinc-900/60">
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) =>
                      v
                        ? setSelectedIds(new Set(filtered.map((r) => r.id)))
                        : setSelectedIds(new Set())
                    }
                  />
                </TableHead>
                <TableHead className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">
                  Tipo
                </TableHead>
                <TableHead className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">
                  Ruta
                </TableHead>
                <TableHead className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell">
                  Hace
                </TableHead>
                <TableHead className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">
                  Estado
                </TableHead>
                <TableHead className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell">
                  Cred.
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {filtered.map((report, i) => {
                  const selected = selectedIds.has(report.id);
                  const cfg = statusConfig[report.status];

                  return (
                    <motion.tr
                      key={report.id}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => openSheet(report)}
                      className={cn(
                        "border-zinc-800/40 transition-colors cursor-pointer group",
                        selected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]",
                      )}
                    >
                      <TableCell
                        className="pl-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleOne(report.id)}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-zinc-200 font-medium text-sm">
                          {typeLabels[report.report_type] ?? report.report_type}
                        </span>
                        {report.report_type === "delay" &&
                          report.delay_mins && (
                            <span className="text-zinc-600 text-xs ml-1.5">
                              {report.delay_mins}m
                            </span>
                          )}
                      </TableCell>
                      <TableCell className="text-zinc-400 py-3 text-sm">
                        {routeName(report.route_id)}
                      </TableCell>
                      <TableCell className="text-zinc-600 text-xs py-3 whitespace-nowrap hidden sm:table-cell">
                        {formatDistanceToNow(new Date(report.created_at), {
                          addSuffix: false,
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge variant={cfg.badge}>
                          {cfg.label}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="py-3 hidden md:table-cell">
                        <CredibilityBadge score={report.credibility_score} />
                      </TableCell>
                      <TableCell
                        className="py-3 pr-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Acciones"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            }
                          >
                            <MoreHorizontal size={14} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuItem
                              disabled={report.status === "verified"}
                              onClick={() =>
                                updateStatus.mutate({
                                  id: report.id,
                                  status: "verified",
                                })
                              }
                            >
                              Verificar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={report.status === "pending"}
                              onClick={() =>
                                updateStatus.mutate({
                                  id: report.id,
                                  status: "pending",
                                })
                              }
                            >
                              Marcar pendiente
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={report.status === "spam"}
                              onClick={() =>
                                updateStatus.mutate({
                                  id: report.id,
                                  status: "spam",
                                })
                              }
                            >
                              Marcar spam
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={report.status === "rejected"}
                              onClick={() =>
                                updateStatus.mutate({
                                  id: report.id,
                                  status: "rejected",
                                })
                              }
                            >
                              Rechazar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Bulk confirm */}
      <AlertDialog
        open={bulkAction !== null}
        onOpenChange={(o) => !o && setBulkAction(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction ? bulkActionLabels[bulkAction] : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se actualizarán {selectedIds.size} reporte
              {selectedIds.size > 1 ? "s" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkAction(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkUpdate}
              disabled={bulkUpdate.isPending}
              variant={
                bulkAction === "rejected" || bulkAction === "spam"
                  ? "destructive"
                  : "default"
              }
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report detail sheet */}
      <ReportDetailSheet
        report={sheetReport}
        routeName={sheetReport ? routeName(sheetReport.route_id) : ""}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSheetReport(null);
        }}
      />
    </motion.div>
  );
}
