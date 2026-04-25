import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FeatureManifest } from "@/lib/context-registry";
import type { AuthMeResponse } from "@/store/useAuthStore";
import { AppSidebar } from "@/components/ui/AppSidebar";

const dticItems: FeatureManifest[] = [
  {
    id: "dashboard",
    label: "Painel",
    icon: "LayoutDashboard",
    route: "/dtic/dashboard",
    requiredRoles: ["tecnico"],
  },
  {
    id: "new-ticket",
    label: "Abrir chamado",
    icon: "PlusSquare",
    route: "/dtic/new-ticket",
    requiredRoles: [],
  },
  {
    id: "user",
    label: "Meus chamados",
    icon: "Ticket",
    route: "/dtic/user",
    requiredRoles: [],
  },
];

const mockIdentity: AuthMeResponse = {
  context: "dtic",
  user_id: 1032,
  name: "Jonathan Moletta",
  roles: {
    active_profile: { id: 4, name: "Tecnico" },
    available_profiles: [{ id: 4, name: "Tecnico" }],
    groups: [],
  },
  hub_roles: [
    {
      role: "tecnico",
      label: "Tecnico DTIC",
      profile_id: 4,
      group_id: null,
      route: "dashboard",
      context_override: "dtic",
    },
  ],
  app_access: ["dtic"],
};

const meta = {
  title: "Shell/AppSidebar",
  component: AppSidebar,
  tags: ["autodocs", "test"],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      navigation: {
        pathname: "/dtic/dashboard",
      },
    },
  },
  args: {
    items: dticItems,
    contextOverride: "dtic",
    pathnameOverride: "/dtic/dashboard",
    currentUserRoleOverride: mockIdentity,
    showProfileMenu: false,
  },
} satisfies Meta<typeof AppSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  render: (args) => (
    <div className="min-h-screen max-w-[16rem] p-4">
      <AppSidebar {...args} />
    </div>
  ),
};

export const Mobile: Story = {
  args: {
    variant: "mobile",
  },
  render: (args) => (
    <div className="min-h-[36rem] max-w-sm p-4">
      <AppSidebar {...args} />
    </div>
  ),
};
