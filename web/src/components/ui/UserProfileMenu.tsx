"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore, HubRole } from "@/store/useAuthStore";
import { getContextManifest } from "@/lib/context-registry";
import { resolveVisualContext } from "@/lib/context-identity";
import { Check, ChevronUp, ArrowLeftRight, LogOut, Repeat2 } from "lucide-react";

const AVATAR_COLORS: Record<string, string> = {
  dtic: "bg-accent-blue",
  sis: "bg-accent-wine",
  "sis-conservacao": "bg-accent-wine",
  "sis-manutencao": "bg-accent-olive",
  "sis-memoria": "bg-accent-wine",
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

export function UserProfileMenu({ expanded = false }: { expanded?: boolean }) {
  const router = useRouter();
  const params = useParams();
  const context = (params.context as string) || "dtic";
  const visualContext = resolveVisualContext(context);
  const manifest = getContextManifest(visualContext) || getContextManifest(context) || getContextManifest("dtic")!;

  const { currentUserRole, username, logout, setActiveContext, activeContext } = useAuthStore();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hubRoles = currentUserRole?.hub_roles || [];
  const activeProfile = currentUserRole?.roles?.active_profile;
  const activeHubRole =
    currentUserRole?.active_hub_role ||
    hubRoles.find((role) => resolveVisualContext(role.context_override || currentUserRole?.context) === visualContext) ||
    hubRoles.find((role) => role.profile_id === activeProfile?.id) ||
    hubRoles[0];

  const displayName = currentUserRole?.name || username || "Usuario";
  const roleName = activeHubRole?.label || activeProfile?.name || "Perfil";
  const initials = getInitials(displayName);
  const avatarColor = AVATAR_COLORS[visualContext] || "bg-accent-blue";
  const accentText = manifest.accentClass.split(" ")[2] || "text-accent-blue";
  const hasMultipleRoles = hubRoles.length > 1;

  function handleSwitchRole(hubRole: HubRole) {
    if (hubRole.role === activeHubRole?.role) {
      setIsOpen(false);
      return;
    }

    const newIdentity = {
      ...currentUserRole!,
      active_hub_role: hubRole,
    };
    if (hubRole.profile_id) {
      newIdentity.roles = {
        ...newIdentity.roles,
        active_profile: {
          id: hubRole.profile_id,
          name: hubRole.label,
        },
      };
    }

    const baseContext = (activeContext || context).includes("-")
      ? (activeContext || context).split("-")[0]
      : activeContext || context;
    const targetContext = resolveVisualContext(hubRole.context_override || baseContext);
    setActiveContext(targetContext, newIdentity);
    setIsOpen(false);
    router.push(`/${targetContext}/${hubRole.route}`);
  }

  function handleSwitchContext() {
    setIsOpen(false);
    router.push("/selector");
  }

  function handleLogout() {
    setIsOpen(false);
    if (typeof document !== "undefined") {
      document.cookie = "sessionToken=; path=/; max-age=0; samesite=strict";
    }
    logout();
    router.push("/");
  }

  const showDetails = expanded;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-all ${
          isOpen ? "theme-sidebar-button-active ring-1" : "theme-sidebar-button"
        }`}
        style={isOpen ? { borderColor: "var(--sidebar-border)" } : undefined}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${avatarColor} text-[11px] font-bold tracking-tight text-[var(--text-inverse)] shadow-lg`}
        >
          {initials}
        </div>

        <div className={`${showDetails ? "block" : "hidden lg:block"} min-w-0 flex-1 text-left`}>
          <p className="truncate text-[12px] font-semibold leading-tight text-[var(--sidebar-text-primary)]">{displayName}</p>
          <p className={`truncate text-[9px] font-bold uppercase tracking-wider ${accentText}`}>
            {roleName}
          </p>
        </div>

        <ChevronUp
          size={12}
          className={`${showDetails ? "block" : "hidden lg:block"} shrink-0 text-[var(--sidebar-text-muted)] transition-transform duration-200 ${
            isOpen ? "" : "rotate-180"
          }`}
        />
      </button>

      {isOpen ? (
        <div
          className="theme-sidebar absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2 fade-in duration-200 lg:w-56"
          style={{ boxShadow: "var(--sidebar-shadow)" }}
        >
          <div className="border-b px-4 py-3.5" style={{ borderColor: "var(--sidebar-border)" }}>
            <p className="truncate text-[12px] font-semibold text-[var(--sidebar-text-primary)]">{displayName}</p>
            <p className={`mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider ${accentText}`}>
              {roleName}
            </p>
          </div>

          {hasMultipleRoles ? (
            <div className="border-b" style={{ borderColor: "var(--sidebar-border)" }}>
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--sidebar-text-muted)]">
                  Trocar funcao
                </p>
              </div>
              <div className="space-y-1 px-2 pb-2">
                {hubRoles.map((hubRole) => (
                  <button
                    key={hubRole.role}
                    onClick={() => handleSwitchRole(hubRole)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[12px] transition-all ${
                      hubRole.role === activeHubRole?.role
                        ? `${accentText} theme-sidebar-button-active font-medium`
                        : "theme-sidebar-button"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Repeat2 size={12} className="shrink-0 opacity-50" />
                      <span className="truncate">{hubRole.label}</span>
                    </div>
                    {hubRole.role === activeHubRole?.role ? <Check size={12} className="shrink-0" /> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-1 p-2">
            <button
              onClick={handleSwitchContext}
              className="theme-sidebar-button flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] transition-all"
            >
              <ArrowLeftRight size={13} className="shrink-0 opacity-50" />
              <span>Trocar Contexto</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] transition-all hover:bg-red-400/[0.08] hover:text-red-400"
              style={{ color: "var(--sidebar-text-muted)" }}
            >
              <LogOut size={13} strokeWidth={2.5} className="shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
