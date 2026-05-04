"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

import { CategoryBadge } from "@/components/ui/category-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { decodeHtmlEntities } from "@/lib/utils/formatters";

interface TicketCardProps {
  id: string;
  title: string;
  description: string;
  status: string;
  statusColor?: "info" | "warning" | "danger" | "success" | "neutral";
  category?: string;
  sla?: string;
  slaLevel?: "ok" | "attention" | "critical" | "expired";
  compact?: boolean;
  onClick?: () => void;
}

export function TicketCard({
  id,
  title,
  description,
  status,
  category,
  sla,
  slaLevel = "ok",
  compact = false,
  onClick,
}: TicketCardProps) {
  const isCriticalSla = slaLevel === "critical" || slaLevel === "expired";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`theme-card theme-card-interactive group/card w-full cursor-pointer rounded-xl text-left duration-200 ${compact ? "p-3" : "p-4"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="theme-meta truncate text-[12px] font-mono">{id}</span>
        {sla ? (
          <span
            className={`flex shrink-0 items-center gap-1 text-[12px] font-mono ${isCriticalSla ? "text-[var(--status-active)]" : "theme-meta"}`}
          >
            {slaLevel === "expired" ? <AlertTriangle size={11} /> : <Clock size={11} />}
            {sla}
          </span>
        ) : null}
      </div>

      <h4
        className={`line-clamp-2 font-semibold leading-snug text-text-1 transition-colors group-hover/card:text-text-1 ${compact ? "mb-2 text-[14px]" : "mb-1.5 text-[15px]"}`}
      >
        {decodeHtmlEntities(title)}
      </h4>

      {!compact ? (
        <p className="theme-copy-muted mb-3 line-clamp-2 text-[13px] leading-relaxed">{description}</p>
      ) : null}

      <div className={`flex flex-wrap items-center justify-between gap-2 ${compact ? "mt-auto" : ""}`}>
        {category ? (
          <CategoryBadge className="text-[11px] uppercase tracking-wider">{category}</CategoryBadge>
        ) : (
          <span />
        )}

        <div
          className="flex items-center gap-1"
          title={
            status === "Solucionado"
              ? "Aguardando limite de avaliacao do usuario"
              : status === "Fechado"
                ? "Ticket encerrado definitivamente"
                : undefined
          }
        >
          {status === "Solucionado" ? <Clock size={10} className="text-[var(--status-solved)]" /> : null}
          {status === "Fechado" ? <CheckCircle2 size={10} className="text-[var(--status-closed)]" /> : null}
          <StatusBadge status={status} />
        </div>
      </div>
    </button>
  );
}
