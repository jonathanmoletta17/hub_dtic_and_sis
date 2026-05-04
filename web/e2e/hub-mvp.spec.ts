import { expect, test } from "@playwright/test";

import {
  ensureSmokeCredentials,
  expectApiResponse,
  gotoSisNewTicket,
  loginThroughGateway,
  selectWorkspace,
  waitForDticAgentSurface,
} from "./helpers/hub";

test.describe("Hub MVP smoke", () => {
  test.beforeEach(() => {
    ensureSmokeCredentials();
  });

  test("autentica e navega no nucleo DTIC e SIS Conservacao", async ({ page }) => {
    await loginThroughGateway(page);

    await selectWorkspace(page, "dtic");

    await expectApiResponse(page, "/api/v1/dtic/db/stats", async () => {
      await page.goto("/dtic/dashboard", { waitUntil: "domcontentloaded" });
    });
    await expect(page).toHaveURL(/\/dtic\/dashboard$/);

    await expectApiResponse(page, "/api/v1/dtic/db/tickets", async () => {
      await page.goto("/dtic/user", { waitUntil: "domcontentloaded" });
    });
    await expect(page).toHaveURL(/\/dtic\/user$/);

    await page.goto("/dtic/new-ticket", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Abrir chamado/i })).toBeVisible();
    const dticAgentState = await waitForDticAgentSurface(page);
    if (dticAgentState === "ready") {
      await expect(page.getByRole("button", { name: /Enviar mensagem/i })).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: /Atendimento indisponivel/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Tentar novamente/i })).toBeVisible();
    }

    await page.goto("/selector", { waitUntil: "domcontentloaded" });
    await selectWorkspace(page, "sis-conservacao");

    await expectApiResponse(page, "/api/v1/sis/db/stats", async () => {
      await page.goto("/sis-conservacao/dashboard", { waitUntil: "domcontentloaded" });
    });
    await expect(page).toHaveURL(/\/sis-conservacao\/dashboard$/);

    await expectApiResponse(page, "/api/v1/sis/db/tickets", async () => {
      await page.goto("/sis-conservacao/user", { waitUntil: "domcontentloaded" });
    });
    await expect(page).toHaveURL(/\/sis-conservacao\/user$/);

    await gotoSisNewTicket(page, "sis-conservacao");
    await expect(page).toHaveURL(/\/sis-conservacao\/new-ticket$/);

    await expectApiResponse(
      page,
      (url) => /\/api\/v1\/sis\/domain\/formcreator\/forms\/\d+\/schema$/.test(url),
      async () => {
        await page.locator(".service-card").first().click();
      },
    );
    await expect(page.getByRole("heading", { name: /Dados gerais/i })).toBeVisible();
  });
});
