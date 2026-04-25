"use client";

import React from "react";
import Image from "next/image";
import { usePathname, useParams, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Cpu,
  Database,
  Landmark,
  LayoutDashboard,
  Network,
  PlusSquare,
  Search,
  Shield,
  Ticket,
  Truck,
  User,
  Wrench,
} from "lucide-react";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserProfileMenu } from "@/components/ui/UserProfileMenu";
import { FeatureManifest, getContextManifest, resolveMenuItems } from "@/lib/context-registry";
import { useAuthStore, type AuthMeResponse } from "@/store/useAuthStore";

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
  Shield,
  BarChart3,
};

interface AppSidebarProps {
  collapsed?: boolean;
  items?: FeatureManifest[];
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
  contextOverride?: string;
  pathnameOverride?: string;
  currentUserRoleOverride?: AuthMeResponse | null;
  showProfileMenu?: boolean;
}

export function AppSidebar({
  collapsed = false,
  items,
  variant = "desktop",
  onNavigate,
  contextOverride,
  pathnameOverride,
  currentUserRoleOverride,
  showProfileMenu = true,
}: AppSidebarProps) {
  const router = useRouter();
  const currentPathname = usePathname();
  const pathname = pathnameOverride ?? currentPathname;
  const params = useParams();
  const context = contextOverride ?? ((params.context as string) || "dtic");
  const manifest = getContextManifest(context) || getContextManifest("dtic")!;
  const { currentUserRole: currentUserRoleFromStore } = useAuthStore();
  const currentUserRole = currentUserRoleOverride ?? currentUserRoleFromStore;

  const hubRoles = currentUserRole?.hub_roles || [];
  const activeProfile = currentUserRole?.roles?.active_profile;
  const activeHubRole =
    currentUserRole?.active_hub_role ||
    hubRoles.find((role) => role.context_override === context) ||
    hubRoles.find((role) => role.profile_id === activeProfile?.id) ||
    hubRoles[0];

  const rolesArr = activeHubRole ? [activeHubRole.role] : [];
  const appAccess = currentUserRole?.app_access || [];
  const menuItems = items ?? resolveMenuItems(context, rolesArr, appAccess);
  const accentBgClass = manifest.accentClass.split(" ")[0] || "bg-accent-blue";
  const accentTextClass = manifest.accentClass.split(" ")[2] || "text-accent-blue";

  const isDesktop = variant === "desktop";
  const showLabels = variant === "mobile" || !collapsed;

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
    <aside
      className={`${
        collapsed
          ? "w-0 overflow-hidden border-r-0 py-0"
          : isDesktop
            ? "w-16 border-r py-5 lg:w-56"
            : "h-full w-full py-4"
      } theme-sidebar flex shrink-0 flex-col backdrop-blur-sm transition-all duration-300`}
      aria-hidden={collapsed}
    >
      <div className={`mb-5 ${isDesktop ? "px-3 lg:px-4" : "px-4"}`}>
        <div className="theme-sidebar-surface rounded-2xl p-3 lg:p-3.5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border lg:h-11 lg:w-11" style={{ background: "var(--sidebar-button-active-bg)", borderColor: "var(--sidebar-button-active-border)" }}>
              <Image
                src="/assets/branding/brasao_rs.svg"
                alt="Brasao RS"
                fill
                sizes="44px"
                className="object-contain p-1.5"
              />
            </div>
            <div className={`${showLabels ? "block" : "hidden lg:block"} min-w-0 flex-1`}>
              <p className="text-[13px] font-bold leading-tight text-[var(--sidebar-text-primary)]">
                Casa Civil do Estado do RS
              </p>
              <p className="mt-0.5 truncate text-[10px] leading-tight text-[var(--sidebar-text-muted)]">
                {context === "dtic" && "Departamento de Tecnologia da Informacao"}
                {context.startsWith("sis") && "Sistema de Infraestrutura e Servicos"}
              </p>
            </div>
          </div>

          <div className={`${showLabels ? "flex" : "hidden lg:flex"} mt-3 items-center gap-2 border-t pt-3`} style={{ borderColor: "var(--sidebar-border)" }}>
            <span className={`h-1.5 w-1.5 rounded-full ${accentBgClass}`} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${accentTextClass}`}>
              {manifest.label}
            </span>
          </div>
        </div>
      </div>

      <nav className={`flex-grow space-y-1 ${isDesktop ? "px-2.5 lg:px-3" : "px-3"}`}>
        {menuItems.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const active = isActive(item);

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                onNavigate?.();
                router.push(item.route);
              }}
              aria-current={active ? "page" : undefined}
              className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] transition-all ${
                active
                  ? "theme-sidebar-button-active font-semibold"
                  : "theme-sidebar-button"
              }`}
            >
              {Icon ? (
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all"
                  style={
                    active
                      ? {
                          background: "var(--sidebar-button-active-bg)",
                          border: "1px solid var(--sidebar-button-active-border)",
                          color: "var(--sidebar-button-active-color)",
                        }
                      : {
                          background: "var(--sidebar-surface)",
                          border: "1px solid var(--sidebar-border)",
                        }
                  }
                >
                  <Icon size={15} />
                </span>
              ) : null}
              <span className={`${showLabels ? "block" : "hidden lg:block"} min-w-0 truncate`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className={`${isDesktop ? "px-2.5 lg:px-3" : "px-3"} pb-2 pt-3`}>
        <ThemeToggle variant="sidebar" className="w-full justify-center" />
      </div>

      {showProfileMenu ? (
        <div className={`${isDesktop ? "px-2.5 lg:px-3" : "px-3"} pb-1 pt-2`}>
          <div className="theme-sidebar-surface rounded-2xl p-1.5">
            <UserProfileMenu expanded={variant === "mobile"} />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
