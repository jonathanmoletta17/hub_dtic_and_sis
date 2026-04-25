import { expect, test } from "@playwright/test";

import { ensureSmokeCredentials, loginThroughGateway, selectWorkspace } from "./helpers/hub";

test.describe("Hub dashboard analytics", () => {
  test.beforeEach(() => {
    ensureSmokeCredentials();
  });

  test("carrega o painel DTIC e aplica filtro vazio controlado na fila", async ({ page }) => {
    await loginThroughGateway(page);
    await selectWorkspace(page, "dtic");

    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/v1/dtic/db/stats") && response.status() < 400),
      page.waitForResponse((response) => response.url().includes("/api/v1/dtic/db/tickets") && response.status() < 400),
      page.goto("/dtic/dashboard", { waitUntil: "domcontentloaded" }),
    ]);

    await expect(page).toHaveURL(/\/dtic\/dashboard$/);
    await expect(page.getByRole("heading", { name: /Painel/i })).toBeVisible();
    await expect(page.getByText(/Novos/i)).toBeVisible();
    await expect(page.getByText(/Em atendimento/i)).toBeVisible();
    await expect(page.getByText(/Pendentes/i)).toBeVisible();
    await expect(page.getByText(/Resolvidos em 30 dias/i)).toBeVisible();

    const searchInput = page.getByPlaceholder(/Buscar por titulo, categoria ou relato/i);
    await expect(searchInput).toBeVisible();
    await expect(page.getByRole("heading", { name: /Chamados por status/i })).toBeVisible();

    await searchInput.fill("zzzcodexnohit");
    await expect(page.getByRole("heading", { name: /Resultados da busca/i })).toBeVisible();
    await expect(page.getByText(/Nenhum chamado corresponde a busca atual/i)).toBeVisible();

    await searchInput.clear();
    await expect(page.getByRole("heading", { name: /Chamados por status/i })).toBeVisible();
  });
});
