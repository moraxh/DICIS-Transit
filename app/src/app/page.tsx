"use client";

import { useIsMobile } from "@hooks/use-mobile";
import dynamic from "next/dynamic";

const PublicMap = dynamic(() => import("@components/pages/home/public-map"), {
  ssr: false,
});

export default function Home() {
  const isMobile = useIsMobile();

  return (
    <div className="w-full h-full">
      {!isMobile ? <PublicMap className="block" /> : null}
    </div>
  );
}
