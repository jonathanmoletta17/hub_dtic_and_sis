"use client";

import type { ReactNode } from "react";
import { ChevronRight, Loader2 } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";

interface WorkspaceSelectorCardProps {
  workspaceId: string;
  label: string;
  subtitle: string;
  description: string;
  accentSurfaceClass: string;
  accentDotClass: string;
  accentTextClass: string;
  gradientClass: string;
  glowClass: string;
  borderClassName: string;
  icon: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export function WorkspaceSelectorCard({
  workspaceId,
  label,
  subtitle,
  description,
  accentSurfaceClass,
  accentDotClass,
  accentTextClass,
  gradientClass,
  glowClass,
  borderClassName,
  icon,
  loading = false,
  disabled = false,
  onSelect,
}: WorkspaceSelectorCardProps) {
  return (
    <button
      type="button"
      aria-label={`Abrir ambiente ${workspaceId.toUpperCase()}`}
      onClick={onSelect}
      disabled={disabled}
      className="group relative text-left outline-none focus-visible:rounded-[28px] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
    >
      <GlassCard
        className={`h-full overflow-hidden p-6 transition-[background-color,box-shadow,transform] duration-500 ${borderClassName} group-hover:-translate-y-2 group-hover:bg-surface-3 group-hover:shadow-[var(--card-shadow-hover)]`}
      >
        <div
          className={`absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r ${gradientClass} opacity-50 transition-opacity group-hover:opacity-100`}
        />

        <div
          className={`absolute -right-24 -top-24 h-64 w-64 rounded-full ${glowClass} opacity-20 blur-[100px] transition-[opacity,transform] duration-700 group-hover:scale-150 group-hover:opacity-100`}
        />

        <div className="relative z-10 mb-8 flex items-start justify-between">
          <div
            className={`theme-panel flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl transition-transform duration-500 group-hover:scale-110 ${accentTextClass}`}
          >
            {loading ? <Loader2 size={32} className="animate-spin" /> : icon}
          </div>
          <ChevronRight
            size={24}
            className="theme-copy-soft transition-[color,transform] duration-500 group-hover:translate-x-2 group-hover:text-text-1"
          />
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <span className={`h-1 w-1 rounded-full ${accentDotClass} group-hover:animate-ping`} />
            <h3 className="theme-copy-soft text-[11px] font-bold uppercase tracking-[0.4em] transition-colors group-hover:text-text-2">
              {`AMBIENTE ${workspaceId.toUpperCase()}`}
            </h3>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-text-1 transition-colors group-hover:text-text-1">
            {label}
          </h2>
          <h4 className={`text-sm font-bold uppercase tracking-wider ${accentTextClass} opacity-90`}>
            {subtitle}
          </h4>

          <p className="mt-4 text-[15px] font-medium leading-relaxed text-text-2 transition-colors group-hover:text-text-1">
            {description}
          </p>
        </div>

        <div
          className="relative z-10 mt-auto flex items-center justify-between border-t pt-8"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="theme-copy-soft text-[10px] font-bold uppercase tracking-widest">
            Acesso Restrito
          </div>
          {loading ? (
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${accentSurfaceClass} ${accentTextClass}`}>
              <Loader2 size={14} className="animate-spin" />
              Conectando
            </div>
          ) : (
            <div
              className={`text-[10px] font-black uppercase tracking-widest ${accentTextClass} opacity-0 transition-opacity group-hover:opacity-100`}
            >
              Entrar no ambiente
            </div>
          )}
        </div>
      </GlassCard>
    </button>
  );
}
