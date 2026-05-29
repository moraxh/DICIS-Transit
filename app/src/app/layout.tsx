import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SwRegister from "@components/sw-register";
import { Toaster } from "@components/ui/sonner";
import { TooltipProvider } from "@components/ui/tooltip";
import { cn } from "@lib/utils";
import { AuthProvider } from "@providers/auth-provider";
import { ThumbmarkProvider } from "@providers/thumbmark-provider";
import { Analytics } from "@vercel/analytics/next";
import FaviconDark from "./favicon_dark.ico";
import FaviconLight from "./favicon_light.ico";

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

const siteName = "DICIS Transit";
const siteDescription =
  "Consulta rutas, horarios, alertas y reportes del transporte universitario DICIS en tiempo real.";
const previewImage = {
  url: "/preview.png",
  width: 1661,
  height: 964,
  alt: "Vista previa de DICIS Transit con mapa y rutas de transporte universitario",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} | Transporte universitario en tiempo real`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "DICIS Transit",
    "transporte universitario",
    "rutas DICIS",
    "horarios de transporte",
    "mapa de rutas",
    "Universidad de Guanajuato",
  ],
  authors: [{ name: "DICIS Transit" }],
  creator: "DICIS Transit",
  publisher: "DICIS Transit",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "/",
    siteName,
    title: `${siteName} | Transporte universitario en tiempo real`,
    description: siteDescription,
    images: [previewImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Transporte universitario en tiempo real`,
    description: siteDescription,
    images: [previewImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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

export default async function RootLayout({
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
        <SwRegister />
        <Analytics />
      </body>
    </html>
  );
}
