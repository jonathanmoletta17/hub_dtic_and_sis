import type { LucideIcon } from "lucide-react";
import { Landmark, MessageSquare, Network, Wrench } from "lucide-react";

export type PortalServiceStatus = "active" | "pending";

export interface PortalServiceAction {
  id: string;
  label: string;
  href: string;
}

export interface PortalServiceDefinition {
  id: string;
  title: string;
  shortLabel: string;
  contextId: string | null;
  description: string;
  status: PortalServiceStatus;
  statusLabel: string;
  note: string;
  accentClass: string;
  glowClass: string;
  icon: LucideIcon;
  actions: PortalServiceAction[];
}

export const PORTAL_SERVICES: PortalServiceDefinition[] = [
  {
    id: "ti",
    title: "Tecnologia e acessos",
    shortLabel: "TI",
    contextId: "dtic",
    description:
      "Abra chamados de acesso, sistemas, rede, email e equipamentos em um unico atendimento.",
    status: "active",
    statusLabel: "Disponivel agora",
    note: "Use este servico para pedir acesso, relatar erro ou acompanhar atendimentos de tecnologia.",
    accentClass: "text-sky-500 dark:text-sky-300",
    glowClass: "bg-sky-400/12",
    icon: Network,
    actions: [
      { id: "open", label: "Abrir chamado em TI", href: "/dtic/new-ticket" },
      { id: "mine", label: "Ver chamados de TI", href: "/dtic/user" },
    ],
  },
  {
    id: "manutencao",
    title: "Manutencao operacional",
    shortLabel: "Manutencao",
    contextId: "sis",
    description:
      "Abra chamados para manutencao predial e acompanhe o andamento em um fluxo direto de atendimento.",
    status: "active",
    statusLabel: "Disponivel agora",
    note: "Use este servico para registrar solicitacoes de manutencao e consultar chamados ja abertos.",
    accentClass: "text-amber-500 dark:text-amber-300",
    glowClass: "bg-amber-400/12",
    icon: Wrench,
    actions: [
      { id: "open", label: "Abrir chamado em Manutencao", href: "/sis/new-ticket" },
      { id: "mine", label: "Ver chamados de Manutencao", href: "/sis/user" },
    ],
  },
  {
    id: "protocolo",
    title: "Documentos e protocolo",
    shortLabel: "Protocolo",
    contextId: null,
    description:
      "Canal reservado para documentos e protocolo quando a trilha propria estiver publicada neste portal.",
    status: "pending",
    statusLabel: "Em implantacao",
    note: "Este servico ainda nao esta disponivel neste ambiente.",
    accentClass: "text-violet-500 dark:text-violet-300",
    glowClass: "bg-violet-400/12",
    icon: Landmark,
    actions: [],
  },
  {
    id: "whatsapp",
    title: "Canal WhatsApp",
    shortLabel: "WhatsApp",
    contextId: null,
    description:
      "Canal de atendimento por WhatsApp previsto para ampliar a entrada de solicitacoes pelo portal.",
    status: "pending",
    statusLabel: "Em implantacao",
    note: "Este canal ainda aguarda integracao institucional.",
    accentClass: "text-emerald-500 dark:text-emerald-300",
    glowClass: "bg-emerald-400/12",
    icon: MessageSquare,
    actions: [],
  },
];
