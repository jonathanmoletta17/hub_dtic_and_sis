import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

import type { TicketStats } from "@/lib/api/types";

import type { DashboardOverviewStat } from "./DashboardOverviewHeader";

export function buildDashboardStatCards(stats: TicketStats | null): DashboardOverviewStat[] {
  const safeStats = stats
    ? {
        new: String(stats.new).padStart(2, "0"),
        inProgress: String(stats.inProgress).padStart(2, "0"),
        pending: String(stats.pending).padStart(2, "0"),
        solvedRecent: String(stats.solvedRecent).padStart(2, "0"),
      }
    : {
        new: "--",
        inProgress: "--",
        pending: "--",
        solvedRecent: "--",
      };

  return [
    {
      label: "Novos",
      hint: "Entrada recente",
      value: safeStats.new,
      icon: <AlertCircle size={16} />,
      tone: "var(--status-new)",
      surface: "var(--status-new-bg)",
    },
    {
      label: "Em atendimento",
      hint: "Inclui planejados",
      value: safeStats.inProgress,
      icon: <Clock size={16} />,
      tone: "var(--status-active)",
      surface: "var(--status-active-bg)",
    },
    {
      label: "Pendentes",
      hint: "Aguardando retorno",
      value: safeStats.pending,
      icon: <AlertCircle size={16} />,
      tone: "var(--status-pending)",
      surface: "var(--status-pending-bg)",
    },
    {
      label: "Resolvidos em 30 dias",
      hint: "Janela recente",
      value: safeStats.solvedRecent,
      icon: <CheckCircle2 size={16} />,
      tone: "var(--status-solved)",
      surface: "var(--status-solved-bg)",
    },
  ];
}
