import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@lib/utils";
import { TooltipProvider } from "@components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { AppSidebar } from "@components/shared/sidebar/app-sidebar";

// Fonts
const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "DICIS Transit",
  description:
    "Una plataforma de gestión de transporte universitario en tiempo real que incluye seguimiento en vivo de autobuses, reportes colaborativos de estudiantes y un centro de despacho administrativo especializado.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <main className="max-w-full w-screen h-screen">
              <SidebarTrigger
                size="icon-sm"
                className="fixed border-none rounded-lg! m-2 z-10 hidden md:flex"
              />
              {children}
            </main>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
