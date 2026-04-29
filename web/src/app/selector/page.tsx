"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Monitor,
  Wrench,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  Network,
  Landmark,
} from "lucide-react";

import { useAuthStore, AuthMeResponse } from "@/store/useAuthStore";
import { WorkspaceSelectorCard } from "@/app/selector/_components/WorkspaceSelectorCard";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CONTEXT_MANIFESTS } from "@/lib/context-registry";
import { apiLogin } from "@/lib/api/glpiService";

function writeSessionCookie(sessionToken?: string) {
  if (!sessionToken) return;
  document.cookie = `sessionToken=${sessionToken}; path=/; max-age=86400; samesite=strict`;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Network: <Network size={28} />,
  Wrench: <Wrench size={28} />,
  Landmark: <Landmark size={28} />,
  Monitor: <Monitor size={28} />,
};

export default function WorkspaceSelectorPage() {
  const router = useRouter();
  const { username, getCredentials, setActiveContext, cacheContextSession, getCachedSession } =
    useAuthStore();
  const [loadingContext, setLoadingContext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workspaces = CONTEXT_MANIFESTS.filter((workspace) => !workspace.id.includes("-"));

  const handleWorkspaceSelection = async (workspaceId: string) => {
    if (loadingContext) return;
    setLoadingContext(workspaceId);
    setError(null);

    const redirectByPriority = (identity: AuthMeResponse) => {
      const hubRoles = identity.hub_roles || [];
      if (hubRoles.length === 0) {
        setActiveContext(workspaceId, identity);
        router.push(`/${workspaceId}/user`);
        return;
      }

      const getPriority = (roleName: string) => {
        if (roleName === "gestor") return 3;
        if (roleName.startsWith("tecnico")) return 2;
        return 1;
      };

      const sortedRoles = [...hubRoles].sort((a, b) => getPriority(b.role) - getPriority(a.role));
      const primaryRole = sortedRoles[0];

      const activeIdentity = {
        ...identity,
        active_hub_role: primaryRole,
        roles: {
          ...identity.roles,
          active_profile: primaryRole.profile_id
            ? { id: primaryRole.profile_id, name: primaryRole.label }
            : identity.roles?.active_profile || identity.roles?.available_profiles?.[0],
        },
      };

      if (typeof document !== "undefined" && identity.session_token) {
        writeSessionCookie(identity.session_token);
      }

      setActiveContext(workspaceId, activeIdentity);
      const targetContext = primaryRole.context_override || workspaceId;
      router.push(`/${targetContext}/${primaryRole.route}`);
    };

    const cached = getCachedSession(workspaceId);
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
      const identity = await apiLogin(workspaceId, {
        username: credentials.username,
        password: credentials.password,
      });

      if (identity.session_token) {
        writeSessionCookie(identity.session_token);
      }

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
    <div className="relative flex h-screen max-h-screen flex-col items-center justify-center overflow-hidden p-4 sm:p-10">
      <div className="aurora-mesh" />

      <div className="pointer-events-none fixed -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-accent-blue/10 opacity-50 blur-[150px]" />
      <div className="pointer-events-none fixed -bottom-48 -right-48 h-[600px] w-[600px] rounded-full bg-accent-amber/10 opacity-50 blur-[150px]" />

      <div className="fixed left-8 top-8 z-50 animate-in slide-in-from-left-4 fade-in duration-700">
        <button
          onClick={() => router.push("/")}
          className="theme-shell-button group flex items-center gap-3 rounded-full px-4 py-2 backdrop-blur-md transition-colors duration-300"
        >
          <ArrowLeft
            size={16}
            className="theme-copy-soft transition-[color,transform] group-hover:-translate-x-1 group-hover:text-text-1"
          />
          <span className="theme-copy-soft text-xs font-bold uppercase tracking-widest group-hover:text-text-1">
            Voltar ao acesso
          </span>
        </button>
      </div>

      <div className="fixed right-8 top-8 z-50 animate-in slide-in-from-right-4 fade-in duration-700">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mb-10 flex max-w-3xl flex-col items-center gap-6 text-center animate-in slide-in-from-top-8 fade-in duration-1000">
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
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-accent-blue/50" />
            <span className="theme-copy-soft text-[10px] font-black uppercase tracking-[0.5em]">
              Selecao de contexto
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-accent-amber/50" />
          </div>

          <h1 className="text-4xl font-black uppercase tracking-tight text-text-1 sm:text-5xl">
            Escolha o{" "}
            <span className="bg-gradient-to-r from-accent-blue to-accent-amber bg-clip-text text-transparent">
              ambiente
            </span>
          </h1>

          <p className="theme-copy-muted mx-auto max-w-2xl text-lg font-medium leading-relaxed">
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

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 gap-8 animate-in zoom-in-95 fade-in duration-1000 delay-300 md:grid-cols-2">
        {workspaces.map((workspace) => (
          <WorkspaceSelectorCard
            key={workspace.id}
            workspaceId={workspace.id}
            label={workspace.label}
            subtitle={workspace.subtitle}
            description={workspace.description}
            accentSurfaceClass={workspace.accentClass.split(" ").slice(0, 2).join(" ")}
            accentDotClass={workspace.accentClass.split(" ")[0]}
            accentTextClass={workspace.accentClass.split(" ")[2]}
            gradientClass={workspace.gradient}
            glowClass={workspace.glowColor}
            borderClassName={workspace.borderColor}
            icon={ICON_MAP[workspace.icon]}
            loading={loadingContext === workspace.id}
            disabled={loadingContext !== null}
            onSelect={() => handleWorkspaceSelection(workspace.id)}
          />
        ))}
      </div>

      <div className="theme-shell-button mt-12 flex items-center gap-3 rounded-full px-6 py-2 backdrop-blur-sm animate-in fade-in duration-1000 delay-700">
        <ShieldCheck size={14} className="text-accent-blue" />
        <span className="theme-copy-soft text-[10px] font-bold uppercase tracking-[0.2em]">
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
