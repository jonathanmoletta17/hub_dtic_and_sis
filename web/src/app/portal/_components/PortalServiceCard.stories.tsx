import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { PortalServiceCard } from "@/app/portal/_components/PortalServiceCard";
import { PORTAL_SERVICES } from "@/lib/portal-contexts";

const meta = {
  title: "Portal/PortalServiceCard",
  component: PortalServiceCard,
  tags: ["autodocs", "test"],
  parameters: {
    layout: "padded",
  },
  args: {
    onAction: fn(),
  },
} satisfies Meta<typeof PortalServiceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveTechnology: Story = {
  args: {
    service: PORTAL_SERVICES[0],
    variant: "active",
  },
};

export const ActiveMaintenance: Story = {
  args: {
    service: PORTAL_SERVICES[1],
    variant: "active",
  },
};

export const PendingProtocol: Story = {
  args: {
    service: PORTAL_SERVICES[2],
    variant: "pending",
  },
};
