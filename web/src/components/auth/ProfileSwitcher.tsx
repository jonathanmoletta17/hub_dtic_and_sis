"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore, HubRole } from "@/store/useAuthStore";
import { ChevronUp, Check } from "lucide-react";

export function ProfileSwitcher() {
  const router = useRouter();
  const params = useParams();
  const { currentUserRole, setActiveContext, activeContext } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentUserRole || !activeContext) return null;

  const hubRoles = currentUserRole.hub_roles || [];
  const activeProfile = currentUserRole.roles.active_profile;

  // Se o usuário só tiver 1 hubRole, não mostra a opção de troca
  if (hubRoles.length <= 1) return null;

  // Determinar qual hubRole está ativo com base na URL (SIS) ou profile_id (DTIC)
  const urlContext = (params.context as string) || activeContext;
  const activeHubRole = 
    currentUserRole.active_hub_role ||
    hubRoles.find(r => r.context_override === urlContext) || 
    hubRoles.find(r => r.profile_id === activeProfile?.id) || 
    hubRoles[0];

  const handleSwitchRole = (hubRole: HubRole) => {
    if (hubRole.role === activeHubRole?.role) {
      setIsOpen(false);
      return;
    }

    const newIdentity = {
      ...currentUserRole,
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

    // Usar context_override se presente (ex: sis-manutencao, sis-memoria)
    const targetContext = hubRole.context_override || activeContext;
    setActiveContext(targetContext, newIdentity);
    setIsOpen(false);

    // Roteamento direto pelo hubRole
    router.push(`/${targetContext}/${hubRole.route}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold tracking-wider text-accent-blue/80 hover:text-accent-blue hover:bg-accent-blue/10 border border-accent-blue/20 transition-all uppercase"
      >
        <span>Trocar Função</span>
        <ChevronUp size={12} className={`transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-52 bg-surface-1 border border-white/10 shadow-2xl rounded-xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="px-3 py-2 bg-white/5 border-b border-white/5">
            <p className="text-[10px] text-text-3 font-semibold uppercase tracking-widest">
              Alternar Papel
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {hubRoles.map(hr => (
              <button
                key={hr.role}
                onClick={() => handleSwitchRole(hr)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-sm transition-colors ${
                  hr.role === activeHubRole?.role 
                    ? 'bg-accent-blue/10 text-accent-blue' 
                    : 'text-text-2 hover:bg-surface-2 hover:text-text-1'
                }`}
              >
                <div className="truncate pr-2">{hr.label}</div>
                {hr.role === activeHubRole?.role && <Check size={14} className="shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
