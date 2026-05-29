"use client";

import ReportSheet from "@components/shared/report-sheet";
import { AppSidebar } from "@components/shared/sidebar/app-sidebar";
import { useTour } from "@components/onboarding/use-tour";
import { TourContext } from "@components/onboarding/tour-context";
import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { useIsMobile } from "@hooks/use-mobile";
import { useAuth } from "@providers/auth-provider";
import { MapProvider } from "@providers/map-provider";
import { Flag, Shield } from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

const PublicMap = dynamic(() => import("@components/pages/home/public-map"), {
  ssr: false,
});

function HomeContent() {
  const isMobile = useIsMobile();
  const { userType } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const { startTour, shouldAutoStart } = useTour(userType === "student");

  useEffect(() => {
    if (shouldAutoStart()) {
      const t = setTimeout(() => startTour(), 1200);
      return () => clearTimeout(t);
    }
  }, [startTour, shouldAutoStart]);

  return (
    <TourContext.Provider value={{ startTour }}>
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      <main className="max-w-full w-full min-h-svh">
        <SidebarTrigger
          size="icon-sm"
          className="fixed border-none rounded-lg! m-2 z-10 hidden md:flex"
        />
        <div className="w-full h-full">
          {!isMobile ? <PublicMap className="block" /> : null}
        </div>

        {userType === "admin" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.3,
              type: "spring",
              stiffness: 400,
              damping: 20,
            }}
            className="fixed top-3 right-3 z-20"
          >
            <Link
              href="/admin/login"
              className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all flex items-center justify-center backdrop-blur-sm"
              aria-label="Acceso administrador"
              title="Acceso administrador"
            >
              <Shield size={14} />
            </Link>
          </motion.div>
        )}

        {userType === "student" && (
          <motion.button
            type="button"
            data-tour="report-btn"
            onClick={() => setReportOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
              delay: 0.4,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            className="fixed bottom-6 right-6 z-20 w-12 h-12 rounded-full bg-white text-black shadow-2xl flex items-center justify-center md:bottom-8 md:right-8"
            aria-label="Enviar reporte"
          >
            <motion.div
              whileHover={{ rotate: 15 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Flag size={18} />
            </motion.div>
          </motion.button>
        )}

        <ReportSheet open={reportOpen} onOpenChange={setReportOpen} />
      </main>
    </SidebarProvider>
    </TourContext.Provider>
  );
}

export default function HomePageClient({
  initialRouteId,
  initialStopId,
}: {
  initialRouteId: string | null;
  initialStopId: string | null;
}) {
  return (
    <MapProvider initialRouteId={initialRouteId} initialStopId={initialStopId}>
      <HomeContent />
    </MapProvider>
  );
}
