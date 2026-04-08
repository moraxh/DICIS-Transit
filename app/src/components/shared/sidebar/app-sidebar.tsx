"use client";

import Logo from "@assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@components/ui/sidebar";
import { Skeleton } from "@components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@components/ui/tabs";
import { useIsMobile } from "@hooks/use-mobile";
import { Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AlertsTab from "./alerts";
import HomeTab from "./home";
import RoutesTab from "./routes";
import SchedulesTab from "./schedules";

const PublicMap = dynamic(() => import("@components/pages/home/public-map"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full bg-white/5 rounded-xl" />,
});

const tabs = [
  { value: "home", label: "Inicio", component: HomeTab },
  { value: "routes", label: "Rutas", component: RoutesTab },
  { value: "schedules", label: "Horarios", component: SchedulesTab },
  { value: "alerts", label: "Avisos", component: AlertsTab },
];

const iconVariants = {
  initial: { y: 0, rotate: 0 },
  hover: { y: -2, rotate: 4 },
};

const contentVariants = {
  enter: (dir: number) => ({ x: dir * 30, opacity: 0, scale: 0.98 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir * -30, opacity: 0, scale: 0.98 }),
};

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setOpen } = useSidebar();
  const [direction, setDirection] = useState(1);
  const isMobile = useIsMobile();
  const currentTab = searchParams.get("tab");
  const activeTab = tabs.some((tab) => tab.value === currentTab)
    ? currentTab
    : "home";
  const activeTabConfig =
    tabs.find((tab) => tab.value === activeTab) ?? tabs[0];

  useEffect(() => {
    if (isMobile) {
      setOpen(true);
    }
  }, [isMobile, setOpen]);

  const handleTabChange = useCallback(
    (nextTab: string) => {
      if (!tabs.some((tab) => tab.value === nextTab) || nextTab === activeTab) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());

      if (nextTab === "home") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }

      if (
        tabs.findIndex((tab) => tab.value === nextTab) >
        tabs.findIndex((tab) => tab.value === activeTab)
      ) {
        setDirection(1);
      } else {
        setDirection(-1);
      }

      const query = params.toString();
      const nextUrl = query ? `${pathname}?${query}` : pathname;

      router.replace(nextUrl, { scroll: false });
    },
    [activeTab, pathname, router, searchParams],
  );

  return (
    <Sidebar className="border-none md:border-r w-screen md:w-105">
      <Tabs
        className="h-full gap-0"
        value={activeTab}
        onValueChange={handleTabChange}
      >
        {/* Header */}
        <SidebarHeader className="flex flex-col gap-5 p-5 border-b relative overflow-hidden">
          {/* Subtle gradient background for header */}
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none" />

          <SidebarMenu className="flex flex-row gap-1 relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex items-center gap-1"
            >
              <Image
                src={Logo}
                alt="logo"
                height={30}
                width={30}
                className="min-w-fit shadow-sm"
              />
              <SidebarMenuItem className="flex flex-col gap-0">
                <h1 className="text-lg flex gap-2 items-center font-medium bg-clip-text text-transparent bg-linear-to-r from-white to-white/70">
                  DICIS Transit
                </h1>
                <span className="text-sm text-muted-foreground/70 tracking-wide">
                  Salamanca, Gto.
                </span>
              </SidebarMenuItem>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className="text-[0.7rem] ms-auto text-zinc-600 flex items-center justify-between pt-2 mb-auto"
            >
              <motion.a
                href="https://github.com/moraxh"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors flex gap-1"
                initial="initial"
                whileHover="hover"
              >
                Jorge Mora
                <span className="sr-only">GitHub</span>
                <motion.svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  variants={iconVariants}
                >
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </motion.svg>
              </motion.a>
            </motion.div>
          </SidebarMenu>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <TabsList className="flex gap-5 relative bg-transparent">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="relative px-2 bg-0 border-0 bg-transparent! group transition-colors hover:text-white"
                >
                  {activeTab === tab.value && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-sm"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                    ></motion.div>
                  )}

                  <span className="relative z-10 transition-transform group-hover:scale-105 inline-block">
                    {tab.label}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>
        </SidebarHeader>

        <SidebarContent className="w-full flex-1 overflow-hidden flex flex-col relative">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

          {/* Fixed height container for Map, only visible on Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:hidden h-[35vh] shrink-0 mb-4 rounded-xl shadow-md border border-white/10 relative overflow-hidden bg-black/10"
          >
            <PublicMap className="w-full h-full object-cover" />
          </motion.div>

          <div className="relative w-full flex-1">
            <AnimatePresence
              mode="popLayout"
              initial={false}
              custom={direction}
            >
              <motion.div
                key={activeTabConfig.value}
                custom={direction}
                variants={contentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0 text-sm outline-none overflow-y-auto"
                role="tabpanel"
                tabIndex={0}
              >
                <activeTabConfig.component />
              </motion.div>
            </AnimatePresence>
          </div>
        </SidebarContent>

        <SidebarFooter className="border-t mt-auto p-5 relative overflow-hidden ">
          <motion.div
            className="flex items-start gap-1.5 text-zinc-500"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Info className="mt-0.5 shrink-0 text-zinc-500" size={15} />
            <p className="text-[0.7rem] leading-relaxed">
              <strong className="text-zinc-400">Aviso legal:</strong> Esta no es
              una herramienta oficial de la Universidad de Guanajuato, sino una
              propuesta estudiantil. Las rutas, tiempos y ubicaciones son
              predicciones simuladas y pueden contener errores.
            </p>
          </motion.div>
        </SidebarFooter>
      </Tabs>
    </Sidebar>
  );
}
