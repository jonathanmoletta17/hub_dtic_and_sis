import { expect, test, type Page } from "@playwright/test";

import { ensureSmokeCredentials, loginThroughGateway, selectWorkspace } from "./helpers/hub";

async function openUserProfileMenu(page: Page): Promise<void> {
  const trigger = page
    .locator("button")
    .filter({ hasText: /jonathan-moletta/i })
    .first();

  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByText(/Trocar Função/i)).toBeVisible();
}

async function switchRole(page: Page, roleLabel: RegExp): Promise<void> {
  await openUserProfileMenu(page);
  await page.getByRole("button", { name: roleLabel }).click();
}

async function switchContextFromMenu(page: Page): Promise<void> {
  await openUserProfileMenu(page);
  await Promise.all([
    page.waitForURL(/\/selector$/),
    page.getByRole("button", { name: /Trocar Contexto/i }).click(),
  ]);
}

test.describe("Hub role-based behavior", () => {
  test.beforeEach(() => {
    ensureSmokeCredentials();
  });

  test("applies permission rules across solicitante, tecnico and gestor roles", async ({ page }) => {
    await loginThroughGateway(page);
    await selectWorkspace(page, "dtic");
    await expect(page).toHaveURL(/\/dtic\/dashboard$/);

    // DTIC: solicitante
    await Promise.all([
      page.waitForURL(/\/dtic\/user$/),
      switchRole(page, /Central do Solicitante/i),
    ]);
    await expect(page.getByRole("button", { name: /Dashboard/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Gestão de Acessos/i })).toHaveCount(0);

    // DTIC: tecnico
    await Promise.all([
      page.waitForURL(/\/dtic\/dashboard$/),
      switchRole(page, /Console do Técnico/i),
    ]);
    await expect(page.getByRole("button", { name: /Dashboard/i })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Smart Search/i })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Gestão de Acessos/i })).toHaveCount(0);

    // DTIC: gestor
    await Promise.all([
      page.waitForURL(/\/dtic\/dashboard$/),
      switchRole(page, /Super-Admin/i),
    ]);
    await expect(page.getByRole("button", { name: /Gestão de Acessos/i })).toHaveCount(1);

    await Promise.all([
      page.waitForResponse((response) => {
        return (
          response.url().includes("/api/v1/dtic/admin/users") &&
          response.status() < 400
        );
      }),
      page.waitForURL(/\/dtic\/permissoes$/),
      page.getByRole("button", { name: /Gestão de Acessos/i }).click(),
    ]);
    await expect(page).toHaveURL(/\/dtic\/permissoes$/);

    // SIS: tecnico-manutencao
    await switchContextFromMenu(page);
    await selectWorkspace(page, "sis");
    await expect(page).toHaveURL(/\/sis\/dashboard$/);

    await Promise.all([
      page.waitForURL(/\/sis-manutencao\/dashboard$/),
      switchRole(page, /Manutenção e Conservação/i),
    ]);
    await expect(page.getByRole("button", { name: /Carregadores/i })).toHaveCount(0);

    // SIS: gestor
    await Promise.all([
      page.waitForURL(/\/sis\/dashboard$/),
      switchRole(page, /Super-Admin/i),
    ]);
    await expect(page.getByRole("button", { name: /Carregadores/i })).toHaveCount(1);

    await Promise.all([
      page.waitForURL(/\/sis\/gestao-carregadores$/),
      page.getByRole("button", { name: /Carregadores/i }).click(),
    ]);
    await expect(page.getByRole("button", { name: /Gerenciar/i })).toBeVisible();
  });
});
