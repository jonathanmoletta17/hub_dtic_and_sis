"use client";

import React from "react";

interface KanbanColumnProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
  emptyLabel?: string;
  panelClassName?: string;
}

export function KanbanColumn({
  title,
  count,
  icon,
  children,
  emptyLabel = "Nenhum chamado nesta coluna.",
  panelClassName,
}: KanbanColumnProps) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div
      className={`theme-panel flex min-h-0 flex-col rounded-[22px] p-4 xl:h-full xl:overflow-hidden ${panelClassName ?? "min-w-0 xl:min-w-[300px]"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-2">
          <span className="theme-meta">{icon}</span>
          <h3 className="theme-copy-soft text-[12px] font-semibold uppercase tracking-[0.12em]">{title}</h3>
        </div>
        <span className="theme-chip theme-meta min-w-[32px] rounded-full px-2.5 py-0.5 text-center text-[11px] font-mono">
          {count}
        </span>
      </div>

      <div
        className="space-y-2 pr-1 xl:min-h-0 xl:flex-grow xl:overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {hasChildren ? (
          children
        ) : (
          <div
            className="theme-copy-soft rounded-xl border px-3 py-4 text-[12px]"
            style={{
              borderColor: "var(--border-subtle)",
              background: "color-mix(in srgb, var(--bg-surface-alt) 82%, transparent)",
            }}
          >
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}
