import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { LoginSurface } from "@/app/_components/LoginSurface";

const meta = {
  title: "Auth/LoginSurface",
  component: LoginSurface,
  tags: ["autodocs", "test"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    username: "jonathan-moletta",
    password: "********",
    loading: false,
    errorMsg: "",
    onUsernameChange: fn(),
    onPasswordChange: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof LoginSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Error: Story = {
  args: {
    errorMsg: "Login invalido. Use seu usuario de rede no formato nome-sobrenome.",
  },
};
