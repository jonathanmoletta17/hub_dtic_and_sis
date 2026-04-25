import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { DashboardQueuePanel } from "@/components/dashboard/DashboardQueuePanel";
import {
  dashboardFilteredTicketsFixture,
  dashboardTicketsFixture,
} from "@/components/dashboard/dashboardFixtures";

const meta = {
  title: "Dashboard/DashboardQueuePanel",
  component: DashboardQueuePanel,
  tags: ["autodocs", "test"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    context: "dtic",
    title: "Chamados por status",
    tickets: dashboardTicketsFixture,
    loading: false,
    emptyMessage: "Nenhum chamado encontrado para este contexto.",
    onTicketOpen: fn(),
  },
  render: (args) => (
    <div className="min-h-screen p-5 lg:p-8">
      <DashboardQueuePanel {...args} />
    </div>
  ),
} satisfies Meta<typeof DashboardQueuePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  args: {
    title: "Resultados da busca",
    tickets: dashboardFilteredTicketsFixture,
  },
};

export const Loading: Story = {
  args: {
    tickets: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    countLabel: "0 chamados",
    tickets: [],
  },
};
