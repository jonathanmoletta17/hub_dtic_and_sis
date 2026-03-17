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

import {
  fetchAnalyticsDistributionCategory,
  fetchAnalyticsDistributionEntity,
  fetchAnalyticsRanking,
  fetchAnalyticsRecentActivity,
  fetchAnalyticsSummary,
  fetchAnalyticsTrends,
} from "@/lib/api/analyticsService";
import type {
  AnalyticsDistributionResult,
  AnalyticsRankingResult,
  AnalyticsRecentActivityResult,
  AnalyticsSummaryResult,
  AnalyticsTrendsResult,
} from "@/lib/api/models/analytics";
import { formatIsoDateTime } from "@/lib/datetime/iso";

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

export function AnalyticsDashboardPage({ context }: { context: string }) {
  const router = useRouter();
  const isSisContext = context.startsWith("sis");
  const isSisRoot = context === "sis";

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPollTick((prev) => prev + 1);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

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

        const [summaryData, trendsData, rankingData, recentData] = await Promise.all([
          fetchAnalyticsSummary(context, query),
          fetchAnalyticsTrends(context, query),
          fetchAnalyticsRanking(context, { ...query, limit: 10 }),
          fetchAnalyticsRecentActivity(context, { ...query, limit: 10 }),
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
  }, [context, dateFrom, dateTo, department, hasInvalidCustomRange, isSisContext, pollTick]);

  const chartData =
    trends?.series.map((point) => ({
      ...point,
      label: formatDateLabel(point.date),
    })) || [];

  const kpis = summary?.data;
  const categoryData = distributionCategory?.data || [];
  const entityData = distributionEntity?.data || [];
  const categoryMax = categoryData.length > 0 ? Math.max(...categoryData.map((item) => item.value), 1) : 1;
  const entityMax = entityData.length > 0 ? Math.max(...entityData.map((item) => item.value), 1) : 1;

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
            className="bg-surface-2 border border-white/[0.06] rounded-lg py-2 px-3 text-[13px] text-text-2 outline-none focus:border-white/[0.12]"
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
                className="bg-surface-2 border border-white/[0.06] rounded-lg py-2 px-3 text-[13px] text-text-2 outline-none focus:border-white/[0.12]"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="bg-surface-2 border border-white/[0.06] rounded-lg py-2 px-3 text-[13px] text-text-2 outline-none focus:border-white/[0.12]"
              />
            </>
          )}

          {isSisRoot && (
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value as DepartmentFilter)}
              className="bg-surface-2 border border-white/[0.06] rounded-lg py-2 px-3 text-[13px] text-text-2 outline-none focus:border-white/[0.12]"
            >
              <option value="all">Todos os departamentos</option>
              <option value="manutencao">Manutenção</option>
              <option value="conservacao">Conservação e Memória</option>
            </select>
          )}

          <button
            type="button"
            onClick={() => setPollTick((value) => value + 1)}
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
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }} />
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
