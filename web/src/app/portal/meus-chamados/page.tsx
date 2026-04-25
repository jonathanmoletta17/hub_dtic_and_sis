"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, RefreshCcw, Search } from "lucide-react";

import { CategoryBadge } from "@/components/ui/category-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { request } from "@/lib/api/httpClient";
import { buildApiPath, withQuery } from "@/lib/api/client";
import { apiLogin } from "@/lib/api/glpiService";
import type { TicketListResponseDto } from "@/lib/api/contracts/tickets";
import { mapTicketListResponseDto } from "@/lib/api/mappers/tickets";
import type { TicketSummary } from "@/lib/api/types";
import { PORTAL_SERVICES } from "@/lib/portal-contexts";
import { useAuthStore, type AuthMeResponse } from "@/store/useAuthStore";

type PortalTicket = TicketSummary & {
  portalContext: string;
  portalServiceId: string;
  portalServiceLabel: string;
  portalAccentClass: string;
};

type ContextIdentity = AuthMeResponse & { session_token: string };
type FilterType = "all" | "open" | "closed";

function isTicketOpen(ticket: TicketSummary): boolean {
  return ticket.statusId >= 1 && ticket.statusId <= 4;
}

function writeSessionCookie(sessionToken?: string) {
  if (!sessionToken) return;
  document.cookie = `sessionToken=${sessionToken}; path=/; max-age=86400; samesite=strict`;
}

async function fetchMyTicketsDirect(
  context: string,
  sessionToken: string,
  userId: number,
): Promise<{ total: number; tickets: TicketSummary[] }> {
  const pageSize = 200;
  const maxPages = 20;

  let total = 0;
  let offset = 0;
  const allTickets: TicketSummary[] = [];
  const seen = new Set<number>();

  for (let page = 0; page < maxPages; page += 1) {
    const path = withQuery(buildApiPath(context, "db/tickets"), {
      requester_id: userId,
      limit: pageSize,
      offset,
    });

    const dto = await request<TicketListResponseDto>(path, {
      headers: {
        "Session-Token": sessionToken,
      },
    });

    const mapped = mapTicketListResponseDto(dto);

    if (page === 0) total = mapped.total;
    if (mapped.tickets.length === 0) break;

    for (const ticket of mapped.tickets) {
      if (seen.has(ticket.id)) continue;
      seen.add(ticket.id);
      allTickets.push(ticket);
    }

    offset += mapped.tickets.length;
    if (offset >= total) break;
  }

  return { total, tickets: allTickets };
}

async function fetchIdentityDirect(context: string, sessionToken: string): Promise<AuthMeResponse> {
  return request<AuthMeResponse>(buildApiPath(context, "auth/me"), {
    headers: {
      "Session-Token": sessionToken,
    },
  });
}

