"use client";

import React from "react";
import { useParams, usePathname } from "next/navigation";
import { AuroraMesh } from "@/components/ui/aurora-mesh";
import { AppSidebar } from "@/components/ui/AppSidebar";
import { ContextLiveSync } from "@/components/realtime/ContextLiveSync";
import { getContextTheme } from "@/lib/context-registry";

export default function ContextLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const context = params.context as string;
  const isDticAnalytics = context === "dtic" && pathname === "/dtic/analytics";

  const themeClass = getContextTheme(context);

  return (
    <div className={`min-h-screen transition-colors duration-700 ${themeClass}`}>
      <ContextLiveSync context={context} />
      <AuroraMesh />
      <div className="flex h-screen overflow-hidden relative z-10">
        <AppSidebar collapsed={isDticAnalytics} />
        <div className="flex-grow flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

