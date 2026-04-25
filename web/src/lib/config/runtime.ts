const DEFAULT_INTERNAL_API_URL = "http://glpi-backend:8080";

export interface FrontendRuntimeConfig {
  browserApiBase: "";
  internalApiUrl: string;
  dticAgentUrl: string;
  dticAgentApiUrl: string;
}

function normalizeInternalApiUrl(value: string | undefined): string {
  return (value || DEFAULT_INTERNAL_API_URL).replace(/\/+$/, "");
}

export const frontendRuntimeConfig: FrontendRuntimeConfig = {
  browserApiBase: "",
  internalApiUrl: normalizeInternalApiUrl(process.env.INTERNAL_API_URL),
  dticAgentUrl: process.env.NEXT_PUBLIC_DTIC_AGENT_URL || "http://localhost:8501",
  dticAgentApiUrl: process.env.NEXT_PUBLIC_DTIC_AGENT_API_URL || "http://localhost:8502",
};

export function resolveApiBase(): string {
  return typeof window !== "undefined"
    ? frontendRuntimeConfig.browserApiBase
    : frontendRuntimeConfig.internalApiUrl;
}
