"use client";

import type { ReactNode } from "react";
import { Loader2, Search } from "lucide-react";

export interface DashboardOverviewStat {
  label: string;
  hint: string;
  value: string;
  icon: ReactNode;
  tone: string;
  surface: string;
}

interface DashboardOverviewHeaderProps {
  contextBadge: string;
  roleLabel?: string | null;
  title: string;
  subtitle?: string | null;
  headerCountLabel?: string | null;
  operatorLabel?: string | null;
  searchQuery: string;
  refreshing: boolean;
  loading: boolean;
  statCards: DashboardOverviewStat[];
  onSearchQueryChange: (value: string) => void;
}

export function DashboardOverviewHeader({
  contextBadge,
  roleLabel,
  title,
  subtitle,
  headerCountLabel,
  operatorLabel,
  searchQuery,
  refreshing,
  loading,
  statCards,
  onSearchQueryChange,
}: DashboardOverviewHeaderProps) {
  return (
    <>
      <header className="mb-5 shrink-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="theme-shell-button-active rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                {contextBadge}
              </span>
              {roleLabel ? (
                <span className="theme-shell-button rounded-full px-3 py-1 text-[11px] font-medium">
                  {roleLabel}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-text-1 lg:text-2xl">{title}</h1>
              {!loading && headerCountLabel ? (
                <p className="theme-copy-soft pb-0.5 text-[12px] font-medium">{headerCountLabel}</p>
              ) : null}
            </div>
            {subtitle ? <p className="text-[13px] text-text-2">{subtitle}</p> : null}
            {operatorLabel ? (
              <div className="flex flex-wrap items-center gap-3 text-[12px]">
                <span className="theme-copy-soft">Operando como {operatorLabel}</span>
              </div>
            ) : null}
            {refreshing ? (
              <div className="theme-copy-soft flex items-center gap-2 text-[11px]">
                <Loader2 size={12} className="animate-spin" />
                <span>Atualizando painel</span>
              </div>
            ) : null}
          </div>

          <div className="w-full lg:max-w-[22rem]">
            <div className="theme-panel rounded-[20px] p-3">
              <div className="group relative w-full">
                <Search
                  className="theme-copy-soft absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-text-2"
                  size={14}
                />
                <input
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder="Buscar por titulo, categoria ou relato..."
                  className="theme-input w-full rounded-lg py-2.5 pl-9 pr-4 text-[14px] outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-5 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="theme-panel rounded-[22px] px-4 py-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <span className="theme-copy-soft text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {stat.label}
                </span>
                <p className="theme-copy-soft mt-1 text-[12px]">{stat.hint}</p>
              </div>
              <div
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
                style={{
                  color: stat.tone,
                  background: stat.surface,
                  borderColor: "color-mix(in srgb, var(--border-default) 72%, transparent)",
                }}
              >
                {stat.icon}
              </div>
            </div>
            <div className="font-mono text-xl font-semibold tracking-tighter text-text-1">
              {loading ? <Loader2 size={16} className="theme-copy-soft animate-spin" /> : stat.value}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
