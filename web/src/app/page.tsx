"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, ShieldCheck, Cpu, Shovel } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PremiumInput } from "@/components/ui/premium-input";
import { PremiumButton } from "@/components/ui/premium-button";
import { useAuthStore } from "@/store/useAuthStore";
import { apiLogin, GlpiApiError } from "@/lib/api/glpiService";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      // Tenta validar primeiro no contexto primário (DTIC)
      await apiLogin("dtic", { username, password });
      login(username, password);
      router.push("/selector");
    } catch (errDtic: any) {
      if (errDtic instanceof GlpiApiError && errDtic.status === 401) {
        // Fallback: Tenta validar no SIS caso seja um usuário exclusivo de SIS
        try {
          await apiLogin("sis", { username, password });
          login(username, password);
          router.push("/selector");
        } catch (errSis: any) {
          setErrorMsg("Credenciais inválidas ou sem permissão de acesso.");
        }
      } else {
        setErrorMsg("Erro de comunicação com o servidor de autenticação.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 py-12 sm:p-12 relative overflow-x-hidden overflow-y-auto">
      {/* Background Layer: Aurora Mesh with Dual Tone */}
      <div className="aurora-mesh" />

      {/* Decorative Blur Orbs for Dual Context */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-accent-blue/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-accent-amber/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Branding Section */}
      <div className="flex flex-col items-center gap-4 mb-8 text-center relative z-10 animate-in fade-in slide-in-from-top-8 duration-1000">
        <div className="relative group">
          <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-2 drop-shadow-[0_0_25px_rgba(255,255,255,0.15)] relative z-20">
            <img
              src="/assets/branding/brasao_rs.svg"
              alt="Brasão Oficial do Rio Grande do Sul"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-accent-blue/50" />
            <span className="text-[10px] font-bold tracking-[0.4em] text-accent-blue uppercase">Inteligência</span>
            <div className="h-[1px] w-4 bg-white/20" />
            <span className="text-[10px] font-bold tracking-[0.4em] text-accent-amber uppercase">Infraestrutura</span>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-accent-amber/50" />
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-text-1">
            Global<span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">Gateway</span>
          </h1>

          <p className="text-text-2 font-medium tracking-tight text-lg opacity-80">
            Convergência Digital & Física • <span className="text-text-1">Casa Civil RS</span>
          </p>
        </div>
      </div>

      {/* Login Card */}
      <GlassCard className="w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-700 delay-300 relative">
        {/* Subtle accent line on top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-blue via-accent-violet to-accent-amber rounded-t-xl" />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1 pb-2">
            <h2 className="text-xl font-bold text-text-1 flex items-center gap-2">
              <ShieldCheck className="text-accent-blue" size={20} />
              Autenticação Segura
            </h2>
            <p className="text-sm text-text-3 font-medium">Acesse o ecossistema unificado DTIC & SIS</p>
          </div>

          {errorMsg && (
            <div className="p-3 mb-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg text-center animate-in fade-in zoom-in slide-in-from-top-2 duration-300">
              {errorMsg}
            </div>
          )}

          <PremiumInput
            label="Usuário Credencial Única"
            placeholder="nome.sobrenome"
            icon={<User size={18} className="text-accent-blue/70" />}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-surface-1/40"
            disabled={loading}
          />

          <PremiumInput
            label="Senha do Ecossistema"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} className="text-accent-amber/70" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface-1/40"
            disabled={loading}
          />

          <PremiumButton
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 group bg-gradient-to-r from-accent-blue/80 to-accent-blue hover:from-accent-blue hover:to-accent-blue transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.2)] ${loading ? 'opacity-80 cursor-wait' : ''}`}
          >
            <span className="font-bold tracking-wide uppercase text-sm">
              {loading ? "Autenticando..." : "Entrar no Gateway"}
            </span>
            {!loading && <ArrowRight size={20} className="translate-x-0 group-hover:translate-x-1.5 transition-transform duration-300" />}
          </PremiumButton>

          <div className="flex items-center justify-between pt-4 border-t border-white/5 opacity-60">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-3 uppercase tracking-wider">
              <Cpu size={12} className="text-accent-blue" />
              DTIC Digital
            </div>
            <div className="h-1 w-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-3 uppercase tracking-wider">
              <Shovel size={12} className="text-accent-amber" />
              SIS Infra
            </div>
          </div>
        </form>
      </GlassCard>

      {/* Modern Footer Branding */}
      <footer className="mt-8 flex flex-col items-center gap-3 opacity-40 animate-in fade-in duration-1000 delay-700">
        <div className="flex items-center gap-6 grayscale hover:grayscale-0 transition-all duration-500 cursor-default">
          <img src="/assets/branding/brasao_rs.svg" alt="RS" className="h-6" />
          <div className="h-4 w-[1px] bg-white/20" />
          <span className="font-mono text-[10px] tracking-[0.3em] font-bold">DTIC & SIS CONVERGENCE</span>
        </div>

        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-3">
          Sistemas de Alta Disponibilidade • © 2026 Tecnologia RS
        </p>
      </footer>

      {/* Dynamic Background Elements */}
      <div className="fixed top-1/2 left-0 w-[500px] h-[1px] bg-gradient-to-r from-accent-blue/20 to-transparent -rotate-12 pointer-events-none opacity-20" />
      <div className="fixed top-1/2 right-0 w-[500px] h-[1px] bg-gradient-to-l from-accent-amber/20 to-transparent rotate-12 pointer-events-none opacity-20" />
    </div>
  );
}