export default function PortalMyTicketsPage() {
  const router = useRouter();
  const {
    _hasHydrated,
    isAuthenticated,
    getCredentials,
    getCachedSession,
    getSessionToken,
    cacheContextSession,
    setActiveContext,
  } = useAuthStore();

  const sources = useMemo(() => {
    return PORTAL_SERVICES
      .filter((service) => service.status === "active" && Boolean(service.contextId))
      .map((service) => ({
        serviceId: service.id,
        contextId: service.contextId!,
        label: service.shortLabel,
        accentClass: service.accentClass,
      }));
  }, []);

  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [identities, setIdentities] = useState<Record<string, ContextIdentity>>({});
  const identitiesRef = useRef<Record<string, ContextIdentity>>({});
  const hasLoadedOnceRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailableServices, setUnavailableServices] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) router.push("/");
  }, [_hasHydrated, isAuthenticated, router]);

  const loadContext = useCallback(
    async (contextId: string) => {
      const existing = identitiesRef.current[contextId];
      if (existing) {
        return existing;
      }

      const cachedIdentity = getCachedSession(contextId);
      if (cachedIdentity?.session_token) {
        const combined = cachedIdentity as ContextIdentity;
        identitiesRef.current = { ...identitiesRef.current, [contextId]: combined };
        setIdentities(identitiesRef.current);
        return combined;
      }

      const storedToken = getSessionToken(contextId);
      if (storedToken) {
        const me = await fetchIdentityDirect(contextId, storedToken);
        const combined: ContextIdentity = { ...me, session_token: storedToken };
        identitiesRef.current = { ...identitiesRef.current, [contextId]: combined };
        setIdentities(identitiesRef.current);
        return combined;
      }

      const credentials = getCredentials();
      if (!credentials) {
        throw new Error(`Sem sessao ativa para "${contextId}". Volte ao selector e autentique pelo menos uma vez.`);
      }

      const identity = await apiLogin(contextId, {
        username: credentials.username,
        password: credentials.password,
      });

      if (!identity.session_token) {
        throw new Error(`Login retornou sem session_token para "${contextId}".`);
      }

      identitiesRef.current = { ...identitiesRef.current, [contextId]: identity as ContextIdentity };
      setIdentities(identitiesRef.current);
      return identity as ContextIdentity;
    },
    [getCachedSession, getCredentials, getSessionToken],
  );

  const loadTickets = useCallback(async () => {
    if (!_hasHydrated || !isAuthenticated) return;

    const initialLoad = !hasLoadedOnceRef.current;
    if (initialLoad) setLoading(true);
    else setRefreshing(true);
    setError(null);

    const results = await Promise.allSettled(
      sources.map(async (source) => {
        const identity = await loadContext(source.contextId);
        const data = await fetchMyTicketsDirect(source.contextId, identity.session_token, identity.user_id);

        return { source, identity, data };
      }),
    );

    const merged: PortalTicket[] = [];
    const unavailable: string[] = [];

    for (const [index, result] of results.entries()) {
      const source = sources[index];
      if (result.status === "rejected") {
        unavailable.push(source.label);
        continue;
      }

      const { identity, data } = result.value;
      cacheContextSession(source.contextId, identity);

      for (const ticket of data.tickets) {
        merged.push({
          ...ticket,
          portalContext: source.contextId,
          portalServiceId: source.serviceId,
          portalServiceLabel: source.label,
          portalAccentClass: source.accentClass,
        });
      }
    }

    merged.sort((a, b) => Date.parse(b.dateModified) - Date.parse(a.dateModified));

    setTickets(merged);
    setUnavailableServices(unavailable);
    setError(unavailable.length ? "Alguns servicos ainda nao puderam ser consultados nesta sessao." : null);
    setLoading(false);
    setRefreshing(false);
    hasLoadedOnceRef.current = true;
  }, [_hasHydrated, cacheContextSession, isAuthenticated, loadContext, sources]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadTickets();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [loadTickets]);

  const filtered = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const applySearch = (ticket: PortalTicket) => {
      if (!normalizedSearch) return true;
      const haystack = [
        ticket.title,
        ticket.content,
        ticket.category,
        ticket.status,
        ticket.portalServiceLabel,
        ticket.portalContext,
        ticket.requester,
        ticket.technician,
        ticket.groupName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return normalizedSearch
        .split(/\s+/)
        .filter(Boolean)
        .every((term) => haystack.includes(term));
    };

    return tickets.filter((ticket) => {
      if (filter === "open" && !isTicketOpen(ticket)) return false;
      if (filter === "closed" && isTicketOpen(ticket)) return false;
      return applySearch(ticket);
    });
  }, [filter, searchQuery, tickets]);

  const openCount = tickets.filter((ticket) => isTicketOpen(ticket)).length;
  const closedCount = tickets.length - openCount;
  const ticketSummary = [
    { id: "total", label: "Total", value: tickets.length, hint: "Lista consolidada" },
    { id: "open", label: "Em andamento", value: openCount, hint: "Chamados abertos" },
    { id: "closed", label: "Finalizados", value: closedCount, hint: "Resolvidos e fechados" },
  ];

  const openTicket = useCallback(
    async (ticket: PortalTicket) => {
      const identity = identities[ticket.portalContext];
      if (!identity?.session_token) {
        setError("Sessao do contexto nao carregada. Atualize a pagina e tente novamente.");
        return;
      }

      writeSessionCookie(identity.session_token);
      setActiveContext(ticket.portalContext, identity);
      router.push(`/${ticket.portalContext}/ticket/${ticket.id}`);
    },
    [identities, router, setActiveContext],
  );

  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-main text-text-1">
        <Loader2 className="animate-spin text-accent-blue" size={32} />
      </div>
    );
  }

  const filterOptions = [
    { key: "all" as const, label: "Todos", count: tickets.length },
    { key: "open" as const, label: "Em andamento", count: openCount },
    { key: "closed" as const, label: "Finalizados", count: closedCount },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg-main text-text-1">
      <div className="aurora-mesh" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_48%),radial-gradient(circle_at_78%_22%,_rgba(251,191,36,0.14),_transparent_34%),radial-gradient(circle_at_54%_78%,_rgba(16,185,129,0.10),_transparent_32%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-8 lg:px-12">
        <header
          className="mb-6 flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div>
            <div className="theme-copy-soft mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.32em]">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-300/80" />
              Portal de servicos
            </div>
            <h1 className="text-3xl font-black tracking-tight text-text-1 lg:text-5xl">Meus chamados</h1>
            <p className="theme-copy-muted mt-3 max-w-2xl text-sm leading-7 lg:text-[15px]">
              Consulte os chamados abertos pelos servicos ativos do portal em uma visao unica.
            </p>
            {!loading ? (
              <p className="theme-copy-soft mt-2 text-[12px]">
                {filtered.length} de {tickets.length} chamados exibidos
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <Link
              href="/portal"
              className="theme-shell-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft size={15} />
              Voltar ao portal
            </Link>
            <button
              type="button"
              onClick={() => void loadTickets()}
              disabled={loading || refreshing}
              className="theme-shell-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-70"
            >
              <RefreshCcw size={15} className={refreshing ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </header>

        {error ? (
          <div
            className="mb-5 rounded-xl border p-4"
            style={{
              borderColor: "color-mix(in srgb, var(--status-active) 24%, transparent)",
              background: "var(--status-active-bg)",
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5" style={{ color: "var(--status-active)" }} />
              <div>
                <p className="text-sm font-semibold text-text-1">Consulta parcial</p>
                <p className="mt-1 text-sm leading-6 text-text-2">
                  {error}{" "}
                  {unavailableServices.length > 0
                    ? `Servicos pendentes nesta sessao: ${unavailableServices.join(", ")}.`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          {ticketSummary.map((item) => (
            <div key={item.id} className="theme-panel rounded-2xl p-4">
              <p className="theme-copy-soft text-[11px] font-semibold uppercase tracking-[0.18em]">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight text-text-1">{item.value}</p>
              <p className="theme-copy-soft mt-1 text-[12px]">{item.hint}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-2xl border px-4 py-4 lg:px-5" style={{ borderColor: "var(--card-border)", background: "linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 90%, transparent) 0%, var(--bg-surface) 100%)", boxShadow: "var(--card-shadow)" }}>
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

          <div className="group relative flex-grow lg:max-w-2xl">
            <Search
              className="theme-copy-soft absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-text-2"
              size={14}
            />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por titulo, categoria, status, tecnico ou servico..."
              className="theme-input w-full rounded-lg py-2.5 pl-9 pr-4 text-[14px] outline-none transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="animate-spin text-accent-blue" size={32} />
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3 pb-12">
            {filtered.length === 0 ? (
              <div className="theme-panel rounded-2xl p-6 text-sm text-text-2">
                <p className="font-semibold text-text-1">Nenhum chamado encontrado.</p>
                <p className="mt-2 leading-6">
                  Ajuste os filtros ou volte ao portal para abrir um novo atendimento.
                  {unavailableServices.length > 0
                    ? " Se precisar consultar outro servico, abra esse servico pelo portal para sincronizar a sessao."
                    : ""}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {filtered.map((ticket) => {
                  const updatedLabel = new Date(ticket.dateModified).toLocaleString("pt-BR");
                  const preview = ticket.content?.trim() || ticket.category;

                  return (
                    <button
                      key={`${ticket.portalContext}:${ticket.id}`}
                      type="button"
                      onClick={() => void openTicket(ticket)}
                      className="theme-card theme-card-interactive group flex w-full flex-col rounded-2xl p-5 text-left transition-colors"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <CategoryBadge className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${ticket.portalAccentClass}`}>
                            {ticket.portalServiceLabel}
                          </CategoryBadge>
                          <span
                            className="theme-copy-soft inline-flex rounded-full border px-2 py-1 text-[10px] font-mono"
                            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface-alt)" }}
                          >
                            GLPI-{ticket.id}
                          </span>
                        </div>
                        <StatusBadge status={ticket.status} className="px-3 py-1 text-[11px]" />
                      </div>

                      <h2 className="text-[15px] font-semibold text-text-1 transition-colors group-hover:text-text-1">
                        {ticket.title}
                      </h2>
                      <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-text-2">{preview}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <CategoryBadge className="text-[10px] uppercase tracking-[0.16em]">
                          {ticket.category}
                        </CategoryBadge>
                        {ticket.technician ? (
                          <span
                            className="theme-copy-soft inline-flex rounded-full border px-2.5 py-1 text-[10px]"
                            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface-alt)" }}
                          >
                            Tecnico: {ticket.technician}
                          </span>
                        ) : null}
                      </div>

                      <p className="theme-copy-soft mt-4 text-[12px]">Atualizado em {updatedLabel}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
