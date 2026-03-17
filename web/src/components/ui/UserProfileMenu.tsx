"use client";

/**
 * UserProfileMenu — Menu unificado de perfil no footer da sidebar.
 *
 * Substitui os blocos fragmentados (Badge, ProfileSwitcher, Contexto, Sair)
 * por um único avatar com dropdown no padrão universal da web.
 */

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore, HubRole } from "@/store/useAuthStore";
import { getContextManifest } from "@/lib/context-registry";
import {
  Check, ChevronUp, ArrowLeftRight, LogOut, Repeat2
} from "lucide-react";

// Cor de fundo do avatar por contexto
const AVATAR_COLORS: Record<string, string> = {
  dtic: "bg-accent-blue",
  sis: "bg-accent-amber",
  "sis-manutencao": "bg-accent-amber",
  "sis-memoria": "bg-purple-500",
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

export function UserProfileMenu() {
  const router = useRouter();
  const params = useParams();
  const context = (params.context as string) || "dtic";
  const manifest = getContextManifest(context) || getContextManifest("dtic")!;

  const {
    currentUserRole,
    username,
    logout,
    setActiveContext,
    activeContext,
  } = useAuthStore();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dados do usuário
  const hubRoles = currentUserRole?.hub_roles || [];
  const activeProfile = currentUserRole?.roles?.active_profile;
  const activeHubRole =
    currentUserRole?.active_hub_role ||
    hubRoles.find(r => r.context_override === context) ||
    hubRoles.find(r => r.profile_id === activeProfile?.id) ||
    hubRoles[0];

  const displayName = currentUserRole?.name || username || "Usuário";
  const roleName = activeHubRole?.label || activeProfile?.name || "Perfil";
  const initials = getInitials(displayName);
  const avatarColor = AVATAR_COLORS[context] || "bg-accent-blue";
  const accentText = manifest.accentClass.split(" ")[2] || "text-accent-blue";
  const hasMultipleRoles = hubRoles.length > 1;

  // ─── Handlers ───

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
      : (activeContext || context);
    const targetContext = hubRole.context_override || baseContext;
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
    if (typeof document !== 'undefined') {
      document.cookie = 'sessionToken=; path=/; max-age=0; samesite=strict';
    }
    logout();
    router.push("/");
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* ═══ Trigger: Avatar + Nome ═══ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2.5 px-2 lg:px-2.5 py-2 rounded-lg transition-all ${
          isOpen
            ? "bg-white/[0.08] ring-1 ring-white/[0.08]"
            : "hover:bg-white/[0.04]"
        }`}
      >
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center shrink-0 text-white text-[11px] font-bold tracking-tight shadow-lg shadow-black/20`}>
          {initials}
        </div>

        {/* Nome + Função (desktop only) */}
        <div className="hidden lg:block min-w-0 text-left flex-1">
          <p className="text-[12px] font-semibold text-text-1 truncate leading-tight">
            {displayName}
          </p>
          <p className={`text-[9px] uppercase tracking-wider font-bold truncate ${accentText}`}>
            {roleName}
          </p>
        </div>

        {/* Chevron (desktop only) */}
        <ChevronUp
          size={12}
          className={`hidden lg:block text-text-3/40 shrink-0 transition-transform duration-200 ${
            isOpen ? "" : "rotate-180"
          }`}
        />
      </button>

      {/* ═══ Dropdown (abre para cima) ═══ */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 right-0 lg:w-52 bg-surface-1/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40 rounded-xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
          {/* Header do dropdown */}
          <div className="px-3.5 py-3 border-b border-white/[0.06]">
            <p className="text-[12px] font-semibold text-text-1 truncate">
              {displayName}
            </p>
            <p className={`text-[10px] uppercase tracking-wider font-bold truncate mt-0.5 ${accentText}`}>
              {roleName}
            </p>
          </div>

          {/* Trocar Função (se houver múltiplos roles) */}
          {hasMultipleRoles && (
            <div className="border-b border-white/[0.06]">
              <div className="px-3.5 py-1.5">
                <p className="text-[9px] text-text-3/50 font-semibold uppercase tracking-widest">
                  Trocar Função
                </p>
              </div>
              <div className="px-1.5 pb-1.5 space-y-0.5">
                {hubRoles.map((hr) => (
                  <button
                    key={hr.role}
                    onClick={() => handleSwitchRole(hr)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 text-left rounded-lg text-[12px] transition-all ${
                      hr.role === activeHubRole?.role
                        ? `bg-white/[0.06] ${accentText} font-medium`
                        : "text-text-2 hover:bg-white/[0.04] hover:text-text-1"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Repeat2 size={12} className="shrink-0 opacity-50" />
                      <span className="truncate">{hr.label}</span>
                    </div>
                    {hr.role === activeHubRole?.role && (
                      <Check size={12} className="shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="p-1.5 space-y-0.5">
            {/* Trocar Contexto */}
            <button
              onClick={handleSwitchContext}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-text-2 hover:bg-white/[0.04] hover:text-text-1 transition-all"
            >
              <ArrowLeftRight size={13} className="shrink-0 opacity-50" />
              <span>Trocar Contexto</span>
            </button>

            {/* Sair */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-text-3/60 hover:text-red-400 hover:bg-red-400/[0.08] transition-all"
            >
              <LogOut size={13} strokeWidth={2.5} className="shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
