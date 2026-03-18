import { expect, test } from "@playwright/test";

import {
  ensureSmokeCredentials,
  expectApiResponse,
  loginThroughGateway,
  selectWorkspace,
  smokeBaseUrl as baseURL,
} from "./helpers/hub";

test.describe("Hub canonical smoke", () => {
  test.beforeEach(() => {
    ensureSmokeCredentials();
  });

  test("authenticates and navigates DTIC/SIS through hub.local", async ({ page }) => {
    const apiResponses: Array<{ status: number; url: string }> = [];

    page.on("response", (response) => {
      if (response.url().includes("/api/v1/")) {
        apiResponses.push({ status: response.status(), url: response.url() });
      }
    });

    await loginThroughGateway(page);
    await selectWorkspace(page, "dtic");

    await expectApiResponse(page, "/api/v1/dtic/db/stats", async () => {
      await page.goto("/dtic/dashboard", { waitUntil: "domcontentloaded" });
    });
    await expect(page).toHaveURL(/\/dtic\/dashboard$/);

    await page.goto("/dtic/search", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dtic\/search$/);

    const hasInventoryMenu = (await page.getByRole("button", { name: /Invent[aá]rio/i }).count()) > 0;
    if (hasInventoryMenu) {
      await expectApiResponse(page, "/api/v1/dtic/inventory/summary", async () => {
        await page.goto("/dtic/inventario", { waitUntil: "domcontentloaded" });
      });
      await expect(page.getByText(/Gestão patrimonial do DTIC/i)).toBeVisible();
    } else {
      await page.goto("/dtic/inventario", { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/M[oó]dulo Restrito|Acesso Negado/i)).toBeVisible();
    }
    await expect(page).toHaveURL(/\/dtic\/inventario$/);

    await expectApiResponse(page, "/api/v1/dtic/knowledge/articles", async () => {
      await page.goto("/dtic/knowledge", { waitUntil: "domcontentloaded" });
    });
    await expect(page).toHaveURL(/\/dtic\/knowledge$/);

    await page.goto("/selector", { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await selectWorkspace(page, "sis");

    await expectApiResponse(page, "/api/v1/sis/db/stats", async () => {
      await page.goto("/sis/dashboard", { waitUntil: "domcontentloaded" });
    });
    await expect(page).toHaveURL(/\/sis\/dashboard$/);

    await Promise.all([
      page.waitForResponse((response) => response.url().startsWith(new URL("/api/v1/sis/metrics/chargers", baseURL).toString())),
      page.waitForResponse((response) => response.url().startsWith(new URL("/api/v1/sis/chargers/kanban", baseURL).toString())),
      page.goto("/sis/gestao-carregadores", { waitUntil: "domcontentloaded" }),
    ]);
    await expect(page).toHaveURL(/\/sis\/gestao-carregadores$/);

    expect(apiResponses.length).toBeGreaterThan(0);
    expect(apiResponses.filter((response) => !response.url.startsWith(`${baseURL}/api/v1/`))).toEqual([]);
    expect(apiResponses.filter((response) => response.status >= 400)).toEqual([]);
  });
});
