"use client";

/**
 * AppSidebar — Componente global de sidebar para todas as páginas do contexto.
 *
 * Responsabilidades:
 *  1. Header padronizado (Brasão RS + Casa Civil + contexto)
 *  2. Nav dinâmico por role (lê de navigation.ts — Single Source of Truth)
 *  3. Highlight de rota ativa (via usePathname)
 *  4. UserBlock fixo na base (Badge + ProfileSwitcher + Trocar Contexto + Sair)
 *  5. Responsivo (mobile: w-16 ícones-only / desktop: lg:w-56 completo)
 */

import React from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard, Search, Ticket, BookOpen, User,
  ArrowLeftRight, LogOut, Truck
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ProfileSwitcher } from "@/components/auth/ProfileSwitcher";
import { resolveMenuItems, type NavItem } from "@/lib/constants/navigation";

// ─── Mapa de ícones (resolve string → componente) ───
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Search,
  Ticket,
  BookOpen,
  User,
  Truck,
};

// ─── Cores por contexto ───
const CONTEXT_COLORS: Record<string, { color: string; accent: string }> = {
  dtic:            { color: "text-accent-blue",   accent: "bg-accent-blue" },
  sis:             { color: "text-accent-orange",  accent: "bg-accent-orange" },
  "sis-manutencao": { color: "text-accent-orange",  accent: "bg-accent-orange" },
  "sis-memoria":   { color: "text-accent-violet",  accent: "bg-accent-violet" },
};

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const context = (params.context as string) || "dtic";

  const {
    currentUserRole,
    username,
    logout,
  } = useAuthStore();

  // Determinar se é técnico/gestor
  const hubRoles = currentUserRole?.hub_roles || [];
  const activeProfile = currentUserRole?.roles?.active_profile;
  const activeHubRole =
    currentUserRole?.active_hub_role ||
    hubRoles.find(r => r.context_override === context) ||
    hubRoles.find(r => r.profile_id === activeProfile?.id) ||
    hubRoles[0];

  const isTechOrManager =
    activeHubRole?.role === "tecnico" ||
    activeHubRole?.role === "gestor" ||
    activeHubRole?.role?.startsWith("tecnico-") || false;

  const isAdmin = activeHubRole?.role === "gestor";

  // Cores do contexto atual
  const colors = CONTEXT_COLORS[context] || CONTEXT_COLORS.dtic;

  // Montar menu via Single Source of Truth
  const menuItems = resolveMenuItems(context, isTechOrManager, isAdmin);

  // ─── Highlight de rota ativa ───
  function isActive(item: NavItem): boolean {
    if (!item.matchPath) return false;
    // "/user/profile" deve ter prioridade sobre "/user"
    // Ordena por especificidade (mais longo primeiro)
    if (item.matchPath === "/user/profile") {
      return pathname.includes("/user/profile");
    }
    if (item.matchPath === "/user") {
      return pathname.includes("/user") && !pathname.includes("/user/profile");
    }
    return pathname.includes(item.matchPath);
  }

  // ─── Logout ───
  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <aside className="w-16 lg:w-56 border-r border-white/[0.06] bg-surface-1/80 backdrop-blur-sm flex flex-col py-6 shrink-0">
      {/* ═══ Header: Brasão + Casa Civil ═══ */}
      <div className="px-3 lg:px-5 mb-8 flex items-center gap-2.5">
        <div className="w-8 h-8 flex items-center justify-center">
          <img
            src="/assets/branding/brasao_rs.svg"
            alt="Brasão RS"
            className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.05)]"
          />
        </div>
        <div className="hidden lg:block">
          <p className="font-semibold text-text-1 text-[14px] leading-tight">Casa Civil</p>
          <p className="text-text-3/50 text-[11px] uppercase tracking-widest">{context}</p>
        </div>
      </div>

      {/* ═══ Nav: Menu dinâmico ═══ */}
      <nav className="flex-grow px-2 lg:px-3 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const active = isActive(item);
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all text-[14px] ${
                active
                  ? "bg-white/[0.06] text-text-1 font-medium"
                  : "text-text-3/70 hover:text-text-2 hover:bg-white/[0.03]"
              }`}
            >
              {Icon && <Icon size={16} />}
              <span className="hidden lg:block">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ═══ Footer: UserBlock + Actions ═══ */}
      <div className="px-2 lg:px-3 pt-3 border-t border-white/[0.04] space-y-2">
        {/* Badge de perfil ativo */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.02]">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            isTechOrManager ? "bg-emerald-400" : colors.accent
          }`} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-text-2 truncate">
              {currentUserRole?.name || username || "Usuário"}
            </p>
            <p className={`text-[9px] uppercase tracking-wider font-bold truncate ${
              isTechOrManager ? "text-emerald-400/70" : `${colors.color}/70`
            }`}>
              {activeHubRole?.label || currentUserRole?.roles?.active_profile?.name || "Perfil"}
            </p>
          </div>
        </div>

        {/* ProfileSwitcher (TROCAR FUNÇÃO) */}
        <div className="hidden lg:block px-1">
          <ProfileSwitcher />
        </div>

        {/* Actions Row (Contexto + Sair) */}
        <div className="flex items-center justify-between gap-1.5 px-0.5 mt-2">
          {/* Trocar Contexto */}
          <button
            onClick={() => router.push("/selector")}
            title="Trocar Contexto"
            className="flex-1 flex items-center justify-center lg:justify-start gap-2.5 h-9 rounded-lg px-2 lg:px-2.5 text-text-3/60 hover:text-text-2 hover:bg-white/[0.04] transition-all text-[13px] font-medium border border-transparent hover:border-white/[0.05]"
          >
            <ArrowLeftRight size={16} />
            <span className="hidden lg:block">Contextos</span>
          </button>

          {/* Sair */}
          <button
            onClick={handleLogout}
            title="Sair"
            className="flex shrink-0 items-center justify-center w-9 h-9 rounded-lg text-text-3/40 hover:text-red-400/90 hover:bg-red-400/10 transition-all border border-transparent hover:border-red-400/20"
          >
            <LogOut size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
