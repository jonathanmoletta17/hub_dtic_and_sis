"use client";

import React from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { getContextManifest } from "@/lib/context-registry";
import { ShieldAlert } from "lucide-react";

interface ContextGuardProps {
  featureId: string;
  children: React.ReactNode;
}

export function ContextGuard({ featureId, children }: ContextGuardProps) {
  const { currentUserRole, activeContext, _hasHydrated } = useAuthStore();
  
  if (!_hasHydrated) return null; // Avoid hydration mismatch
  
  const manifest = getContextManifest(activeContext);
  const feature = manifest?.features.find(f => f.id === featureId);
  
  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-destructive">
        <ShieldAlert className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold">Funcionalidade Indisponível</h2>
        <p className="opacity-70">A funcionalidade "{featureId}" não existe neste contexto.</p>
      </div>
    );
  }

  // 1. Verificação de Role Herdada (Fase 1)
  if (feature.requiredRoles && feature.requiredRoles.length > 0) {
    const rolesFlat = currentUserRole?.hub_roles?.map(r => r.role) || [];
    const hasRole = rolesFlat.some(role => {
      if (feature.requiredRoles.includes(role)) return true;
      if (feature.requiredRoles.some(req => role.startsWith(req + '-'))) return true;
      return false;
    });

    if (!hasRole) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-destructive">
          <ShieldAlert className="w-12 h-12 mb-4" />
          <h2 className="text-xl font-bold">Acesso Negado</h2>
          <p className="opacity-70">Seu perfil não tem permissão para esta rota.</p>
        </div>
      );
    }
  }

  // 2. Verificação de App-Level Access (Abordagem C - Fase 1.5)
  if (feature.requireApp) {
    const appAccess = currentUserRole?.app_access || [];
    if (!appAccess.includes(feature.requireApp)) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-destructive">
          <ShieldAlert className="w-12 h-12 mb-4" />
          <h2 className="text-xl font-bold">Módulo Restrito</h2>
          <p className="opacity-70">Seu usuário não possui a tag <b>Hub-App-{feature.requireApp}</b>.</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
