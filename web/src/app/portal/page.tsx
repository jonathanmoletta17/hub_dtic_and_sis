"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { PortalServiceCard } from "@/app/portal/_components/PortalServiceCard";
import { apiLogin } from "@/lib/api/glpiService";
import { PORTAL_SERVICES, type PortalServiceDefinition } from "@/lib/portal-contexts";
import { useAuthStore, type AuthMeResponse } from "@/store/useAuthStore";

function writeSessionCookie(sessionToken?: string) {
  if (!sessionToken) return;
  document.cookie = `sessionToken=${sessionToken}; path=/; max-age=86400; samesite=strict`;
}

function resolveActionTarget(identity: AuthMeResponse, fallbackHref: string) {
  if (fallbackHref.includes("/new-ticket") || fallbackHref.includes("/user")) {
    return fallbackHref;
  }

  const activeRole = identity.active_hub_role || identity.hub_roles?.[0];
  if (!activeRole) return fallbackHref;

  const targetContext = activeRole.context_override || identity.context;
  return `/${targetContext}/${activeRole.route}`;
}

export default function PortalPage() {
  const router = useRouter();
  const {
    _hasHydrated,
    isAuthenticated,
    username,
    getCredentials,
    setActiveContext,
    cacheContextSession,
    getCachedSession,
  } = useAuthStore();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  const openPortalAction = async (service: PortalServiceDefinition, href: string) => {
    if (!service.contextId || loadingAction) return;

    const actionId = `${service.id}:${href}`;
    setLoadingAction(actionId);
    setError(null);

    const navigateWithIdentity = (identity: AuthMeResponse) => {
      if (identity.session_token) {
        writeSessionCookie(identity.session_token);
      }
      setActiveContext(service.contextId!, identity);
      router.push(resolveActionTarget(identity, href));
    };

    try {
      const cached = getCachedSession(service.contextId);
      if (cached) {
        navigateWithIdentity(cached);
        return;
      }

      const credentials = getCredentials();
      if (!credentials) {
        router.push("/selector");
        return;
      }

      const identity = await apiLogin(service.contextId, {
        username: credentials.username,
        password: credentials.password,
      });

      cacheContextSession(service.contextId, identity);
      navigateWithIdentity(identity);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Falha ao preparar o contexto operacional deste servico.";
      setError(message);
      setLoadingAction(null);
      return;
    }

    setLoadingAction(null);
  };

  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-main text-text-1">
        <Loader2 className="animate-spin text-accent-blue" size={32} />
      </div>
    );
  }

  const activeServices = PORTAL_SERVICES.filter((service) => service.status === "active");
  const pendingServices = PORTAL_SERVICES.filter((service) => service.status === "pending");
  const summaryCards = [
    { id: "active", label: "Disponiveis agora", value: String(activeServices.length).padStart(2, "0"), hint: "Servicos prontos para uso" },
    { id: "pending", label: "Em implantacao", value: String(pendingServices.length).padStart(2, "0"), hint: "Entradas ainda em preparacao" },
    { id: "tracking", label: "Acompanhamento", value: "01", hint: "Lista consolidada de chamados" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg-main text-text-1">
      <div className="aurora-mesh" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[42rem] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_48%),radial-gradient(circle_at_78%_22%,_rgba(251,191,36,0.16),_transparent_34%),radial-gradient(circle_at_54%_78%,_rgba(16,185,129,0.12),_transparent_32%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-8 lg:px-12">
        <header className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div
            className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="max-w-3xl">
              <div className="theme-copy-soft mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.32em]">
                <ShieldCheck size={14} style={{ color: "var(--accent-primary)" }} />
                Portal de servicos
              </div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-text-1 lg:text-6xl">
                Entre pelo servico e siga direto para o atendimento.
              </h1>
              <p className="theme-copy-muted mt-4 max-w-2xl text-sm leading-7 lg:text-[15px]">
                O portal organiza a entrada por servico, reduz navegacao desnecessaria e mantem o acompanhamento no mesmo lugar.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="theme-shell-button theme-copy-soft rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em]">
                Conectado como {username || "usuario autenticado"}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/portal/meus-chamados"
                  className="theme-shell-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
                >
                  Meus chamados
                  <ArrowRight size={15} />
                </Link>
                <button
                  type="button"
                  onClick={() => router.push("/selector")}
                  className="theme-shell-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
                >
                  <ArrowLeft size={15} />
                  Escolher outro ambiente
                </button>
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div
              className="rounded-2xl border p-4 shadow-[var(--card-shadow)]"
              style={{
                borderColor: "color-mix(in srgb, var(--status-active) 28%, transparent)",
                background: "var(--status-active-bg)",
              }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5" style={{ color: "var(--status-active)" }} />
                <div>
                  <p className="text-sm font-semibold text-text-1">Falha ao abrir o servico</p>
                  <p className="mt-1 text-sm leading-6 text-text-2">{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <main className="flex flex-1 flex-col gap-8 py-8 lg:py-10">
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid gap-3 md:grid-cols-3">
              {summaryCards.map((item) => (
                <div key={item.id} className="theme-panel rounded-2xl p-4">
                  <p className="theme-copy-soft text-[11px] font-semibold uppercase tracking-[0.18em]">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-text-1">{item.value}</p>
                  <p className="theme-copy-soft mt-1 text-[12px]">{item.hint}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div
              className="mb-6 flex items-end justify-between gap-4 border-b pb-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div>
                <p className="theme-copy-soft text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Servicos disponiveis
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-1 lg:text-3xl">
                  Acesso direto aos canais ativos.
                </h2>
              </div>
              <Link
                href="/portal/meus-chamados"
                className="hidden items-center gap-2 text-sm font-medium text-accent-blue transition-colors hover:text-accent-blue lg:inline-flex"
              >
                Ver lista consolidada
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="space-y-5">
              {activeServices.map((service, index) => (
                <div key={service.id} style={{ animationDelay: `${index * 80}ms` }}>
                  <PortalServiceCard
                    service={service}
                    variant="active"
                    loadingAction={loadingAction}
                    disabled={Boolean(loadingAction)}
                    onAction={(targetService, href) => void openPortalAction(targetService, href)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="theme-panel p-6 backdrop-blur-sm lg:p-7">
                <p className="theme-copy-soft text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Como usar
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-text-2">
                  <li>Abra o servico certo e siga direto para o atendimento.</li>
                  <li>Use &quot;Meus chamados&quot; para acompanhar tudo em uma unica lista.</li>
                  <li>Quando um novo canal entrar no portal, ele aparecera aqui.</li>
                </ul>
              </div>

              <div className="theme-panel p-6 backdrop-blur-sm lg:p-7">
                <p className="theme-copy-soft text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Em implantacao
                </p>
                <div className="mt-4 grid gap-3">
                  {pendingServices.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-2xl border px-4 py-4"
                      style={{
                        borderColor: "var(--border-subtle)",
                        background: "color-mix(in srgb, var(--bg-surface-alt) 78%, transparent)",
                      }}
                    >
                      <p className="text-sm font-semibold text-text-1">{service.title}</p>
                      <p className="theme-copy-soft mt-1 text-[13px] leading-6">{service.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
