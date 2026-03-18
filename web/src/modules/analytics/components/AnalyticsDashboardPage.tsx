"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Tags,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { LiveClock } from "@/components/ui/LiveClock";
import {
  fetchAnalyticsDistributionCategory,
  fetchAnalyticsDistributionEntity,
  fetchAnalyticsRanking,
  fetchAnalyticsRecentActivity,
  fetchAnalyticsSummary,
  fetchAnalyticsTrends,
} from "@/lib/api/analyticsService";
import { fetchTickets } from "@/lib/api/ticketService";
import type {
  AnalyticsDistributionResult,
  AnalyticsRankingResult,
  AnalyticsRecentActivityResult,
  AnalyticsSummaryResult,
  AnalyticsTrendsResult,
} from "@/lib/api/models/analytics";
import type { TicketSummary } from "@/lib/api/types";
import { formatIsoDateTime } from "@/lib/datetime/iso";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import { POLL_INTERVALS } from "@/lib/realtime/polling";

type PeriodPreset = "30d" | "90d" | "12m" | "custom";
type DepartmentFilter = "all" | "manutencao" | "conservacao";

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangeFromPreset(preset: Exclude<PeriodPreset, "custom">): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const end = toYmd(today);
  const startDate = new Date(today);
  if (preset === "30d") startDate.setDate(startDate.getDate() - 29);
  if (preset === "90d") startDate.setDate(startDate.getDate() - 89);
  if (preset === "12m") startDate.setDate(startDate.getDate() - 364);
  return {
    dateFrom: toYmd(startDate),
    dateTo: end,
  };
}

function formatDateLabel(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}

function getFirstName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Sem nome";
  return trimmed.split(/\s+/)[0];
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getRecentStatusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("solucion") || normalized.includes("resolvid")) return "bg-green-500/20 text-green-400";
  if (normalized.includes("atendimento")) return "bg-orange-500/20 text-orange-400";
  if (normalized.includes("novo")) return "bg-blue-500/20 text-blue-400";
  if (normalized.includes("pendente")) return "bg-yellow-500/20 text-yellow-400";
  if (normalized.includes("fechado")) return "bg-gray-500/20 text-gray-400";
  return "bg-white/10 text-text-2";
}

