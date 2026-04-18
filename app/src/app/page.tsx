"use client";

import { AppSidebar } from "@components/shared/sidebar/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { useIsMobile } from "@hooks/use-mobile";
import { MapProvider } from "@providers/map-provider";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const PublicMap = dynamic(() => import("@components/pages/home/public-map"), {
  ssr: false,
});

export default function Home() {
  const isMobile = useIsMobile();

  return (
    <MapProvider>
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
        </main>
      </SidebarProvider>
    </MapProvider>
  );
}
