"use client";

import React, { useEffect, useMemo } from "react";
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
  const isReady = _hasHydrated && isAuthenticated && activeContext && currentUserRole;

  const isAuthorized = useMemo(() => {
    if (!isReady) return false;
    if (requireContext && !activeContext.startsWith(requireContext)) return false;

    if (!allowedHubRoles || allowedHubRoles.length === 0) return true;

    const hubRoles = currentUserRole.hub_roles || [];
    const activeProfile = currentUserRole.roles?.active_profile;
    const urlContext = pathname.split('/')[1];
    const activeHubRole =
      currentUserRole.active_hub_role ||
      hubRoles.find(r => r.context_override === urlContext) ||
      hubRoles.find(r => r.profile_id === activeProfile?.id) ||
      hubRoles[0];

    if (!activeHubRole) return false;

    return allowedHubRoles.some(allowed =>
      activeHubRole.role === allowed || activeHubRole.role.startsWith(allowed + "-")
    );
  }, [isReady, requireContext, activeContext, allowedHubRoles, currentUserRole, pathname]);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    if (!activeContext || !currentUserRole) {
      router.push("/selector");
      return;
    }
  }, [isAuthenticated, activeContext, currentUserRole, router, _hasHydrated]);


  if (!_hasHydrated || !isReady) {
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
