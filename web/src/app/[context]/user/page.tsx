"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Search } from "lucide-react";

import { CategoryBadge } from "@/components/ui/category-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import { fetchMyTickets } from "@/lib/api/ticketService";
import type { TicketSummary } from "@/lib/api/types";
import { POLL_INTERVALS } from "@/lib/realtime/polling";
import { useAuthStore } from "@/store/useAuthStore";

const contextData: Record<string, { title: string; subtitle: string }> = {
  dtic: { title: "Chamados", subtitle: "DTIC - Tecnologia da Informacao" },
  sis: { title: "Chamados", subtitle: "SIS - Infraestrutura e Servicos" },
  "sis-manutencao": { title: "Chamados", subtitle: "SIS - Manutencao e Conservacao" },
  "sis-memoria": { title: "Chamados", subtitle: "SIS - Conservacao e Memoria" },
};

type FilterType = "all" | "open" | "closed";
type DateFilterType = "all" | "30d" | "90d" | "365d" | "custom";

const CLOSED_STATUS_IDS = new Set([5, 6]);

function formatDateYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function UserTicketsPage() {
  const params = useParams();
  const router = useRouter();
  const context = params.context as string;
  const current = contextData[context] || contextData.dtic;
  const { currentUserRole } = useAuthStore();

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [dateFromCustom, setDateFromCustom] = useState("");
  const [dateToCustom, setDateToCustom] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [isTruncated, setIsTruncated] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const userId = currentUserRole?.user_id;

  const loadTickets = useCallback(async () => {
    function resolveDateRange(): { dateFrom?: string; dateTo?: string } {
      if (dateFilter === "all") return {};

      const today = new Date();
      const dateTo = formatDateYmd(today);

      if (dateFilter === "custom") {
        if (dateFromCustom && dateToCustom && dateFromCustom > dateToCustom) {
          throw new Error("Periodo personalizado invalido: data inicial maior que data final.");
        }

        return {
          dateFrom: dateFromCustom || undefined,
          dateTo: dateToCustom || undefined,
        };
      }

      const dateFrom = new Date(today);
      if (dateFilter === "30d") dateFrom.setDate(today.getDate() - 30);
      if (dateFilter === "90d") dateFrom.setDate(today.getDate() - 90);
      if (dateFilter === "365d") dateFrom.setDate(today.getDate() - 365);

      return { dateFrom: formatDateYmd(dateFrom), dateTo };
    }

    if (!userId) {
      setTickets([]);
      setTotalRecords(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const isInitialLoad = !hasLoadedOnceRef.current;
    if (isInitialLoad) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const range = resolveDateRange();
      const result = await fetchMyTickets(context, userId, {
        ...range,
        pageSize: 200,
        maxPages: 50,
      });
      setTickets(result.tickets);
      setTotalRecords(result.total);
      setIsTruncated(result.tickets.length < result.total);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar chamados";
      setError(message);
      if (!hasLoadedOnceRef.current) {
        setTickets([]);
        setTotalRecords(0);
        setIsTruncated(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [context, dateFilter, dateFromCustom, dateToCustom, userId]);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
  }, [context, userId]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useLiveDataRefresh({
    context,
    domains: ["tickets", "dashboard", "analytics", "user", "search"],
    onRefresh: loadTickets,
    enabled: Boolean(userId),
    pollIntervalMs: POLL_INTERVALS.userTickets,
    minRefreshGapMs: 900,
  });

  const filtered = tickets.filter((ticket) => {
    if (filter === "open" && CLOSED_STATUS_IDS.has(ticket.statusId)) return false;
    if (filter === "closed" && !CLOSED_STATUS_IDS.has(ticket.statusId)) return false;
    if (searchQuery) {
      const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      const haystack = `${ticket.title} ${ticket.content} ${ticket.category} ${ticket.id}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    }
    return true;
  });

  const hasSecondaryFilter = filter !== "all" || searchQuery.trim().length > 0;
  const shouldShowCompositeCount = hasSecondaryFilter && !loading;
  const referenceCount = totalRecords || tickets.length;
  const countLabel = shouldShowCompositeCount
    ? `${filtered.length} de ${referenceCount} ${referenceCount === 1 ? "registro" : "registros"}`
    : `${referenceCount} ${referenceCount === 1 ? "registro" : "registros"}`;
  const openCount = tickets.filter((ticket) => !CLOSED_STATUS_IDS.has(ticket.statusId)).length;
  const closedCount = tickets.filter((ticket) => CLOSED_STATUS_IDS.has(ticket.statusId)).length;

  const filterOptions = [
    { key: "all" as const, label: "Todos", count: tickets.length },
    { key: "open" as const, label: "Abertos", count: openCount },
    { key: "closed" as const, label: "Finalizados", count: closedCount },
  ];

  return (
    <div className="flex h-full flex-col px-4 py-4 lg:px-8 lg:py-5">
      <header className="mb-5 shrink-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-1 lg:text-2xl">{current.title}</h1>
            <p className="mt-0.5 text-[14px] text-text-2">{current.subtitle}</p>
            {!loading && <p className="theme-copy-soft mt-1 text-[12px]">{countLabel}</p>}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push(`/${context}/new-ticket`)}
              className="theme-button-primary inline-flex items-center justify-center rounded-lg px-3 py-2 text-[12px] font-medium transition-colors"
            >
              Novo chamado
            </button>
            {refreshing && (
              <span className="theme-copy-soft inline-flex items-center gap-1 text-[11px]">
                <Loader2 size={12} className="animate-spin" />
                Atualizando
              </span>
            )}
          </div>
        </div>
      </header>

      <div
        className="mb-5 flex shrink-0 flex-col gap-4 rounded-2xl border px-4 py-4 lg:px-5"
        style={{
          borderColor: "var(--card-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 90%, transparent) 0%, var(--bg-surface) 100%)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={`inline-flex whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-medium transition-colors ${
                filter === option.key
                  ? "theme-shell-button-active"
                  : "theme-shell-button text-[var(--text-secondary)]"
              }`}
            >
              <span>{option.label}</span>
              <span
                className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                style={{
                  background:
                    filter === option.key
                      ? "color-mix(in srgb, var(--accent-primary) 18%, transparent)"
                      : "var(--bg-surface-alt)",
                  color: filter === option.key ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {option.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="group relative flex-grow lg:max-w-md">
            <Search
              className="theme-copy-soft absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-text-2"
              size={14}
            />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={"Buscar nos meus chamados\u2026"}
              className="theme-input w-full rounded-lg py-2.5 pl-9 pr-4 text-[14px] outline-none transition-colors"
            />
          </div>

          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as DateFilterType)}
            className="theme-input min-w-[220px] rounded-lg px-3 py-2.5 text-[13px] outline-none"
          >
            <option value="all">Sem filtro de data</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="90d">Ultimos 90 dias</option>
            <option value="365d">Ultimos 12 meses</option>
            <option value="custom">Periodo personalizado</option>
          </select>
        </div>

        {dateFilter === "custom" && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="date"
              value={dateFromCustom}
              onChange={(event) => setDateFromCustom(event.target.value)}
              className="theme-input rounded-lg px-3 py-2.5 text-[13px] outline-none"
            />
            <input
              type="date"
              value={dateToCustom}
              onChange={(event) => setDateToCustom(event.target.value)}
              className="theme-input rounded-lg px-3 py-2.5 text-[13px] outline-none"
            />
          </div>
        )}

        {isTruncated && (
          <p className="text-[12px]" style={{ color: "var(--status-active)" }}>
            Exibindo {tickets.length} de {totalRecords} registros. Ajuste o periodo para reduzir o volume.
          </p>
        )}
        {!isTruncated && totalRecords > 0 && dateFilter === "all" && (
          <p className="theme-copy-soft text-[12px]">
            Sem filtro de data, a consulta traz todo o historico disponivel para seu usuario.
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-grow overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
        {loading && tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-text-2">
            <Loader2 size={28} className="theme-copy-soft animate-spin" />
            <p className="text-sm">{"Carregando chamados\u2026"}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-text-2">
            <AlertTriangle size={28} className="theme-copy-soft" />
            <p className="text-sm">Nenhum chamado encontrado.</p>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {filtered.map((ticket) => {
              const createdDate =
                ticket.dateCreated?.split("T")[0] || ticket.dateCreated?.split(" ")[0] || "--";
              const updatedDate =
                ticket.dateModified?.split("T")[0] || ticket.dateModified?.split(" ")[0] || createdDate;

              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => router.push(`/${context}/ticket/${ticket.id}`)}
                  className="theme-card theme-card-interactive group flex h-full w-full flex-col rounded-2xl p-4 text-left"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="theme-copy-soft inline-flex rounded-full border px-2 py-1 text-[10px] font-mono"
                        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface-alt)" }}>
                        GLPI-{ticket.id}
                      </span>
                      <p className="theme-copy-soft mt-2 text-[11px]">
                        Atualizado em {updatedDate}
                      </p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>

                  <h4 className="mb-2 text-[15px] font-semibold leading-snug text-text-1 transition-colors group-hover:text-text-1">
                    {ticket.title}
                  </h4>

                  <p className="mb-4 line-clamp-3 text-[13px] leading-relaxed text-text-2">
                    {ticket.content}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <CategoryBadge>{ticket.category}</CategoryBadge>
                    {ticket.groupName ? (
                      <span className="theme-copy-soft inline-flex items-center rounded-full border px-2.5 py-1 text-[10px]"
                        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface-alt)" }}>
                        {ticket.groupName}
                      </span>
                    ) : null}
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
