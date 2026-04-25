import { defineConfig, mergeConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  defineConfig({
    resolve: {
      alias: {
        "@": path.resolve(dirname, "./src"),
      },
    },
  }),
  defineConfig({
    plugins: [
      storybookTest({
        configDir: path.join(dirname, ".storybook"),
        storybookScript: "npm run storybook -- --ci --no-open --host 127.0.0.1",
        tags: {
          include: ["test"],
        },
      }),
    ],
    test: {
      name: "storybook",
      browser: {
        enabled: true,
        provider: playwright({}),
        headless: true,
        instances: [{ browser: "chromium" }],
        api: {
          host: "127.0.0.1",
          port: 42123,
          strictPort: true,
        },
      },
      setupFiles: ["./.storybook/vitest.setup.ts"],
    },
  }),
);
