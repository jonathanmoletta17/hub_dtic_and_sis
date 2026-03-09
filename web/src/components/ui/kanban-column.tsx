"use client";

import React from "react";

interface KanbanColumnProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export function KanbanColumn({ title, count, icon, children }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-text-3/60">{icon}</span>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-text-2/70">{title}</h3>
        </div>
        <span className="text-[11px] font-mono text-text-3/50 bg-surface-2 px-2 py-0.5 rounded min-w-[24px] text-center">
          {count}
        </span>
      </div>

      {/* Scrollable Card List */}
      <div className="flex-grow min-h-0 space-y-2 overflow-y-auto pr-1 scrollbar-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {children}
      </div>
    </div>
  );
}
