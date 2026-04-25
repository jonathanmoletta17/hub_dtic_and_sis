import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { TicketCard } from "@/components/ui/ticket-card";

const meta = {
  title: "Tickets/TicketCard",
  component: TicketCard,
  tags: ["autodocs", "test"],
  parameters: {
    layout: "centered",
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof TicketCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Novo: Story = {
  args: {
    id: "#13693",
    title: "Equipe inteira sem acesso ao sistema de protocolo",
    description: "Acesso a sistemas > Rede > Liberacao de acesso",
    status: "Novo",
    category: "Tecnologia e acessos",
    sla: "2h",
    slaLevel: "attention",
  },
};

export const Solucionado: Story = {
  args: {
    id: "#8163",
    title: "E2E PLAN TECH 1775706847417",
    description: "Conservacao > Carregadores > Tecnico: Jonathan Nascimento Moletta",
    status: "Solucionado",
    category: "Manutencao operacional",
    sla: "Resolvido",
    slaLevel: "ok",
  },
};

export const Critico: Story = {
  args: {
    id: "#14001",
    title: "Portal do servidor indisponivel para a equipe de gabinete",
    description: "Falha coletiva com impacto operacional imediato.",
    status: "Em atendimento",
    category: "Portal do servidor",
    sla: "5m",
    slaLevel: "critical",
  },
};
