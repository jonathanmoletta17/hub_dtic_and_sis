"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock, AlertTriangle,
  CheckCircle2, AlertCircle, Loader2, Search, Plus,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

import { PremiumButton } from "@/components/ui/premium-button";
import { fetchMyTickets } from "@/lib/api/ticketService";
import type { TicketSummary } from "@/lib/api/types";

const contextData: Record<string, { title: string; subtitle: string; color: string; accentClass: string }> = {
  "dtic": { title: "Meus Chamados", subtitle: "DTIC — Tecnologia da Informação", color: "text-accent-blue", accentClass: "bg-accent-blue" },
  "sis": { title: "Meus Chamados", subtitle: "SIS — Serviços e Infraestrutura", color: "text-accent-orange", accentClass: "bg-accent-orange" },
  "sis-manutencao": { title: "Meus Chamados", subtitle: "SIS — Manutenção e Conservação", color: "text-accent-orange", accentClass: "bg-accent-orange" },
  "sis-memoria": { title: "Meus Chamados", subtitle: "SIS — Conservação e Memória", color: "text-accent-violet", accentClass: "bg-accent-violet" },
};

// Status → cor
const statusColorMap: Record<string, string> = {
  "Novo": "text-blue-400/80 bg-blue-400/10",
  "Em Atendimento": "text-amber-400/80 bg-amber-400/10",
  "Planejado": "text-amber-400/80 bg-amber-400/10",
  "Pendente": "text-red-400/80 bg-red-400/10",
  "Solucionado": "text-emerald-400/80 bg-emerald-400/10",
  "Fechado": "text-text-3/40 bg-white/[0.03]",
};

type FilterType = "all" | "open" | "closed";

export default function UserTicketsPage() {
  const params = useParams();
  const router = useRouter();
  const context = params.context as string;
  const current = contextData[context] || contextData["dtic"];
  const { currentUserRole, setActiveView } = useAuthStore();

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const userId = currentUserRole?.user_id;

  useEffect(() => {
    setActiveView('user');

    async function load() {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMyTickets(context, userId);
        setTickets(data);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar chamados");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [context, userId]);

  // Filtros
  const filtered = tickets.filter((t) => {
    if (filter === "open" && [5, 6].includes(t.statusId)) return false;
    if (filter === "closed" && ![5, 6].includes(t.statusId)) return false;
    if (searchQuery) {
      const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      const haystack = `${t.title} ${t.content} ${t.category} ${t.id}`.toLowerCase();
      return terms.every(term => haystack.includes(term));
    }
    return true;
  });

  return (
        <div className="flex flex-col h-full px-5 lg:px-8 py-5">
          {/* Header */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 shrink-0">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-text-1 tracking-tight">{current.title}</h1>
              <p className="text-text-2/50 text-[14px] mt-0.5">
                {current.subtitle}{!loading && ` — ${filtered.length} chamado${filtered.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <PremiumButton className="flex items-center gap-1.5 py-2.5 px-5 text-[14px]">
                <Plus size={14} />
                <span className="hidden lg:block">Novo Chamado</span>
              </PremiumButton>
            </div>
          </header>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3 mb-5 shrink-0">
            <div className="flex gap-1.5">
              {[
                { key: "all" as const, label: "Todos" },
                { key: "open" as const, label: "Abertos" },
                { key: "closed" as const, label: "Finalizados" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${filter === f.key ? "bg-white/[0.08] text-text-1" : "text-text-3/60 hover:text-text-2 hover:bg-white/[0.03]"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative group flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3/40 group-focus-within:text-text-2 transition-colors" size={14} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nos meus chamados..."
                className="w-full bg-surface-2 border border-white/[0.06] rounded-lg py-2.5 pl-9 pr-4 text-[14px] outline-none focus:border-white/[0.12] transition-all text-text-2 placeholder:text-text-3/40"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4 shrink-0">
              {error}
            </div>
          )}

          {/* Ticket List */}
          <div className="flex-grow min-h-0 overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-text-3/40 gap-3">
                <Loader2 size={28} className="animate-spin" />
                <p className="text-sm">Carregando chamados...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-text-3/40 gap-3">
                <AlertTriangle size={28} />
                <p className="text-sm">Nenhum chamado encontrado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((t) => {
                  const colors = statusColorMap[t.status] || "text-text-3/40 bg-white/[0.03]";
                  return (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/${context}/ticket/${t.id}`)}
                      className="group w-full text-left bg-surface-2 border border-white/[0.06] rounded-lg p-4 hover:bg-surface-3 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-text-3/40">GLPI-{t.id}</span>
                        <span className="text-[10px] text-text-3/30">{t.dateCreated?.split(" ")[0]}</span>
                      </div>
                      <h4 className="text-[14px] font-medium text-text-1 group-hover:text-white transition-colors mb-1.5">{t.title}</h4>
                      <p className="text-[13px] text-text-3/60 line-clamp-2 mb-3">{t.content}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] text-text-3/60">{t.category}</span>
                        <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${colors}`}>{t.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

    </div>
  );
}
