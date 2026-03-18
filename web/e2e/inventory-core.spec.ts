import { expect, test } from "@playwright/test";

import {
  ensureSmokeCredentials,
  expectApiResponse,
  loginThroughGateway,
  selectWorkspace,
} from "./helpers/hub";

test.describe("Inventory core flow", () => {
  test.beforeEach(() => {
    ensureSmokeCredentials();
  });

  test("loads inventory page, syncs filters with URL, and renders quality column", async ({ page }) => {
    await loginThroughGateway(page);
    await selectWorkspace(page, "dtic");

    await expectApiResponse(page, "/api/v1/dtic/inventory/summary", async () => {
      await page.goto("/dtic/inventario", { waitUntil: "domcontentloaded" });
    });

    await expect(page.getByText(/Gest[aã]o patrimonial do DTIC/i)).toBeVisible();
    await page.getByText(/^Ativos$/i).scrollIntoViewIfNeeded();
    const tableHeaders = await page.locator("table thead th").allTextContents();
    expect(tableHeaders).toContain("Qualidade");

    const searchInput = page.getByPlaceholder(/Nome, serial ou patrim[ôo]nio/i);
    await searchInput.fill("0003");
    await expect(page).toHaveURL(/\/dtic\/inventario\?.*q=0003/);

    await page.getByRole("button", { name: /Limpar/i }).click();
    await expect(page).toHaveURL(/\/dtic\/inventario(?:\?.*)?$/);
    await expect(page).not.toHaveURL(/q=0003/);
  });
});