export function AnalyticsDashboardPage({ context }: { context: string }) {
  const router = useRouter();
  const isSisContext = context.startsWith("sis");
  const isSisRoot = context === "sis";
  const isDticKiosk = context === "dtic";

  const defaultDepartment: DepartmentFilter =
    context === "sis-manutencao"
      ? "manutencao"
      : context === "sis-memoria"
        ? "conservacao"
        : "all";

  const initialRange = rangeFromPreset("30d");
  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);
  const [department, setDepartment] = useState<DepartmentFilter>(defaultDepartment);
  const [pollTick, setPollTick] = useState(0);

  const [summary, setSummary] = useState<AnalyticsSummaryResult | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendsResult | null>(null);
  const [ranking, setRanking] = useState<AnalyticsRankingResult | null>(null);
  const [recentActivity, setRecentActivity] = useState<AnalyticsRecentActivityResult | null>(null);
  const [newTickets, setNewTickets] = useState<TicketSummary[]>([]);
  const [newTicketsTotal, setNewTicketsTotal] = useState(0);
  const [distributionEntity, setDistributionEntity] = useState<AnalyticsDistributionResult | null>(null);
  const [distributionCategory, setDistributionCategory] = useState<AnalyticsDistributionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const requestCounter = useRef(0);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    if (preset === "custom") return;
    const range = rangeFromPreset(preset);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
  }, [preset]);

  useEffect(() => {
    if (!isSisContext) return;
    if (context === "sis-manutencao") setDepartment("manutencao");
    if (context === "sis-memoria") setDepartment("conservacao");
    if (context === "sis") setDepartment("all");
  }, [context, isSisContext]);

  const hasInvalidCustomRange =
    preset === "custom" && Boolean(dateFrom) && Boolean(dateTo) && dateFrom > dateTo;

  useEffect(() => {
    if (!dateFrom || !dateTo || hasInvalidCustomRange) return;

    const requestId = requestCounter.current + 1;
    requestCounter.current = requestId;
    let cancelled = false;

    async function load(): Promise<void> {
      const isInitialLoad = !hasLoadedOnce.current;
      if (isInitialLoad) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const resolvedDepartment = isSisContext && department !== "all" ? department : null;
        const query = {
          dateFrom,
          dateTo,
          department: resolvedDepartment,
        };

        const [summaryData, trendsData, rankingData, recentData, newTicketsData] = await Promise.all([
          fetchAnalyticsSummary(context, query),
          fetchAnalyticsTrends(context, query),
          fetchAnalyticsRanking(context, query),
          fetchAnalyticsRecentActivity(context, { ...query, limit: 10 }),
          isDticKiosk
            ? fetchTickets(context, {
                status: [1],
                dateFrom,
                dateTo,
                limit: 500,
              })
            : Promise.resolve({ total: 0, tickets: [] }),
        ]);

        let entityData: AnalyticsDistributionResult | null = null;
        let categoryData: AnalyticsDistributionResult | null = null;
        if (isSisContext) {
          [entityData, categoryData] = await Promise.all([
            fetchAnalyticsDistributionEntity(context, { ...query, limit: 10 }),
            fetchAnalyticsDistributionCategory(context, { ...query, limit: 10 }),
          ]);
        }

        if (cancelled || requestCounter.current !== requestId) return;
        setSummary(summaryData);
        setTrends(trendsData);
        setRanking(rankingData);
        setRecentActivity(recentData);
        setNewTickets(newTicketsData.tickets);
        setNewTicketsTotal(newTicketsData.total);
        setDistributionEntity(entityData);
        setDistributionCategory(categoryData);
        setLastUpdated(new Date().toISOString());
        hasLoadedOnce.current = true;
      } catch (err) {
        if (cancelled || requestCounter.current !== requestId) return;
        const message = err instanceof Error ? err.message : "Erro ao carregar dashboard analitico.";
        setError(message);
      } finally {
        if (cancelled || requestCounter.current !== requestId) return;
        hasLoadedOnce.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [context, dateFrom, dateTo, department, hasInvalidCustomRange, isDticKiosk, isSisContext, pollTick]);

  const handleRefresh = () => {
    setPollTick((value) => value + 1);
  };

  useLiveDataRefresh({
    context,
    domains: ["analytics", "tickets", "dashboard", "chargers", "search", "user"],
    onRefresh: handleRefresh,
    pollIntervalMs: POLL_INTERVALS.analytics,
    enabled: !hasInvalidCustomRange,
    minRefreshGapMs: 1_000,
  });

  const chartData =
    trends?.series.map((point) => ({
      ...point,
      label: formatDateLabel(point.date),
    })) || [];

  const kpis = summary?.data;
  const categoryData = distributionCategory?.data || [];
  const entityData = distributionEntity?.data || [];
  const rankingData = ranking?.data || [];
  const recentData = recentActivity?.data || [];
  const newTicketsData = newTickets || [];
  const categoryMax = categoryData.length > 0 ? Math.max(...categoryData.map((item) => item.value), 1) : 1;
  const entityMax = entityData.length > 0 ? Math.max(...entityData.map((item) => item.value), 1) : 1;

  const compactFieldClass =
    "bg-surface-2 border border-white/[0.06] rounded-lg h-8 px-3 text-[12px] text-text-2 outline-none focus:border-white/[0.12]";
  const defaultFieldClass =
    "bg-surface-2 border border-white/[0.06] rounded-lg py-2 px-3 text-[13px] text-text-2 outline-none focus:border-white/[0.12]";

  if (isDticKiosk) {
    return (
      <div className="h-full min-h-0 overflow-hidden px-4 lg:px-6 py-3" data-testid="analytics-kiosk-root">
        <div className="h-full min-h-0 flex flex-col overflow-hidden">
          <header
            className="flex items-center justify-between gap-3 px-4 h-[60px] shrink-0 border-b border-white/[0.10]"
            data-testid="analytics-header-kiosk"
          >
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-none">Dashboard Analítico</h1>
              <p className="text-[11px] opacity-50 mt-0.5 truncate">Monitoramento em tempo real</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={preset}
                onChange={(event) => setPreset(event.target.value as PeriodPreset)}
                className={compactFieldClass}
              >
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="12m">Últimos 12 meses</option>
                <option value="custom">Período personalizado</option>
              </select>

              {preset === "custom" && (
                <>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className={compactFieldClass}
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className={compactFieldClass}
                  />
                </>
              )}
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <LiveClock />
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing || hasInvalidCustomRange}
                className="inline-flex items-center gap-2 bg-surface-2 border border-white/[0.06] hover:border-white/[0.2] px-3 h-8 rounded-lg text-[12px] text-text-2 disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Atualizar
              </button>
            </div>
          </header>

          <div className="mt-2 space-y-2 shrink-0">
            {hasInvalidCustomRange && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-2 text-xs">
                Intervalo inválido: a data inicial precisa ser menor ou igual à data final.
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-2 text-xs">
                {error}
              </div>
            )}
          </div>

          <div className="mt-3 flex-1 min-h-0 grid grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-4 overflow-hidden">
            <div className="min-h-0 grid grid-rows-[100px_minmax(0,3fr)_minmax(0,2fr)] gap-3 overflow-hidden">
              <section className="min-h-0" data-testid="status-cards-row">
                {loading || !kpis ? (
                  <div className="h-full bg-surface-2 border border-white/[0.06] rounded-lg px-4 flex items-center gap-2 text-text-3/60 text-sm">
                    <Loader2 className="animate-spin" size={16} />
                    Carregando métricas...
                  </div>
                ) : (
                  <div className="flex flex-row gap-3 w-full h-full">
                    <article className="flex-1 min-w-0 bg-surface-2 border border-white/[0.06] border-b-2 border-blue-500 rounded-lg py-3 px-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium tracking-wider uppercase opacity-70 truncate">Novos</span>
                        <Activity size={16} className="opacity-60 shrink-0" />
                      </div>
                      <p className="text-2xl font-bold leading-none">{kpis.novos}</p>
                    </article>

                    <article className="flex-1 min-w-0 bg-surface-2 border border-white/[0.06] border-b-2 border-orange-500 rounded-lg py-3 px-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium tracking-wider uppercase opacity-70 truncate">Em Atendimento</span>
                        <Clock3 size={16} className="opacity-60 shrink-0" />
                      </div>
                      <p className="text-2xl font-bold leading-none">{kpis.emAtendimento}</p>
                    </article>

                    <article className="flex-1 min-w-0 bg-surface-2 border border-white/[0.06] border-b-2 border-yellow-500 rounded-lg py-3 px-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium tracking-wider uppercase opacity-70 truncate">Pendentes</span>
                        <BarChart3 size={16} className="opacity-60 shrink-0" />
                      </div>
                      <p className="text-2xl font-bold leading-none">{kpis.pendentes}</p>
                    </article>

                    <article className="flex-1 min-w-0 bg-surface-2 border border-white/[0.06] border-b-2 border-green-500 rounded-lg py-3 px-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium tracking-wider uppercase opacity-70 truncate">Resolvidos</span>
                        <CheckCircle2 size={16} className="opacity-60 shrink-0" />
                      </div>
                      <p className="text-2xl font-bold leading-none">{kpis.resolvidosPeriodo}</p>
                    </article>

                    <article className="flex-1 min-w-0 bg-surface-2 border border-white/[0.06] border-b-2 border-red-500 rounded-lg py-3 px-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium tracking-wider uppercase opacity-70 truncate">Backlog</span>
                        <Users size={16} className="opacity-60 shrink-0" />
                      </div>
                      <p className="text-2xl font-bold leading-none">{kpis.backlogAberto}</p>
                    </article>

                    <article className="flex-1 min-w-0 bg-surface-2 border border-white/[0.06] border-b-2 border-purple-500 rounded-lg py-3 px-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium tracking-wider uppercase opacity-70 truncate">Total</span>
                        <BarChart3 size={16} className="opacity-60 shrink-0" />
                      </div>
                      <p className="text-2xl font-bold leading-none">{kpis.totalPeriodo}</p>
                    </article>
                  </div>
                )}
              </section>

              <section className="min-h-0 w-full bg-surface-2 border border-white/[0.06] rounded-lg p-3">
                <h2 className="text-sm font-medium mb-2 text-text-2">Tendência Diária</h2>
                {loading ? (
                  <div className="h-full flex items-center gap-2 text-text-3/60 text-sm">
                    <Loader2 className="animate-spin" size={16} />
                    Carregando série temporal...
                  </div>
                ) : chartData.length === 0 ? (
                  <p className="text-sm text-text-3/50">Sem dados para o período selecionado.</p>
                ) : (
                  <div className="flex-1 min-h-0 w-full h-[calc(100%-28px)]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 10 }} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(12, 14, 24, 0.96)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 8,
                            color: "#fff",
                          }}
                        />
                        <Line type="monotone" dataKey="totalCriados" stroke="#60A5FA" strokeWidth={2} dot={false} name="Criados" />
                        <Line type="monotone" dataKey="resolvidos" stroke="#34D399" strokeWidth={2} dot={false} name="Resolvidos" />
                        <Line type="monotone" dataKey="emAtendimento" stroke="#FBBF24" strokeWidth={1.8} dot={false} name="Em Atendimento" />
                        <Line type="monotone" dataKey="pendentes" stroke="#F87171" strokeWidth={1.8} dot={false} name="Pendentes" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="min-h-0 bg-surface-2 border border-white/[0.06] rounded-lg p-2 flex flex-col" data-testid="ranking-section">
                <h2 className="text-sm font-medium text-text-2 shrink-0">Ranking de Técnicos</h2>
                {loading ? (
                  <div className="flex-1 flex items-center gap-2 text-text-3/60 text-sm">
                    <Loader2 className="animate-spin" size={16} />
                    Carregando ranking...
                  </div>
                ) : rankingData.length === 0 ? (
                  <p className="text-sm text-text-3/50 mt-2">Sem técnicos resolvidos no período.</p>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-row items-end gap-3 w-full overflow-x-auto overflow-y-hidden custom-scrollbar px-1 py-1 pb-2" data-testid="ranking-horizontal-list">
                    {rankingData.map((item, index) => {
                      const position = index + 1;
                      const firstName = getFirstName(item.technicianName);
                      const initials = getInitials(item.technicianName);

                      if (position <= 3) {
                        const topStyles =
                          position === 1
                            ? {
                                border: "border-yellow-400/70",
                                badge: "text-yellow-400",
                                avatar: "bg-yellow-500/20 border-yellow-400 text-yellow-300",
                                score: "text-yellow-400",
                              }
                            : position === 2
                              ? {
                                  border: "border-gray-400/70",
                                  badge: "text-gray-300",
                                  avatar: "bg-gray-500/20 border-gray-400 text-gray-200",
                                  score: "text-gray-200",
                                }
                              : {
                                  border: "border-amber-600/70",
                                  badge: "text-amber-500",
                                  avatar: "bg-amber-600/20 border-amber-600 text-amber-400",
                                  score: "text-amber-400",
                                };

                        return (
                          <div
                            key={`${item.technicianId}-${position}`}
                            className={`flex flex-col items-center justify-center rounded-lg border bg-white/5 min-w-[108px] h-[120px] relative ${topStyles.border}`}
                            data-testid={`ranking-top-${position}`}
                          >
                            <span className={`absolute top-1 left-2 text-xs font-bold ${topStyles.badge}`}>#{position}</span>
                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${topStyles.avatar}`}>
                              {initials}
                            </div>
                            <span className="text-xs mt-1 text-center px-1 truncate max-w-[100px]" title={item.technicianName}>
                              {firstName}
                            </span>
                            <span className={`text-xl font-bold ${topStyles.score}`}>{item.resolvedCount}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`${item.technicianId}-${position}`}
                          className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 min-w-[80px] h-[90px]"
                          data-testid="ranking-mini-card"
                        >
                          <span className="text-[10px] opacity-50">#{position}</span>
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                            {initials}
                          </div>
                          <span className="text-[10px] truncate max-w-[70px] text-center mt-1" title={item.technicianName}>
                            {firstName}
                          </span>
                          <span className="text-sm font-bold">{item.resolvedCount}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="h-full min-h-0 grid grid-rows-[minmax(0,3fr)_minmax(0,2fr)] gap-3 border-l border-white/10 pl-3">
              <section className="min-h-0 flex flex-col overflow-hidden bg-surface-2 border border-white/[0.06] rounded-lg" data-testid="new-tickets-sidebar">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-semibold">Tickets Novos</h3>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{newTicketsTotal}</span>
                </div>

                {loading ? (
                  <div className="flex-1 px-4 py-3 flex items-center gap-2 text-text-3/60 text-sm">
                    <Loader2 className="animate-spin" size={16} />
                    Carregando tickets novos...
                  </div>
                ) : newTicketsData.length === 0 ? (
                  <div className="flex-1 px-4 py-3 text-sm text-text-3/50">Sem tickets novos no período.</div>
                ) : (
                  <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-white/5">
                    {newTicketsData.map((ticket) => (
                      <button
                        type="button"
                        key={`new-ticket-${ticket.id}`}
                        onClick={() => router.push(`/${context}/ticket/${ticket.id}`)}
                        className="w-full text-left py-2 px-4 hover:bg-white/[0.03] transition-colors"
                        data-testid="new-ticket-item"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                            GLPI-{ticket.id}
                          </span>
                          <span className="text-[10px] opacity-40 shrink-0">{formatIsoDateTime(ticket.dateCreated)}</span>
                        </div>
                        <p className="text-xs font-medium truncate mt-1">{ticket.title}</p>
                        <p className="text-[10px] opacity-60 truncate mt-1">
                          {(ticket.requester || "Sem solicitante")}
                          {ticket.technician ? ` · ${ticket.technician}` : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <aside className="min-h-0 flex flex-col overflow-hidden bg-surface-2 border border-white/[0.06] rounded-lg" data-testid="recent-activity-sidebar">
                <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-semibold">Atividade Recente</h3>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{recentData.length}</span>
                </div>

                {loading ? (
                  <div className="flex-1 px-4 py-2 flex items-center gap-2 text-text-3/60 text-sm">
                    <Loader2 className="animate-spin" size={16} />
                    Carregando atividade...
                  </div>
                ) : recentData.length === 0 ? (
                  <div className="flex-1 px-4 py-2 text-sm text-text-3/50">Sem atividade recente no período.</div>
                ) : (
                  <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-white/5">
                    {recentData.map((item) => (
                      <button
                        type="button"
                        key={`${item.ticketId}-${item.occurredAt}`}
                        onClick={() => router.push(`/${context}/ticket/${item.ticketId}`)}
                        className="w-full text-left py-1.5 px-4 hover:bg-white/[0.03] transition-colors"
                        data-testid="recent-activity-item"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-text-2">
                            GLPI-{item.ticketId}
                          </span>
                          <span className="text-[10px] opacity-40 shrink-0">{formatIsoDateTime(item.occurredAt)}</span>
                        </div>
                        <p className="text-xs font-medium truncate mt-0.5">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 min-w-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRecentStatusClass(item.status)}`}>
                            {item.status}
                          </span>
                          <span className="text-[10px] opacity-60 truncate">
                            {item.technician}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-5 lg:px-8 py-5 gap-4 overflow-y-auto custom-scrollbar">
      <header className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-text-1 tracking-tight">Dashboard Analítico</h1>
          <p className="text-text-2/50 text-[14px] mt-1">
            Visão gerencial de volume, tendência e produtividade por período.
          </p>
          {lastUpdated && (
            <p className="text-text-3/40 text-[12px] mt-1">
              Atualizado em {formatIsoDateTime(lastUpdated)}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={preset}
            onChange={(event) => setPreset(event.target.value as PeriodPreset)}
            className={defaultFieldClass}
          >
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="12m">Últimos 12 meses</option>
            <option value="custom">Período personalizado</option>
          </select>

          {preset === "custom" && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className={defaultFieldClass}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className={defaultFieldClass}
              />
            </>
          )}

          {isSisRoot && (
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value as DepartmentFilter)}
              className={defaultFieldClass}
            >
              <option value="all">Todos os departamentos</option>
              <option value="manutencao">Manutenção</option>
              <option value="conservacao">Conservação e Memória</option>
            </select>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || hasInvalidCustomRange}
            className="inline-flex items-center gap-2 bg-surface-2 border border-white/[0.06] hover:border-white/[0.2] px-3 py-2 rounded-lg text-[13px] text-text-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
      </header>

      {hasInvalidCustomRange && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          Intervalo inválido: a data inicial precisa ser menor ou igual à data final.
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-text-3/60 text-sm">
          <Loader2 className="animate-spin" size={16} />
          Carregando métricas...
        </div>
      )}

      {!loading && kpis && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <article className="bg-surface-2 border border-white/[0.06] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-3/60 uppercase tracking-wide">Novos</span>
                <Activity size={15} className="text-text-3/40" />
              </div>
              <p className="text-2xl font-semibold mt-2">{kpis.novos}</p>
            </article>
            <article className="bg-surface-2 border border-white/[0.06] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-3/60 uppercase tracking-wide">Em Atendimento</span>
                <Clock3 size={15} className="text-text-3/40" />
              </div>
              <p className="text-2xl font-semibold mt-2">{kpis.emAtendimento}</p>
            </article>
            <article className="bg-surface-2 border border-white/[0.06] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-3/60 uppercase tracking-wide">Pendentes</span>
                <BarChart3 size={15} className="text-text-3/40" />
              </div>
              <p className="text-2xl font-semibold mt-2">{kpis.pendentes}</p>
            </article>
            <article className="bg-surface-2 border border-white/[0.06] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-3/60 uppercase tracking-wide">Resolvidos no Período</span>
                <CheckCircle2 size={15} className="text-text-3/40" />
              </div>
              <p className="text-2xl font-semibold mt-2">{kpis.resolvidosPeriodo}</p>
            </article>
            <article className="bg-surface-2 border border-white/[0.06] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-3/60 uppercase tracking-wide">Backlog Aberto</span>
                <Users size={15} className="text-text-3/40" />
              </div>
              <p className="text-2xl font-semibold mt-2">{kpis.backlogAberto}</p>
            </article>
            <article className="bg-surface-2 border border-white/[0.06] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-3/60 uppercase tracking-wide">Total no Período</span>
                <BarChart3 size={15} className="text-text-3/40" />
              </div>
              <p className="text-2xl font-semibold mt-2">{kpis.totalPeriodo}</p>
            </article>
          </section>

          <section className="bg-surface-2 border border-white/[0.06] rounded-lg p-4">
            <h2 className="text-sm font-medium mb-3 text-text-2">Tendência Diária</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-text-3/50">Sem dados para o período selecionado.</p>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(12, 14, 24, 0.96)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                      }}
                    />
                    <Line type="monotone" dataKey="totalCriados" stroke="#60A5FA" strokeWidth={2} dot={false} name="Criados" />
                    <Line type="monotone" dataKey="resolvidos" stroke="#34D399" strokeWidth={2} dot={false} name="Resolvidos" />
                    <Line type="monotone" dataKey="emAtendimento" stroke="#FBBF24" strokeWidth={1.8} dot={false} name="Em Atendimento" />
                    <Line type="monotone" dataKey="pendentes" stroke="#F87171" strokeWidth={1.8} dot={false} name="Pendentes" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {isSisContext && (
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <article className="bg-surface-2 border border-white/[0.06] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-text-2">Distribuição por Categoria</h2>
                  <Tags size={14} className="text-text-3/40" />
                </div>
                {distributionCategory && categoryData.length === 0 ? (
                  <p className="text-sm text-text-3/50">Sem dados de categoria no período.</p>
                ) : (
                  <div className="space-y-3">
                    {categoryData.map((item) => {
                      const ratio = Math.round((item.value / categoryMax) * 100);
                      return (
                        <div key={`${item.name}-${item.value}`} className="space-y-1">
                          <div className="flex justify-between text-xs gap-3">
                            <p className="truncate text-text-2/80" title={item.name}>{item.name}</p>
                            <span className="text-text-2 font-semibold shrink-0">{item.value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                            <div className="h-full bg-amber-400/80 rounded-full" style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="bg-surface-2 border border-white/[0.06] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-text-2">Top Entidades Solicitantes</h2>
                  <Building2 size={14} className="text-text-3/40" />
                </div>
                {distributionEntity && entityData.length === 0 ? (
                  <p className="text-sm text-text-3/50">Sem dados de entidade no período.</p>
                ) : (
                  <div className="space-y-3">
                    {entityData.map((item) => {
                      const ratio = Math.round((item.value / entityMax) * 100);
                      return (
                        <div key={`${item.name}-${item.value}`} className="space-y-1">
                          <div className="flex justify-between text-xs gap-3">
                            <p className="truncate text-text-2/80" title={item.name}>{item.name}</p>
                            <span className="text-text-2 font-semibold shrink-0">{item.value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                            <div className="h-full bg-sky-400/80 rounded-full" style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          )}

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-2">
            <article className="bg-surface-2 border border-white/[0.06] rounded-lg p-4">
              <h2 className="text-sm font-medium mb-3 text-text-2">Ranking de Técnicos</h2>
              {!ranking || ranking.data.length === 0 ? (
                <p className="text-sm text-text-3/50">Sem técnicos resolvidos no período.</p>
              ) : (
                <div className="space-y-2">
                  {ranking.data.map((item, index) => (
                    <div key={`${item.technicianId}-${index}`} className="flex items-center justify-between rounded-md px-3 py-2 bg-black/20 border border-white/[0.04]">
                      <div className="min-w-0">
                        <p className="text-sm text-text-1 truncate">{item.technicianName}</p>
                        <p className="text-[12px] text-text-3/50">ID {item.technicianId}</p>
                      </div>
                      <span className="text-sm font-semibold">{item.resolvedCount}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="bg-surface-2 border border-white/[0.06] rounded-lg p-4">
              <h2 className="text-sm font-medium mb-3 text-text-2">Atividade Recente</h2>
              {!recentActivity || recentActivity.data.length === 0 ? (
                <p className="text-sm text-text-3/50">Sem atividade recente no período.</p>
              ) : (
                <div className="space-y-2">
                  {recentActivity.data.map((item) => (
                    <button
                      type="button"
                      key={`${item.ticketId}-${item.occurredAt}`}
                      onClick={() => router.push(`/${context}/ticket/${item.ticketId}`)}
                      className="w-full text-left rounded-md px-3 py-2 bg-black/20 border border-white/[0.04] hover:border-white/[0.12] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-text-1 truncate">GLPI-{item.ticketId} · {item.title}</p>
                        <span className="text-[11px] text-text-3/50 shrink-0">{formatIsoDateTime(item.occurredAt)}</span>
                      </div>
                      <p className="text-[12px] text-text-3/60 mt-1">
                        {item.status} · {item.category} · {item.technician}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
