import { expect, test } from "@playwright/test";

const cases = [
  { id: "auth-loginsurface--default", name: "login-surface-default" },
  { id: "auth-loginsurface--error", name: "login-surface-error" },
  { id: "selector-workspaceselectorcard--default", name: "selector-workspace-default" },
  { id: "selector-workspaceselectorcard--loading", name: "selector-workspace-loading" },
  { id: "dashboard-dashboardoverviewheader--default", name: "dashboard-overview-default" },
  { id: "dashboard-dashboardoverviewheader--loading", name: "dashboard-overview-loading" },
  { id: "dashboard-dashboardoverviewheader--filtered", name: "dashboard-overview-filtered" },
  { id: "dashboard-dashboardqueuepanel--default", name: "dashboard-queue-default" },
  { id: "dashboard-dashboardqueuepanel--filtered", name: "dashboard-queue-filtered" },
  { id: "dashboard-dashboardqueuepanel--loading", name: "dashboard-queue-loading" },
  { id: "dashboard-dashboardqueuepanel--empty", name: "dashboard-queue-empty" },
  { id: "dtic-agentwelcomepanel--default", name: "dtic-agent-welcome-default" },
  { id: "dtic-agentchatsurface--ready", name: "dtic-agent-chat-ready" },
  { id: "dtic-agentchatsurface--booting", name: "dtic-agent-chat-booting" },
  { id: "dtic-agentchatsurface--unavailable", name: "dtic-agent-chat-unavailable" },
  { id: "dtic-agentchatsurface--sending", name: "dtic-agent-chat-sending" },
  { id: "dtic-agentchatsurface--clarifying", name: "dtic-agent-chat-clarifying" },
  { id: "dtic-agentchatsurface--draft-ready", name: "dtic-agent-chat-draft-ready" },
  { id: "dtic-agentchatsurface--submitted", name: "dtic-agent-chat-submitted" },
  { id: "portal-portalservicecard--active-technology", name: "portal-service-technology" },
  { id: "portal-portalservicecard--pending-protocol", name: "portal-service-protocol" },
] as const;

for (const theme of ["dark", "light"] as const) {
  for (const story of cases) {
    test(`${story.name} ${theme}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=${story.id}&globals=theme:${theme}`, {
        waitUntil: "networkidle",
      });

      await expect(page.locator("#storybook-root > *").first()).toBeVisible();
      await expect(page.locator("#storybook-root")).toHaveScreenshot(`${story.name}-${theme}.png`, {
        animations: "disabled",
      });
    });
  }
}
