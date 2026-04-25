import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { DticAgentWelcomePanel } from "@/modules/tickets/components/agent-chat/DticAgentWelcomePanel";

const meta = {
  title: "DTIC/AgentWelcomePanel",
  component: DticAgentWelcomePanel,
  tags: ["autodocs", "test"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    assistantIntro: "Escreva o problema, erro ou pedido. Se faltar detalhe, eu peco.",
    sending: false,
    onPromptSelect: fn(),
  },
  render: (args) => (
    <div className="min-h-screen px-5 py-5 lg:px-8">
      <section className="mx-auto flex min-h-0 w-full max-w-[88rem] flex-1 flex-col">
        <div className="theme-panel relative flex min-h-[34rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[36px] backdrop-blur-xl px-5 py-5 lg:px-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_60%)]" />
          <div className="relative z-10">
            <DticAgentWelcomePanel {...args} />
          </div>
        </div>
      </section>
    </div>
  ),
} satisfies Meta<typeof DticAgentWelcomePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sending: Story = {
  args: {
    sending: true,
  },
};
