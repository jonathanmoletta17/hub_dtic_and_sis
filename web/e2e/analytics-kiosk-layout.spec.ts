import { expect, test, type Page } from "@playwright/test";

import {
  ensureSmokeCredentials,
  expectApiResponse,
  loginThroughGateway,
  selectWorkspace,
} from "./helpers/hub";

async function openAnalytics(page: Page): Promise<void> {
  await Promise.all([
    page.waitForURL(/\/dtic\/analytics$/),
    expectApiResponse(page, "/api/v1/dtic/analytics/summary", async () => {
      await page.goto("/dtic/analytics", { waitUntil: "domcontentloaded" });
    }),
  ]);
}

test.describe("Analytics kiosk layout (/dtic/analytics)", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });
  test.setTimeout(180_000);

  test.beforeEach(() => {
    ensureSmokeCredentials();
  });

  test("renders full-screen kiosk dashboard without page vertical overflow", async ({ page }) => {
    await loginThroughGateway(page);
    await selectWorkspace(page, "dtic");
    await openAnalytics(page);

    await expect(page.getByTestId("analytics-kiosk-root")).toBeVisible();
    await expect(page.getByTestId("analytics-header-kiosk")).toBeVisible();

    const noPageVerticalScroll = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return root.scrollHeight <= root.clientHeight;
    });
    expect(noPageVerticalScroll).toBe(true);

    const sidebarWidth = await page.locator("aside").first().boundingBox();
    expect(sidebarWidth?.width ?? 0).toBeLessThanOrEqual(1);

    await expect(page.getByTestId("status-cards-row")).toBeVisible();
    const statusCardsSingleLine = await page.evaluate(() => {
      const row = document.querySelector('[data-testid="status-cards-row"]');
      if (!row) return false;
      const cards = row.querySelectorAll("article");
      if (cards.length !== 6) return false;
      const tops = Array.from(cards).map((node) => Math.round((node as HTMLElement).getBoundingClientRect().top));
      return tops.every((top) => top === tops[0]);
    });
    expect(statusCardsSingleLine).toBe(true);

    await expect(page.getByTestId("ranking-section")).toBeVisible();
    await expect(page.getByTestId("ranking-horizontal-list")).toBeVisible();
    const rankingLayoutChecks = await page.evaluate(() => {
      const list = document.querySelector('[data-testid="ranking-horizontal-list"]') as HTMLElement | null;
      if (!list) return { noVerticalOverflow: false, horizontalScrollEnabled: false };
      const computed = window.getComputedStyle(list);
      return {
        noVerticalOverflow: list.scrollHeight <= list.clientHeight + 12,
        horizontalScrollEnabled:
          computed.overflowX === "auto" ||
          computed.overflowX === "scroll" ||
          list.scrollWidth > list.clientWidth,
      };
    });
    expect(rankingLayoutChecks.noVerticalOverflow).toBe(true);
    expect(rankingLayoutChecks.horizontalScrollEnabled).toBe(true);

    await expect(page.getByTestId("recent-activity-sidebar")).toBeVisible();
    await expect(page.getByTestId("new-tickets-sidebar")).toBeVisible();
    const activityInternalScrollExists = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="recent-activity-sidebar"]') as HTMLElement | null;
      if (!sidebar) return false;
      const scroller = sidebar.querySelector(".overflow-y-auto") as HTMLElement | null;
      if (!scroller) return false;
      return scroller.clientHeight > 0;
    });
    expect(activityInternalScrollExists).toBe(true);

    await expect(page.getByText("Tendência Diária")).toBeVisible();

    const refreshButton = page.getByRole("button", { name: /Atualizar/i });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    await page.waitForResponse((response) => response.url().includes("/api/v1/dtic/analytics/summary") && response.status() < 400);

    const clockBefore = (await page.locator('[data-testid="analytics-header-kiosk"] .tabular-nums').first().textContent())?.trim() ?? "";
    await page.waitForTimeout(60_000);
    const clockAfter = (await page.locator('[data-testid="analytics-header-kiosk"] .tabular-nums').first().textContent())?.trim() ?? "";
    expect(clockAfter).not.toBe("");
    expect(clockAfter).not.toBe(clockBefore);
  });
});
