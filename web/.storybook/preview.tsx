import type { Preview } from "@storybook/nextjs-vite";
import React, { useEffect } from "react";

import "@/app/globals.css";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

function ThemeBridge({
  theme,
  children,
}: {
  theme: "light" | "dark";
  children: React.ReactNode;
}) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme);
  }, [setTheme, theme]);

  return (
    <div className="min-h-screen bg-bg-main text-text-1 transition-colors duration-300">
      {children}
    </div>
  );
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Tema do hub",
      toolbar: {
        title: "Tema",
        icon: "mirror",
        items: [
          { value: "dark", title: "Dark" },
          { value: "light", title: "Light" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "dark",
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider>
        <ThemeBridge theme={context.globals.theme}>
          <Story />
        </ThemeBridge>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "padded",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
