import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import {
  DashboardOverviewHeader,
} from "@/components/dashboard/DashboardOverviewHeader";
import { dashboardStatsFixture } from "@/components/dashboard/dashboardFixtures";
import { buildDashboardStatCards } from "@/components/dashboard/dashboardStats";

const stats = buildDashboardStatCards(dashboardStatsFixture);

const meta = {
  title: "Dashboard/DashboardOverviewHeader",
  component: DashboardOverviewHeader,
  tags: ["autodocs", "test"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    contextBadge: "DTIC",
    roleLabel: "Tecnico DTIC",
    title: "Painel operacional",
    headerCountLabel: "38 chamados",
    searchQuery: "",
    refreshing: false,
    loading: false,
    statCards: stats,
    onSearchQueryChange: fn(),
  },
  render: (args) => (
    <div className="min-h-screen p-5 lg:p-8">
      <DashboardOverviewHeader {...args} />
    </div>
  ),
} satisfies Meta<typeof DashboardOverviewHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    loading: true,
    refreshing: true,
    headerCountLabel: null,
    statCards: stats.map((stat) => ({ ...stat, value: "--" })),
  },
};

export const Filtered: Story = {
  args: {
    searchQuery: "acesso sei",
    headerCountLabel: "2 de 6 chamados",
  },
};
