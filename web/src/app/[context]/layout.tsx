"use client";

import React from "react";
import { useParams } from "next/navigation";
import { AuroraMesh } from "@/components/ui/aurora-mesh";
import { AppSidebar } from "@/components/ui/AppSidebar";

export default function ContextLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const context = params.context as string;

  const themes: Record<string, string> = {
    "dtic": "theme-dtic",
    "sis": "theme-manutencao",
    "sis-manutencao": "theme-manutencao",
    "sis-memoria": "theme-memoria"
  };

  const themeClass = themes[context] || "theme-dtic";

  return (
    <div className={`min-h-screen transition-colors duration-700 ${themeClass}`}>
      <AuroraMesh />
      <div className="flex h-screen overflow-hidden relative z-10">
        <AppSidebar />
        <div className="flex-grow flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

