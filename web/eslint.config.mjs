// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([...nextVitals, ...nextTs, {
  files: ["src/**/*.ts", "src/**/*.tsx"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@/lib/api/internal/glpiGateway",
            message: "Use um service de dominio dentro de src/lib/api, nao o gateway interno diretamente.",
          },
        ],
      },
    ],
  },
}, {
  files: ["src/lib/api/**/*.ts", "src/lib/api/**/*.tsx"],
  rules: {
    "no-restricted-imports": "off",
  },
}, // Override default ignores of eslint-config-next.
globalIgnores([
  // Default ignores of eslint-config-next:
  ".next/**",
  "out/**",
  "build/**",
  "storybook-static/**",
  "playwright-report-storybook/**",
  "next-env.d.ts",
]), ...storybook.configs["flat/recommended"]]);

export default eslintConfig;
