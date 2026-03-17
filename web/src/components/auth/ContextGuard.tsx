"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";

import { getContextManifest } from "@/lib/context-registry";
import { useAuthStore } from "@/store/useAuthStore";

interface ContextGuardProps {
  featureId: string;
  children: React.ReactNode;
}

function hasAppAccess(requireApp: string | undefined, appAccess: string[]): boolean {
  if (!requireApp) return true;
  const candidates = requireApp
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  if (candidates.length === 0) return true;
  return candidates.some((candidate) => appAccess.includes(candidate));
}

export function ContextGuard({ featureId, children }: ContextGuardProps) {
  const {
    currentUserRole,
    activeContext,
    getActiveHubRoleForContext,
    _hasHydrated,
  } = useAuthStore();

  if (!_hasHydrated) return null;

  const manifest = getContextManifest(activeContext);
  const feature = manifest?.features.find((item) => item.id === featureId);

  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-destructive">
        <ShieldAlert className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold">Funcionalidade Indisponível</h2>
        <p className="opacity-70">
          A funcionalidade &quot;{featureId}&quot; não existe neste contexto.
        </p>
      </div>
    );
  }

  if (feature.requiredRoles && feature.requiredRoles.length > 0) {
    const activeRole = getActiveHubRoleForContext(activeContext)?.role || null;
    const hasRole = !!activeRole && (
      feature.requiredRoles.includes(activeRole)
      || feature.requiredRoles.some((requiredRole) => activeRole.startsWith(requiredRole + "-"))
    );

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

  if (feature.requireApp) {
    const appAccess = currentUserRole?.app_access || [];
    if (!hasAppAccess(feature.requireApp, appAccess)) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-destructive">
          <ShieldAlert className="w-12 h-12 mb-4" />
          <h2 className="text-xl font-bold">Módulo Restrito</h2>
          <p className="opacity-70">
            Seu usuário não possui a(s) tag(s) necessária(s):{" "}
            <b>Hub-App-{feature.requireApp}</b>.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
