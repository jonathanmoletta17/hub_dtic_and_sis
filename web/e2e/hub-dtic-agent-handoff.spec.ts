import { expect, test } from "@playwright/test";

import { ensureSmokeCredentials, loginThroughGateway, selectWorkspace } from "./helpers/hub";

test.describe("DTIC agent handoff", () => {
  test.beforeEach(() => {
    ensureSmokeCredentials();
  });

  test("abre a conversa inline do DTIC e monta o draft no proprio hub", async ({ page }) => {
    await loginThroughGateway(page);
    await selectWorkspace(page, "dtic");

    await page.goto("/dtic/new-ticket", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Abrir chamado/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Escreva o problema, erro ou pedido/i })).toBeVisible();

    await page
      .getByPlaceholder(/Escreva o problema, erro ou pedido/i)
      .fill("Equipe inteira sem acesso ao sistema de protocolo.");
    await page.getByRole("button", { name: /Enviar mensagem/i }).click();

    await expect(page.getByText(/Montei o chamado\. Revise os dados/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Abrir chamado/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/TipoIncidente/i);
  });
});
