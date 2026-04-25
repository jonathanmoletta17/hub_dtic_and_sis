"use client";

import { ArrowRight, Loader2 } from "lucide-react";

import { CategoryBadge } from "@/components/ui/category-badge";
import type { PortalServiceDefinition } from "@/lib/portal-contexts";

interface PortalServiceCardProps {
  service: PortalServiceDefinition;
  variant: "active" | "pending";
  loadingAction?: string | null;
  onAction?: (service: PortalServiceDefinition, href: string) => void;
  disabled?: boolean;
}

export function PortalServiceCard({
  service,
  variant,
  loadingAction = null,
  onAction,
  disabled = false,
}: PortalServiceCardProps) {
  const Icon = service.icon;

  if (variant === "active") {
    return (
      <article className="theme-card theme-card-interactive group relative overflow-hidden rounded-[28px] p-6 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 lg:p-8">
        <div className={`pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full blur-[100px] ${service.glowClass}`} />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div>
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm"
                style={{
                  background: "color-mix(in srgb, var(--accent-primary-subtle) 62%, var(--bg-surface) 38%)",
                  borderColor: "color-mix(in srgb, var(--accent-primary) 16%, var(--border-default) 84%)",
                }}
              >
                <Icon size={24} className={service.accentClass} />
              </div>
              <div>
                <div className="theme-copy-soft text-[11px] font-semibold uppercase tracking-[0.22em]">
                  {service.shortLabel}
                </div>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-text-1">{service.title}</h3>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-text-2">{service.description}</p>

            <CategoryBadge className="mt-5 w-fit text-[11px] font-semibold uppercase tracking-[0.18em]">
              {service.statusLabel}
            </CategoryBadge>
          </div>

          <div
            className="flex flex-col justify-between gap-5 border-t pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div
              className="rounded-[24px] border px-4 py-4"
              style={{
                borderColor: "var(--border-subtle)",
                background: "color-mix(in srgb, var(--bg-surface-alt) 76%, transparent)",
              }}
            >
              <p className="theme-copy-muted text-sm leading-7">{service.note}</p>
            </div>
            <div className="grid gap-3">
              {service.actions.map((action, actionIndex) => {
                const actionKey = `${service.id}:${action.href}`;
                const isLoading = loadingAction === actionKey;
                const actionClass =
                  actionIndex === 0
                    ? "theme-button-primary text-left"
                    : "theme-shell-button-active text-left";

                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => onAction?.(service, action.href)}
                    disabled={disabled}
                    className={`${actionClass} inline-flex items-center justify-between rounded-full px-4 py-3 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-70`}
                  >
                    <span>{isLoading ? "Preparando contexto..." : action.label}</span>
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="theme-panel relative overflow-hidden rounded-[28px] p-6 backdrop-blur-sm">
      <div className={`pointer-events-none absolute -right-16 top-0 h-44 w-44 rounded-full blur-[100px] ${service.glowClass}`} />
      <div className="relative">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm"
            style={{
              background: "color-mix(in srgb, var(--accent-primary-subtle) 58%, var(--bg-surface) 42%)",
              borderColor: "color-mix(in srgb, var(--accent-primary) 14%, var(--border-default) 86%)",
            }}
          >
            <Icon size={22} className={service.accentClass} />
          </div>
          <div>
            <div className="theme-copy-soft text-[11px] font-semibold uppercase tracking-[0.22em]">
              {service.shortLabel}
            </div>
            <h3 className="mt-1 text-xl font-bold tracking-tight text-text-1">{service.title}</h3>
          </div>
        </div>

        <p className="mt-5 text-sm leading-7 text-text-2">{service.description}</p>
        <CategoryBadge className="mt-5 w-fit text-[11px] font-semibold uppercase tracking-[0.18em]">
          {service.statusLabel}
        </CategoryBadge>
        <div
          className="mt-4 rounded-[22px] border px-4 py-4"
          style={{
            borderColor: "var(--border-subtle)",
            background: "color-mix(in srgb, var(--bg-surface-alt) 78%, transparent)",
          }}
        >
          <p className="theme-copy-muted text-sm leading-7">{service.note}</p>
        </div>
      </div>
    </article>
  );
}
