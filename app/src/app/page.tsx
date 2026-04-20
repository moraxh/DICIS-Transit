"use client";

import { AppSidebar } from "@components/shared/sidebar/app-sidebar";
import ReportSheet from "@components/shared/report-sheet";
import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { useIsMobile } from "@hooks/use-mobile";
import { useAuth } from "@providers/auth-provider";
import { MapProvider } from "@providers/map-provider";
import { Flag, Shield } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useState } from "react";

const PublicMap = dynamic(() => import("@components/pages/home/public-map"), {
  ssr: false,
});

function HomeContent() {
  const isMobile = useIsMobile();
  const { userType } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      <main className="max-w-full w-screen h-screen">
        <SidebarTrigger
          size="icon-sm"
          className="fixed border-none rounded-lg! m-2 z-10 hidden md:flex"
        />
        <div className="w-full h-full">
          {!isMobile ? <PublicMap className="block" /> : null}
        </div>

        {/* Admin login button — subtle, top-right */}
        <Link
          href="/admin/login"
          className="fixed top-3 right-3 z-20 w-8 h-8 rounded-lg bg-zinc-900/80 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all flex items-center justify-center backdrop-blur-sm"
          aria-label="Acceso administrador"
          title="Acceso administrador"
        >
          <Shield size={14} />
        </Link>

        {userType === "student" && (
          <button
            onClick={() => setReportOpen(true)}
            className="fixed bottom-6 right-6 z-20 w-12 h-12 rounded-full bg-white text-black shadow-2xl flex items-center justify-center hover:bg-zinc-100 transition-colors md:bottom-8 md:right-8"
            aria-label="Enviar reporte"
          >
            <Flag size={18} />
          </button>
        )}

        <ReportSheet open={reportOpen} onOpenChange={setReportOpen} />
      </main>
    </SidebarProvider>
  );
}

export default function Home() {
  return (
    <MapProvider>
      <HomeContent />
    </MapProvider>
  );
}
