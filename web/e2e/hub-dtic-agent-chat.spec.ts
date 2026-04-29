import { expect, test } from "@playwright/test";

import {
  ensureSmokeCredentials,
  loginThroughGateway,
  selectWorkspace,
  waitForDticAgentSurface,
} from "./helpers/hub";

test.describe("DTIC agent chat", () => {
  test.beforeEach(() => {
    ensureSmokeCredentials();
  });

  test("abre a entrada assistida do DTIC sem submeter chamado", async ({ page }) => {
    await loginThroughGateway(page);
    await selectWorkspace(page, "dtic");

    await page.goto("/dtic/new-ticket", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Abrir chamado/i })).toBeVisible();
    const dticAgentState = await waitForDticAgentSurface(page);

    if (dticAgentState === "unavailable") {
      await expect(page.getByRole("heading", { name: /Atendimento indisponivel/i })).toBeVisible();
      await expect(page.locator("body")).toContainText(
        /Atendimento assistido indisponivel|Nao foi possivel iniciar/i,
      );
      await expect(page.getByRole("button", { name: /Tentar novamente/i })).toBeVisible();
      return;
    }

    const narrative = "Equipe inteira sem acesso ao sistema de protocolo.";
    await page
      .getByPlaceholder(/Escreva o problema, erro ou pedido/i)
      .fill(narrative);
    await page.getByRole("button", { name: /Enviar mensagem/i }).click();

    await expect(page.getByText(/Montei o chamado\. Revise os dados/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Abrir chamado/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(narrative);
  });
});
