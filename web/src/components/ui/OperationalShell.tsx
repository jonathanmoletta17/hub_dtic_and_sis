"use client";

import React, { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { ContextLiveSync } from "@/components/realtime/ContextLiveSync";
import { AppSidebar } from "@/components/ui/AppSidebar";
import { AuroraMesh } from "@/components/ui/aurora-mesh";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getContextManifest, getContextTheme } from "@/lib/context-registry";
import { resolveVisualContext } from "@/lib/context-identity";
import {
  getMvpDefaultRoute,
  getMvpMenuItems,
  getMvpPageTitle,
  getMvpUnavailableMessage,
  isMvpRouteAllowed,
} from "@/lib/mvp-navigation";
import { useAuthStore } from "@/store/useAuthStore";

export function OperationalShell({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const context = params.context as string;
  const visualContext = resolveVisualContext(context);
  const themeClass = getContextTheme(visualContext);
  const manifest = getContextManifest(visualContext) || getContextManifest(context) || getContextManifest("dtic");
  const { currentUserRole } = useAuthStore();

  const hubRoles = currentUserRole?.hub_roles || [];
  const activeProfile = currentUserRole?.roles?.active_profile;
  const activeHubRole =
    currentUserRole?.active_hub_role ||
    hubRoles.find((role) => resolveVisualContext(role.context_override || currentUserRole?.context) === visualContext) ||
    hubRoles.find((role) => role.profile_id === activeProfile?.id) ||
    hubRoles[0];

  const rolesArr = activeHubRole ? [activeHubRole.role] : [];
  const appAccess = currentUserRole?.app_access || [];
  const menuItems = getMvpMenuItems(context, rolesArr, appAccess);
  const pageTitle = getMvpPageTitle(pathname, context);
  const routeAllowed = isMvpRouteAllowed(pathname, context);
  const fallbackRoute = getMvpDefaultRoute(context, rolesArr, appAccess);
  const unavailable = getMvpUnavailableMessage(context);

  return (
    <div className={`min-h-dvh transition-colors duration-700 ${themeClass}`}>
      <ContextLiveSync context={context} />
      <AuroraMesh />

      <div className="relative z-10 flex min-h-dvh flex-col overflow-visible lg:h-screen lg:min-h-0 lg:flex-row lg:overflow-hidden">
        <div className="hidden shrink-0 lg:flex">
          <AppSidebar items={menuItems} variant="desktop" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-visible lg:overflow-hidden">
          <header className="border-b px-4 py-3 backdrop-blur-sm lg:hidden" style={{ borderColor: "var(--border-subtle)", background: "color-mix(in srgb, var(--bg-surface) 88%, transparent)" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="theme-shell-button inline-flex h-10 w-10 items-center justify-center rounded-xl"
                  aria-label="Abrir menu"
                >
                  <Menu size={18} />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-text-3/75">
                    {manifest?.label ?? context.toUpperCase()}
                  </p>
                  <h1 className="truncate text-[15px] font-semibold text-text-1">{pageTitle}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle className="hidden sm:inline-flex" />
                <button
                  type="button"
                  onClick={() => router.push("/selector")}
                  className="theme-shell-button rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                >
                  Ambientes
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-visible lg:min-h-0 lg:overflow-hidden">
            {routeAllowed ? (
              children
            ) : (
              <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-8 lg:h-full lg:min-h-0">
                <div className="theme-panel w-full max-w-md rounded-3xl p-6 text-center backdrop-blur-sm">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-3/75">
                    MVP Operacional
                  </p>
                  <h2 className="mb-3 text-2xl font-bold text-text-1">{unavailable.title}</h2>
                  <p className="mb-6 text-sm leading-relaxed text-text-2/85">
                    {unavailable.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(fallbackRoute)}
                    className="theme-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
                  >
                    Ir para o fluxo principal
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 lg:hidden ${
          mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ background: "var(--bg-overlay)" }}
        onClick={() => setMobileMenuOpen(false)}
      />

      <div
        className={`theme-sidebar fixed inset-y-0 left-0 z-50 flex w-[18.5rem] max-w-[88vw] transform flex-col border-r backdrop-blur-xl transition-transform duration-300 lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ boxShadow: "var(--sidebar-shadow)" }}
      >
        <div className="flex items-center justify-between border-b px-4 py-4" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--sidebar-text-muted)]">
              {manifest?.label ?? context.toUpperCase()}
            </p>
            <p className="truncate text-sm font-medium text-[var(--sidebar-text-primary)]">{pageTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="theme-sidebar-surface theme-sidebar-button inline-flex h-9 w-9 items-center justify-center rounded-xl"
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>
        <div className="border-b px-4 py-3" style={{ borderColor: "var(--sidebar-border)" }}>
          <ThemeToggle variant="sidebar" className="w-full justify-center" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AppSidebar items={menuItems} variant="mobile" onNavigate={() => setMobileMenuOpen(false)} />
        </div>
      </div>
    </div>
  );
}
