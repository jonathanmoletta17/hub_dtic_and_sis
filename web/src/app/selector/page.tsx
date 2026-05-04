"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Wrench,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  Network,
  Landmark,
} from "lucide-react";

import { useAuthStore, AuthMeResponse, type HubRole } from "@/store/useAuthStore";
import { WorkspaceSelectorCard } from "@/app/selector/_components/WorkspaceSelectorCard";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getContextManifest } from "@/lib/context-registry";
import {
  getContextIdentity,
  resolveApiRootContext,
  resolveVisualContext,
  VISIBLE_CONTEXT_IDS,
} from "@/lib/context-identity";
import { apiLogin } from "@/lib/api/glpiService";

function writeSessionCookie(sessionToken?: string) {
  if (!sessionToken) return;
  document.cookie = `sessionToken=${sessionToken}; path=/; max-age=86400; samesite=strict`;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Network: <Network size={28} />,
  Wrench: <Wrench size={28} />,
  Landmark: <Landmark size={28} />,
};

function getRolePriority(roleName: string) {
  if (roleName === "gestor") return 3;
  if (roleName.startsWith("tecnico")) return 2;
  return 1;
}

function selectPreferredHubRole(identity: AuthMeResponse, selectedContext: string): HubRole | null {
  const selectedVisualContext = resolveVisualContext(selectedContext);
  const hubRoles = identity.hub_roles || [];
  if (hubRoles.length === 0) return null;

  const matchingRoles = hubRoles.filter(
    (role) => resolveVisualContext(role.context_override || identity.context) === selectedVisualContext,
  );
  const candidates = matchingRoles.length > 0 ? matchingRoles : hubRoles;

  return [...candidates].sort((a, b) => getRolePriority(b.role) - getRolePriority(a.role))[0] ?? null;
}

