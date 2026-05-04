"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight, Cpu, Landmark, Lock, ShieldCheck, User, Wrench } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { PremiumButton } from "@/components/ui/premium-button";
import { PremiumInput } from "@/components/ui/premium-input";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface LoginSurfaceProps {
  username: string;
  password: string;
  loading: boolean;
  errorMsg?: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function LoginSurface({
  username,
  password,
  loading,
  errorMsg = "",
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: LoginSurfaceProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden overflow-y-auto p-4 py-12 sm:p-12">
      <div className="aurora-mesh" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-rs-green via-rs-red to-rs-yellow" />

      <div className="fixed right-6 top-6 z-30">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mb-8 flex flex-col items-center gap-4 text-center animate-in slide-in-from-top-8 fade-in duration-1000">
        <div className="group relative">
          <div className="absolute inset-0 scale-150 rounded-full bg-white/5 blur-2xl opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
          <div className="relative z-20 mb-2 flex h-20 w-20 items-center justify-center drop-shadow-[0_0_25px_rgba(255,255,255,0.15)] sm:h-24 sm:w-24">
            <Image
              src="/assets/branding/brasao_rs.svg"
              alt="Brasao oficial do Rio Grande do Sul"
              fill
              sizes="(max-width: 640px) 80px, 96px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-accent-blue/50" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent-blue">DTIC</span>
            <div className="h-[1px] w-4 bg-white/20" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent-wine">CONSERVACAO</span>
            <div className="h-[1px] w-4 bg-white/20" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent-olive">MANUTENCAO</span>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-accent-olive/50" />
          </div>

          <h1 className="text-5xl font-black tracking-tighter text-text-1 sm:text-6xl">
            Hub <span className="theme-title-gradient">Operacional</span>
          </h1>

          <p className="theme-copy-muted text-lg font-medium tracking-tight">
            Atendimento DTIC, Conservacao e Manutencao <span className="text-text-1">Casa Civil RS</span>
          </p>
        </div>
      </div>

      <GlassCard className="relative w-full max-w-md animate-in zoom-in-95 fade-in p-8 duration-700 delay-300">
        <div className="absolute left-0 right-0 top-0 h-[2px] rounded-t-xl bg-gradient-to-r from-accent-blue via-accent-violet to-accent-amber" />

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-1 pb-2">
            <h2 className="flex items-center gap-2 text-xl font-bold text-text-1">
              <ShieldCheck className="text-accent-blue" size={20} />
              Acesso com credencial de rede
            </h2>
            <p className="theme-copy-soft text-sm font-medium">
              Use seu usuario de rede para acessar os ambientes da Casa Civil RS.
            </p>
          </div>

          {errorMsg ? (
            <div className="mb-2 animate-in slide-in-from-top-2 zoom-in fade-in rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400 duration-300">
              {errorMsg}
            </div>
          ) : null}

          <PremiumInput
            label="Usuario de rede"
            placeholder="nome-sobrenome"
            icon={<User size={18} className="text-accent-blue/70" />}
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            className="bg-surface-1/40"
            disabled={loading}
          />

          <PremiumInput
            label="Senha de rede"
            type="password"
            placeholder="********"
            icon={<Lock size={18} className="text-accent-amber/70" />}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className="bg-surface-1/40"
            disabled={loading}
          />

          <PremiumButton
            type="submit"
            disabled={loading}
            className={`group flex w-full items-center justify-center gap-3 bg-gradient-to-r from-accent-blue/80 to-accent-blue shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300 hover:from-accent-blue hover:to-accent-blue ${loading ? "cursor-wait opacity-80" : ""}`}
          >
            <span className="text-sm font-bold uppercase tracking-wide">
              {loading ? "Autenticando..." : "Entrar no hub"}
            </span>
            {!loading ? (
              <ArrowRight
                size={20}
                className="translate-x-0 transition-transform duration-300 group-hover:translate-x-1.5"
              />
            ) : null}
          </PremiumButton>

          <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="theme-copy-soft flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
              <Cpu size={12} className="text-accent-blue" />
              DTIC
            </div>
            <div className="h-1 w-1 rounded-full" style={{ background: "var(--border-strong)" }} />
            <div className="theme-copy-soft flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
              <Landmark size={12} className="text-accent-wine" />
              Conservacao
            </div>
            <div className="h-1 w-1 rounded-full" style={{ background: "var(--border-strong)" }} />
            <div className="theme-copy-soft flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
              <Wrench size={12} className="text-accent-olive" />
              Manutencao
            </div>
          </div>
        </form>
      </GlassCard>

      <footer className="mt-8 flex flex-col items-center gap-3 animate-in fade-in duration-1000 delay-700">
        <div className="flex cursor-default items-center gap-6 grayscale transition-all duration-500 hover:grayscale-0">
          <Image
            src="/assets/branding/brasao_rs.svg"
            alt="RS"
            width={24}
            height={24}
            style={{ width: "1.5rem", height: "1.5rem" }}
          />
          <div className="h-4 w-[1px]" style={{ background: "var(--border-strong)" }} />
          <span className="theme-meta font-mono text-[10px] font-bold tracking-[0.3em]">HUB OPERACIONAL CASA CIVIL RS</span>
        </div>

        <p className="theme-meta font-mono text-[9px] uppercase tracking-[0.2em]">
          Nucleo operacional de chamados - 2026 Casa Civil RS
        </p>
      </footer>
    </div>
  );
}
