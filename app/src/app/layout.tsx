import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AppSidebar } from "@components/shared/sidebar/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { TooltipProvider } from "@components/ui/tooltip";
import { cn } from "@lib/utils";
import { MapProvider } from "@providers/map-provider";

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "DICIS Transit",
  description: "Una plataforma de gestión de transporte universitario",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        fontSans.variable,
        fontMono.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <MapProvider>
          <TooltipProvider>
            <SidebarProvider>
              <Suspense fallback={null}>
                <AppSidebar />
              </Suspense>
              <main className="max-w-full w-screen h-screen">
                <SidebarTrigger
                  size="icon-sm"
                  className="fixed border-none rounded-lg! m-2 z-10 hidden md:flex"
                />
                {children}
              </main>
            </SidebarProvider>
          </TooltipProvider>
        </MapProvider>
      </body>
    </html>
  );
}
