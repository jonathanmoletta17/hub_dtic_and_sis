"use client";

import { AlertTriangle, Boxes, Building2, MapPin, ShieldAlert } from "lucide-react";

import type { InventorySummary } from "@/lib/api/models/inventory";

interface InventoryKpiCardsProps {
  summary: InventorySummary | null;
  loading: boolean;
}

export function InventoryKpiCards({ summary, loading }: InventoryKpiCardsProps) {
  const cards = [
    { label: "Total de ativos", value: summary?.totalAssets ?? 0, icon: Boxes, tone: "neutral" as const },
    { label: "Sem responsável", value: summary?.missingOwner ?? 0, icon: ShieldAlert, tone: "critical" as const },
    { label: "Sem localidade", value: summary?.missingLocation ?? 0, icon: MapPin, tone: "warning" as const },
    { label: "Sem grupo técnico", value: summary?.missingTechGroup ?? 0, icon: Building2, tone: "warning" as const },
    { label: "Inventário desatualizado", value: summary?.staleInventory ?? 0, icon: AlertTriangle, tone: "critical" as const },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const toneClass =
          card.tone === "critical"
            ? "border-red-400/25 bg-red-500/[0.04]"
            : card.tone === "warning"
              ? "border-amber-400/20 bg-amber-500/[0.03]"
              : "border-white/[0.06]";
        return (
          <article key={card.label} className={`bg-surface-2 border rounded-xl p-4 ${toneClass}`}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-text-3/60 uppercase tracking-wide">{card.label}</span>
              <Icon size={15} className="text-text-3/40" />
            </div>
            <p className="text-2xl font-semibold mt-2">{loading ? "--" : card.value}</p>
          </article>
        );
      })}
    </section>
  );
}
