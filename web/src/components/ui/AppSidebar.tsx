"use client";

/**
 * AppSidebar — Componente global de sidebar para todas as páginas do contexto.
 *
 * Responsabilidades:
 *  1. Header padronizado (Brasão RS + Casa Civil + contexto)
 *  2. Nav dinâmico por role (lê de context-registry.ts — Single Source of Truth)
 *  3. Highlight de rota ativa (via usePathname)
 *  4. UserProfileMenu unificado na base (avatar + dropdown)
 *  5. Responsivo (mobile: w-16 ícones-only / desktop: lg:w-56 completo)
 */

import React from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard, Search, Ticket, BookOpen, User,
  Truck, Cpu, Network, PlusSquare, Wrench, Landmark, Database, Shield
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { UserProfileMenu } from "@/components/ui/UserProfileMenu";
import { resolveMenuItems, getContextManifest, FeatureManifest } from "@/lib/context-registry";

// ─── Mapa de ícones (resolve string → componente) ───
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Search,
  Ticket,
  BookOpen,
  User,
  Truck,
  Cpu,
  Network,
  PlusSquare,
  Wrench,
  Landmark,
  Database,
  Shield
};

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const context = (params.context as string) || "dtic";

  const { currentUserRole } = useAuthStore();

  // Determinar hubRole ativo
  const hubRoles = currentUserRole?.hub_roles || [];
  const activeProfile = currentUserRole?.roles?.active_profile;
  const activeHubRole =
    currentUserRole?.active_hub_role ||
    hubRoles.find(r => r.context_override === context) ||
    hubRoles.find(r => r.profile_id === activeProfile?.id) ||
    hubRoles[0];

  // Montar menu via Single Source of Truth
  const rolesArr = activeHubRole ? [activeHubRole.role] : [];
  const appAccess = currentUserRole?.app_access || [];
  const menuItems = resolveMenuItems(context, rolesArr, appAccess);

  // ─── Highlight de rota ativa ───
  function isActive(item: FeatureManifest): boolean {
    if (!item.route) return false;
    if (pathname === item.route) return true;

    if (item.route === `/${context}/user/profile`) {
      return pathname.includes("/user/profile");
    }
    if (item.route === `/${context}/user`) {
      return pathname.includes("/user") && !pathname.includes("/user/profile");
    }
    return pathname.includes(item.route);
  }

  return (
    <aside className="w-16 lg:w-56 border-r border-white/[0.06] bg-surface-1/80 backdrop-blur-sm flex flex-col py-6 shrink-0">
      {/* ═══ Header: Identidade Institucional ═══ */}
      <div className="px-3 lg:px-5 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center shrink-0">
          <img
            src="/assets/branding/brasao_rs.svg"
            alt="Brasão RS"
            className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.08)]"
          />
        </div>
        <div className="hidden lg:block min-w-0">
          <p className="font-bold text-text-1 text-[13px] leading-tight">Casa Civil do Estado do RS</p>
          <p className="text-text-3/60 text-[10px] leading-tight mt-0.5 truncate">
            {context === "dtic" && "Departamento de Tecnologia da Informação (DTIC)"}
            {context.startsWith("sis") && "Sistema de Infraestrutura e Serviços (SIS)"}
          </p>
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
              onClick={() => router.push(item.route)}
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

      {/* ═══ Footer: Menu de Perfil Unificado ═══ */}
      <div className="px-2 lg:px-3 pt-3 border-t border-white/[0.04]">
        <UserProfileMenu />
      </div>
    </aside>
  );
}
