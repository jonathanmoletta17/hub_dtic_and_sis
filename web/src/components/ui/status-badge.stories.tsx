import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { StatusBadge } from "@/components/ui/status-badge";

const meta = {
  title: "Tickets/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs", "test"],
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllStatuses: Story = {
  args: {
    status: "Novo",
  },
  render: () => (
    <div className="flex flex-wrap gap-3 p-4">
      {["Novo", "Em atendimento", "Planejado", "Pendente", "Solucionado", "Fechado"].map((status) => (
        <StatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};
