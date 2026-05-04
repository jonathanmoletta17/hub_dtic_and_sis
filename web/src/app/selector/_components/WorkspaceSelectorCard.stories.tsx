import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Network } from "lucide-react";
import { fn } from "storybook/test";

import { WorkspaceSelectorCard } from "@/app/selector/_components/WorkspaceSelectorCard";

const meta = {
  title: "Selector/WorkspaceSelectorCard",
  component: WorkspaceSelectorCard,
  tags: ["autodocs", "test"],
  parameters: {
    layout: "padded",
  },
  args: {
    workspaceId: "dtic",
    label: "DTIC",
    subtitle: "Tecnologia, acessos e sistemas",
    description: "Atendimento de tecnologia, sistemas, redes, e-mail, acessos e equipamentos.",
    accentSurfaceClass: "bg-accent-blue/10 border-accent-blue",
    accentDotClass: "bg-accent-blue/80",
    accentTextClass: "text-accent-blue",
    gradientClass: "from-accent-blue/20 to-transparent",
    glowClass: "bg-accent-blue/40",
    borderClassName: "hover:border-accent-blue",
    icon: <Network size={28} />,
    loading: false,
    disabled: false,
    onSelect: fn(),
  },
  render: (args) => (
    <div className="max-w-[28rem]">
      <WorkspaceSelectorCard {...args} />
    </div>
  ),
} satisfies Meta<typeof WorkspaceSelectorCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    loading: true,
    disabled: true,
  },
};
