"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2, ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Papéis de uso permitidos (ex: ["solicitante", "tecnico", "gestor"]). Se vazio, qualquer papel autenticado pode acessar. */
  allowedHubRoles?: string[];
  /** Ex: "dtic" ou "sis". Se o usuário tentou acessar /dtic mas está logado em /sis, bloqueia. */
  requireContext?: string; 
}

export function ProtectedRoute({
  children,
  allowedHubRoles,
  requireContext,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, activeContext, currentUserRole, _hasHydrated } = useAuthStore();
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 0. Aguarda Hidratação do Zustand
    if (!_hasHydrated) return;

    // 1. Não está logado no root
    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    // 2. Não escolheu contexto no Seletor
    if (!activeContext || !currentUserRole) {
      router.push("/selector");
      return;
    }

    // 3. Verificação de Contexto Rígido (Cross-Context Bloqueado)
    if (requireContext && !activeContext.startsWith(requireContext)) {
      setIsAuthorized(false);
      setIsAuthorizing(false);
      return;
    }

    // 4. Verificação de Papel de Uso Ativo (active_profile)
    let hasAccess = true;
    if (allowedHubRoles && allowedHubRoles.length > 0) {
      const hubRoles = currentUserRole.hub_roles || [];
      const activeProfile = currentUserRole.roles?.active_profile;
      
      // Resolução de Role baseada na URL Contextualizada como prioridade (SIS)
      // senão cai no Profile matching (DTIC)
      const urlContext = pathname.split('/')[1];
      const activeHubRole = 
        currentUserRole.active_hub_role ||
        hubRoles.find(r => r.context_override === urlContext) || 
        hubRoles.find(r => r.profile_id === activeProfile?.id) || 
        hubRoles[0];
      
      if (activeHubRole) {
        // Verifica se a role ativa completa (ex: tecnico-manutencao) ou o radical (ex: tecnico) está permitido
        hasAccess = allowedHubRoles.some(allowed => 
          activeHubRole.role === allowed || activeHubRole.role.startsWith(allowed + "-")
        );
      } else {
        hasAccess = false;
      }
    }

    setIsAuthorized(hasAccess);
    setIsAuthorizing(false);

  }, [isAuthenticated, activeContext, currentUserRole, pathname, router, requireContext, allowedHubRoles, _hasHydrated]);


  if (!_hasHydrated || isAuthorizing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-main text-text-1">
        <Loader2 className="animate-spin text-accent-blue" size={32} />
      </div>
    );
  }

  if (!isAuthorized) {
    const activeRoleName = currentUserRole?.hub_roles?.find(
      r => r.profile_id === currentUserRole?.roles?.active_profile?.id
    )?.label || currentUserRole?.roles?.active_profile?.name || 'Desconhecido';

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-main text-center p-6">
        <div className="w-16 h-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mb-6">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-3xl font-extrabold text-text-1 mb-2">Acesso Negado</h1>
        <p className="text-text-2 mb-8 max-w-md">
          Seu papel ({activeRoleName}) não tem permissão para visualizar esta tela neste contexto.
        </p>
        <button 
          onClick={() => router.push("/selector")}
          className="px-6 py-2.5 bg-surface-2 hover:bg-surface-3 transition-colors rounded-lg font-medium text-text-1 border border-white/5"
        >
          Voltar aos Ambientes
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
