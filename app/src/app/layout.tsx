import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@components/ui/sonner";
import { TooltipProvider } from "@components/ui/tooltip";
import { cn } from "@lib/utils";
import { AuthProvider } from "@providers/auth-provider";
import { ThumbmarkProvider } from "@providers/thumbmark-provider";
import FaviconDark from "./favicon_dark.ico";
import FaviconLight from "./favicon_light.ico";

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "DICIS Transit",
  description: "Una plataforma de gestión de transporte universitario",
  icons: {
    icon: [
      {
        rel: "icon",
        media: "(prefers-color-scheme: light)",
        type: "image/ico",
        url: FaviconLight.src,
      },
      {
        rel: "icon",
        media: "(prefers-color-scheme: dark)",
        type: "image/ico",
        url: FaviconDark.src,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        fontSans.variable,
        fontMono.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThumbmarkProvider>
          <AuthProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AuthProvider>
          <Toaster />
        </ThumbmarkProvider>
      </body>
    </html>
  );
}