export default function WorkspaceSelectorPage() {
  const router = useRouter();
  const { username, getCredentials, setActiveContext, cacheContextSession, getCachedSession } =
    useAuthStore();
  const [loadingContext, setLoadingContext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workspaces = VISIBLE_CONTEXT_IDS.flatMap((workspaceId) => {
    const manifest = getContextManifest(workspaceId);
    return manifest
      ? [{
          id: workspaceId,
          manifest,
          identity: getContextIdentity(workspaceId),
        }]
      : [];
  });

  const handleWorkspaceSelection = async (workspaceId: string) => {
    if (loadingContext) return;
    const authContext = resolveApiRootContext(workspaceId);
    const selectedVisualContext = resolveVisualContext(workspaceId);
    setLoadingContext(workspaceId);
    setError(null);

    const redirectByPriority = (identity: AuthMeResponse) => {
      const primaryRole = selectPreferredHubRole(identity, workspaceId);
      const roleVisualContext = primaryRole
        ? resolveVisualContext(primaryRole.context_override || identity.context)
        : selectedVisualContext;
      const targetContext = roleVisualContext === selectedVisualContext ? roleVisualContext : selectedVisualContext;

      const activeIdentity = {
        ...identity,
        active_hub_role: primaryRole || undefined,
        roles: {
          ...identity.roles,
          active_profile: primaryRole?.profile_id
            ? { id: primaryRole.profile_id, name: primaryRole.label }
            : identity.roles?.active_profile || identity.roles?.available_profiles?.[0],
        },
      };

      if (typeof document !== "undefined" && identity.session_token) {
        writeSessionCookie(identity.session_token);
      }

      setActiveContext(targetContext, activeIdentity);
      router.push(`/${targetContext}/${primaryRole?.route || "user"}`);
    };

    const cached = getCachedSession(workspaceId) || getCachedSession(authContext);
    if (cached) {
      redirectByPriority(cached);
      return;
    }

    const credentials = getCredentials();
    if (!credentials) {
      router.push("/");
      return;
    }

    try {
      const identity = await apiLogin(authContext, {
        username: credentials.username,
        password: credentials.password,
      });

      if (identity.session_token) {
        writeSessionCookie(identity.session_token);
      }

      cacheContextSession(authContext, identity);
      cacheContextSession(workspaceId, identity);
      redirectByPriority(identity);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Falha de rede ao se conectar ao servidor do GLPI.";
      console.error("Erro na autenticacao real:", err);
      setError(message);
      setLoadingContext(null);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden px-4 py-24 sm:p-10 lg:h-screen lg:max-h-screen lg:overflow-hidden">
      <div className="aurora-mesh" />

      <div className="absolute left-4 top-4 z-50 animate-in slide-in-from-left-4 fade-in duration-700 sm:fixed sm:left-8 sm:top-8">
        <button
          onClick={() => router.push("/")}
          className="theme-shell-button group flex items-center gap-3 rounded-full px-3 py-2 backdrop-blur-md transition-colors duration-300 sm:px-4"
        >
          <ArrowLeft
            size={16}
            className="theme-copy-soft transition-[color,transform] group-hover:-translate-x-1 group-hover:text-text-1"
          />
          <span className="theme-copy-soft hidden text-xs font-bold uppercase tracking-widest group-hover:text-text-1 sm:inline">
            Voltar ao acesso
          </span>
        </button>
      </div>

      <div className="absolute right-4 top-4 z-50 animate-in slide-in-from-right-4 fade-in duration-700 sm:fixed sm:right-8 sm:top-8">
        <ThemeToggle className="w-9 justify-center overflow-hidden px-0 sm:w-auto sm:px-3" />
      </div>

      <div className="relative z-10 mb-8 flex max-w-3xl flex-col items-center gap-5 text-center animate-in slide-in-from-top-8 fade-in duration-1000 sm:mb-10 sm:gap-6">
        <div className="theme-panel relative flex h-24 w-24 items-center justify-center rounded-3xl p-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] backdrop-blur-xl sm:h-28 sm:w-28">
          <Image
            src="/assets/branding/brasao_rs.svg"
            alt="Brasao RS"
            fill
            className="object-contain p-2"
            priority
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-rs-green/70 sm:w-12" />
            <span className="theme-copy-soft text-[10px] font-black uppercase tracking-[0.28em] sm:tracking-[0.5em]">
              Selecao de contexto
            </span>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-rs-yellow/80 sm:w-12" />
          </div>

          <h1 className="text-3xl font-black uppercase tracking-tight text-text-1 sm:text-5xl">
            Escolha o{" "}
            <span className="bg-gradient-to-r from-accent-blue via-accent-wine to-accent-olive bg-clip-text text-transparent">
              ambiente
            </span>
          </h1>

          <p className="theme-copy-muted mx-auto max-w-2xl text-base font-medium leading-relaxed sm:text-lg">
            Bem-vindo, <span className="font-bold text-text-1">{username}</span>. Selecione o ambiente
            em que voce vai atuar.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-10 flex w-full max-w-2xl items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-red-300 animate-in shake duration-500">
          <AlertTriangle size={24} className="shrink-0 text-red-500" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase tracking-wider">Falha de Acesso</h4>
            <p className="text-xs font-medium text-red-200">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 gap-5 animate-in zoom-in-95 fade-in duration-1000 delay-300 md:grid-cols-3 lg:gap-6">
        {workspaces.map((workspace) => (
          <WorkspaceSelectorCard
            key={workspace.id}
            workspaceId={workspace.id}
            label={workspace.identity.selectorLabel}
            subtitle={workspace.identity.selectorSubtitle}
            description={workspace.identity.selectorDescription}
            accentSurfaceClass={workspace.manifest.accentClass.split(" ").slice(0, 2).join(" ")}
            accentDotClass={workspace.manifest.accentClass.split(" ")[0]}
            accentTextClass={workspace.manifest.accentClass.split(" ")[2]}
            gradientClass={workspace.manifest.gradient}
            glowClass={workspace.manifest.glowColor}
            borderClassName={workspace.manifest.borderColor}
            icon={ICON_MAP[workspace.manifest.icon]}
            loading={loadingContext === workspace.id}
            disabled={loadingContext !== null}
            onSelect={() => handleWorkspaceSelection(workspace.id)}
          />
        ))}
      </div>

      <div className="theme-shell-button mt-8 flex items-center gap-3 rounded-full px-4 py-2 backdrop-blur-sm animate-in fade-in duration-1000 delay-700 sm:mt-12 sm:px-6">
        <ShieldCheck size={14} className="text-accent-blue" />
        <span className="theme-copy-soft text-center text-[10px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.2em]">
          Ambiente monitorado - Casa Civil RS
        </span>
      </div>

      <div className="theme-meta fixed bottom-8 left-8 hidden font-mono text-[9px] uppercase tracking-[0.3em] sm:block">
        Hub Operacional / Selecao de Contexto
      </div>
      <div className="theme-meta fixed bottom-8 right-8 hidden font-mono text-[9px] uppercase tracking-[0.3em] sm:block">
        Usuario de rede: {username?.toUpperCase()}
      </div>
    </div>
  );
}
