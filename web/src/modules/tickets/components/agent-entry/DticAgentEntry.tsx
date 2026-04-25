"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCopy,
  Cpu,
  ShieldCheck,
} from "lucide-react";

import {
  buildDticAgentOutcome,
  DTIC_AGENT_DEFINITIONS,
  getDticAgentDefinition,
  type DticAgentDraft,
  type DticAgentId,
  type DticScope,
  type DticSurface,
  type DticUrgency,
} from "./dtic-agent-flow";
import { frontendRuntimeConfig } from "@/lib/config/runtime";

const AGENT_ICONS = {
  incidentes: Cpu,
  acessos: ShieldCheck,
  operacional: Bot,
} satisfies Record<DticAgentId, typeof Bot>;

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

const URGENCY_OPTIONS: SegmentedOption<DticUrgency>[] = [
  { value: "critico", label: "Critico" },
  { value: "alto", label: "Alto" },
  { value: "normal", label: "Normal" },
];

const SCOPE_OPTIONS: SegmentedOption<DticScope>[] = [
  { value: "individual", label: "Pessoa" },
  { value: "equipe", label: "Equipe" },
  { value: "setor", label: "Setor" },
];

const SURFACE_OPTIONS: SegmentedOption<DticSurface>[] = [
  { value: "rede", label: "Rede" },
  { value: "equipamento", label: "Equipamento" },
  { value: "sistema", label: "Sistema" },
  { value: "acesso", label: "Acesso" },
];

function SegmentedGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-3/50">
        {label}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                selected
                  ? "border-sky-400/50 bg-sky-400/12 text-text-1"
                  : "border-white/[0.08] bg-black/10 text-text-2/75 hover:border-white/[0.12] hover:bg-black/20"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DticAgentEntry() {
  const [selectedAgentId, setSelectedAgentId] = useState<DticAgentId>("incidentes");
  const [urgency, setUrgency] = useState<DticUrgency>("alto");
  const [scope, setScope] = useState<DticScope>("individual");
  const [surface, setSurface] = useState<DticSurface>(getDticAgentDefinition("incidentes").defaultSurface);
  const [narrative, setNarrative] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedAgent = getDticAgentDefinition(selectedAgentId);
  const summaryReady = narrative.trim().length >= 12;
  const outcome = buildDticAgentOutcome({
    agentId: selectedAgentId,
    urgency,
    scope,
    surface,
    narrative: summaryReady ? narrative : "Resumo ainda nao informado.",
  } satisfies DticAgentDraft);
  const structuredPayload = encodeURIComponent(JSON.stringify(outcome.handoffPayload));
  const agentLaunchUrl =
    `${frontendRuntimeConfig.dticAgentUrl}?source=hub-operacional-web&context=dtic` +
    `&handoff_payload=${structuredPayload}` +
    `&handoff=${encodeURIComponent(outcome.handoffQuery)}`;

  const toneClasses = {
    critical: "border-red-400/20 bg-red-500/10 text-red-200",
    warning: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    neutral: "border-emerald-400/20 bg-emerald-400/10 text-emerald-700 dark:text-emerald-100",
  } as const;

  const handleAgentChange = (agentId: DticAgentId) => {
    setSelectedAgentId(agentId);
    setSurface(getDticAgentDefinition(agentId).defaultSurface);
    setCopied(false);
  };

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(outcome.handoffBrief);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 lg:gap-8">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <div className="rounded-[28px] border border-white/[0.08] bg-surface-1/85 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.32)] backdrop-blur-sm lg:p-7">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-3/50">
            Entrada Agent-First
          </p>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-text-1 lg:text-[2rem]">
            O DTIC deixa de abrir chamados por formulario e passa a operar por agentes.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-2/70 lg:text-[15px]">
            Esta rota agora representa a futura entrada assistida da DTIC. Os agentes vao coletar o contexto,
            classificar a demanda e acionar o fluxo correto sem depender do FormCreator, que hoje e o ponto mais
            fragil do contexto DTIC.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {DTIC_AGENT_DEFINITIONS.map(({ id, title, description }) => {
              const Icon = AGENT_ICONS[id];
              const selected = id === selectedAgentId;

              return (
                <article
                  key={id}
                  className={`rounded-[22px] border p-4 transition-colors ${
                    selected
                      ? "border-sky-400/40 bg-sky-400/10"
                      : "border-white/[0.08] bg-black/15 hover:border-white/[0.12] hover:bg-black/20"
                  }`}
                >
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-300">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-sm font-semibold text-text-1">{title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-text-2/65">{description}</p>
                  <button
                    type="button"
                    onClick={() => handleAgentChange(id)}
                    className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                      selected
                        ? "border-sky-400/30 bg-sky-400/15 text-sky-700 dark:text-sky-100"
                        : "border-white/[0.08] bg-white/[0.04] text-text-2/75 hover:bg-white/[0.08]"
                    }`}
                  >
                    {selected ? <CheckCircle2 size={12} /> : <ArrowRight size={12} />}
                    {selected ? "Agente selecionado" : "Selecionar agente"}
                  </button>
                </article>
              );
            })}
          </div>

          <div className="mt-6 rounded-[24px] border border-white/[0.08] bg-black/15 p-5">
            <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-3/50">
                  Triagem operacional
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-text-1">
                  {selectedAgent.title}
                </h3>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${toneClasses[outcome.urgencyTone]}`}>
                {outcome.queueLabel}
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <SegmentedGroup
                label="Urgencia"
                value={urgency}
                options={URGENCY_OPTIONS}
                onChange={setUrgency}
              />
              <SegmentedGroup
                label="Escopo impactado"
                value={scope}
                options={SCOPE_OPTIONS}
                onChange={setScope}
              />
              <SegmentedGroup
                label="Superficie da demanda"
                value={surface}
                options={SURFACE_OPTIONS}
                onChange={setSurface}
              />

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-3/50">
                  Resumo objetivo para o agente
                </p>
                <textarea
                  value={narrative}
                  onChange={(event) => {
                    setNarrative(event.target.value);
                    setCopied(false);
                  }}
                  rows={5}
                  placeholder="Descreva o bloqueio, sistema, unidade impactada e qualquer contexto que o agente precisa receber."
                  className="w-full resize-none rounded-[22px] border border-white/[0.08] bg-black/15 px-4 py-3 text-sm leading-7 text-text-1 outline-none transition-colors placeholder:text-text-3/35 focus:border-white/[0.14]"
                />
                <p className="mt-2 text-[12px] text-text-3/45">
                  O minimo recomendado e um resumo claro do problema e do impacto operacional.
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-[28px] border border-white/[0.08] bg-surface-1/80 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm lg:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-3/50">
            Saida do agente
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-text-1">
            O fluxo agora produz um handoff operacional claro antes de qualquer ticket.
          </h3>

          <div className="mt-5 rounded-[24px] border border-white/[0.08] bg-black/15 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-3/50">
              Encaminhamento sugerido
            </p>
            <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${toneClasses[outcome.urgencyTone]}`}>
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle size={15} />
                {outcome.queueLabel}
              </div>
              <p className="mt-2 leading-6">
                {summaryReady
                  ? "O agente ja consegue encaminhar a demanda com contexto suficiente para operacao."
                  : "Preencha o resumo para gerar um handoff objetivo antes do encaminhamento."}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/[0.08] bg-black/15 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-3/50">
              Handoff do agente
            </p>
            <h4 className="mt-3 text-base font-semibold text-text-1">{outcome.summaryTitle}</h4>
            <ul className="theme-copy-muted mt-3 space-y-2 text-sm leading-6">
              {outcome.summaryLines.map((item) => (
                <li key={item} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-2xl border border-white/[0.06] bg-surface-1/80 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-3/45">
                Texto pronto para transferencia
              </p>
              <pre className="whitespace-pre-wrap font-mono text-[12px] leading-6 text-text-2/75">
                {outcome.handoffBrief}
              </pre>
            </div>

            <button
              type="button"
              onClick={handleCopyBrief}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-text-1 transition-colors hover:bg-white/[0.08]"
            >
              <ClipboardCopy size={16} />
              {copied ? "Resumo copiado" : "Copiar resumo do agente"}
            </button>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/[0.08] bg-black/15 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-3/50">
              Checklist do agente
            </p>
            <div className="mt-3 space-y-3">
              {selectedAgent.checklist.map((item) => (
                <div
                  key={item}
                  className="theme-copy-muted rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm leading-6"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <a
              href={agentLaunchUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-between rounded-2xl bg-emerald-500/90 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Abrir Hermes com este resumo
              <ArrowRight size={16} />
            </a>
            <Link
              href={outcome.primaryHref}
              className="inline-flex items-center justify-between rounded-2xl bg-blue-500/90 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              {outcome.primaryLabel}
              <ArrowRight size={16} />
            </Link>
            <Link
              href={outcome.secondaryHref}
              className="inline-flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-text-1 transition-colors hover:bg-white/[0.08]"
            >
              {outcome.secondaryLabel}
              <ArrowRight size={16} />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
