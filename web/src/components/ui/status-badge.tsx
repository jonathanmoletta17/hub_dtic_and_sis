import React from "react";

function normalizeStatus(status: string) {
  return status
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

const STATUS_STYLES: Record<string, { color: string; background: string; label?: string }> = {
  novo: { color: "var(--status-new)", background: "var(--status-new-bg)" },
  "em atendimento": { color: "var(--status-active)", background: "var(--status-active-bg)" },
  planejado: { color: "var(--status-active)", background: "var(--status-active-bg)" },
  pendente: { color: "var(--status-pending)", background: "var(--status-pending-bg)" },
  solucionado: { color: "var(--status-solved)", background: "var(--status-solved-bg)" },
  fechado: { color: "var(--status-closed)", background: "var(--status-closed-bg)" },
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const normalized = normalizeStatus(status);
  const style = STATUS_STYLES[normalized] ?? STATUS_STYLES.fechado;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${className}`}
      style={{
        color: style.color,
        background: style.background,
        border: `1px solid color-mix(in srgb, ${style.color} 18%, transparent)`,
      }}
    >
      {style.label ?? status}
    </span>
  );
}
