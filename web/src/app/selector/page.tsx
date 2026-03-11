"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Wrench, Loader2, ArrowLeft, AlertTriangle, ShieldCheck, ChevronRight, Network, Landmark } from "lucide-react";
import { useAuthStore, AuthMeResponse } from "@/store/useAuthStore";
import { GlassCard } from "@/components/ui/glass-card";
import { CONTEXT_MANIFESTS } from "@/lib/context-registry";
import { API_BASE } from "@/lib/api/httpClient";

const ICON_MAP: Record<string, React.ReactNode> = {
  "Network": <Network size={28} />,
  "Wrench": <Wrench size={28} />,
  "Landmark": <Landmark size={28} />,
  "Monitor": <Monitor size={28} />
};

export default function WorkspaceSelectorPage() {
  const router = useRouter();
  const { username, getCredentials, setActiveContext, cacheContextSession, getCachedSession } = useAuthStore();
  const [loadingContext, setLoadingContext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Consideramos apenas os contextos principais no seletor primário (sem traço de sub-contexto)
  const workspaces = CONTEXT_MANIFESTS.filter(ws => !ws.id.includes('-'));

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

      const getPriority = (roleStr: string) => {
        if (roleStr === "gestor") return 3;
        if (roleStr.startsWith("tecnico")) return 2;
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
            : (identity.roles?.active_profile || identity.roles?.available_profiles?.[0])
        }
      };

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
      const res = await fetch(`${API_BASE}/api/v1/${workspaceId}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      const identity: AuthMeResponse = await res.json();
      cacheContextSession(workspaceId, identity);
      redirectByPriority(identity);

    } catch (err: any) {
      console.error("Erro na autenticação real:", err);
      setError(err.message || "Falha de rede ao se conectar ao servidor do GLPI.");
      setLoadingContext(null);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen items-center justify-center p-4 sm:p-10 relative overflow-hidden">
      {/* Background Layer: Aurora Mesh with Dual Tone */}
      <div className="aurora-mesh" />

      {/* Decorative Blur Orbs */}
      <div className="fixed -top-48 -left-48 w-[600px] h-[600px] bg-accent-blue/10 blur-[150px] rounded-full pointer-events-none opacity-50" />
      <div className="fixed -bottom-48 -right-48 w-[600px] h-[600px] bg-accent-amber/10 blur-[150px] rounded-full pointer-events-none opacity-50" />

      {/* Nav Actions */}
      <div className="fixed top-8 left-8 z-50 animate-in fade-in slide-in-from-left-4 duration-700">
        <button
          onClick={() => router.push("/")}
          className="group flex items-center gap-3 px-4 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 backdrop-blur-md transition-all duration-300"
        >
          <ArrowLeft size={16} className="text-text-3 group-hover:text-text-1 group-hover:-translate-x-1 transition-all" />
          <span className="text-xs font-bold tracking-widest text-text-3 group-hover:text-text-1 uppercase">Sair do Gateway</span>
        </button>
      </div>

      {/* Header Branding */}
      <div className="flex flex-col items-center gap-6 mb-10 text-center max-w-3xl relative z-10 animate-in fade-in slide-in-from-top-8 duration-1000">
        <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center p-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10">
          <img 
            src="/assets/branding/brasao_rs.svg" 
            alt="Brasão RS" 
            className="w-full h-full object-contain"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-accent-blue/50" />
            <span className="text-[10px] font-black tracking-[0.5em] text-text-3 uppercase">Convergência Identificada</span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-accent-amber/50" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-1 uppercase">
            Direcionamento de <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-blue to-accent-amber">Fluxo</span>
          </h1>

          <p className="text-text-2 text-lg font-medium leading-relaxed max-w-2xl mx-auto opacity-80">
            Bem-vindo, <span className="text-text-1 font-bold">{username}</span>. Selecione o domínio para operação unificada na infraestrutura do Estado.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl px-6 py-4 mb-10 max-w-2xl w-full animate-in shake duration-500">
          <AlertTriangle size={24} className="shrink-0 text-red-500" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase tracking-wider">Falha de Acesso</h4>
            <p className="text-xs font-medium opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* Context Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl relative z-10 animate-in fade-in zoom-in-95 duration-1000 delay-300">
        {workspaces.map((ws, index) => (
          <button
            key={ws.id}
            onClick={() => handleWorkspaceSelection(ws.id)}
            disabled={loadingContext !== null}
            className="group relative text-left outline-none"
          >
            <GlassCard className={`h-full flex flex-col p-6 transition-all duration-500 border-white/[0.03] ${ws.borderColor} group-hover:bg-surface-3 group-hover:-translate-y-2 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden`}>
              {/* Dynamic Gradient Edge */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${ws.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />

              {/* Context Aura */}
              <div className={`absolute -top-24 -right-24 w-64 h-64 ${ws.glowColor} blur-[100px] rounded-full transition-all duration-700 group-hover:scale-150 group-hover:opacity-100 opacity-20`} />

              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className={`w-16 h-16 rounded-2xl bg-surface-1 flex items-center justify-center shadow-2xl border border-white/5 transition-transform duration-500 group-hover:scale-110 ${ws.accentClass.split(' ')[2]}`}>
                  {loadingContext === ws.id ? <Loader2 size={32} className="animate-spin" /> : ICON_MAP[ws.icon]}
                </div>
                <ChevronRight size={24} className="text-text-3/30 group-hover:text-text-1 group-hover:translate-x-2 transition-all duration-500" />
              </div>

              <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-3">
                  <span className={`h-1 w-1 rounded-full ${ws.accentClass.split(' ')[0]} group-hover:animate-ping`} />
                  <h3 className="text-[11px] uppercase tracking-[0.4em] font-bold text-text-3 group-hover:text-text-2 transition-colors">{ws.id} CONTEXT</h3>
                </div>

                <h2 className="text-3xl font-black text-text-1 tracking-tight group-hover:text-white transition-colors">{ws.label}</h2>
                <h4 className={`text-sm font-bold uppercase tracking-wider ${ws.accentClass.split(' ')[2]} opacity-90`}>{ws.subtitle}</h4>

                <p className="text-[15px] text-text-3 font-medium leading-relaxed mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
                  {ws.description}
                </p>
              </div>

              {/* Action Footer */}
              <div className="mt-auto pt-8 flex items-center justify-between relative z-10 border-t border-white/5">
                <div className="text-[10px] font-bold text-text-3/40 uppercase tracking-widest">Acesso Restrito</div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${ws.accentClass.split(' ')[2]} opacity-0 group-hover:opacity-100 transition-opacity`}>Identificar Visão</div>
              </div>
            </GlassCard>
          </button>
        ))}
      </div>

      {/* Security Badge */}
      <div className="mt-12 flex items-center gap-3 px-6 py-2 rounded-full border border-white/5 bg-white/2 backdrop-blur-sm opacity-40 hover:opacity-100 transition-opacity duration-500 animate-in fade-in duration-1000 delay-700">
        <ShieldCheck size={14} className="text-accent-blue" />
        <span className="text-[10px] font-bold tracking-[0.2em] text-text-3 uppercase">Ambiente Monitorado & Auditado • Casa Civil RS</span>
      </div>
      
      {/* Decorative details */}
      <div className="fixed bottom-8 left-8 text-text-3/10 font-mono text-[9px] uppercase tracking-[0.3em] hidden sm:block">
        Gateway Convergence / Phase 2
      </div>
      <div className="fixed bottom-8 right-8 text-text-3/10 font-mono text-[9px] uppercase tracking-[0.3em] hidden sm:block">
        Global ID: {username?.toUpperCase()}
      </div>
    </div>
  );
}
