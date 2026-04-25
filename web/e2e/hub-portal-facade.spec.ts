import { expect, test } from "@playwright/test";

import {
  ensureSmokeCredentials,
  loginThroughGateway,
  selectWorkspace,
} from "./helpers/hub";

test.describe("Portal facade smoke", () => {
  test.beforeEach(() => {
    ensureSmokeCredentials();
  });

  test("carrega /portal/meus-chamados com tokens DTIC + SIS", async ({ page }) => {
    await loginThroughGateway(page);

    await selectWorkspace(page, "dtic");
    await page.goto("/selector", { waitUntil: "domcontentloaded" });
    await selectWorkspace(page, "sis");

    const waitDticTickets = page.waitForResponse((res) => res.url().includes("/api/v1/dtic/db/tickets"));
    const waitSisTickets = page.waitForResponse((res) => res.url().includes("/api/v1/sis/db/tickets"));

    await page.goto("/portal/meus-chamados", { waitUntil: "domcontentloaded" });

    const [dticTickets, sisTickets] = await Promise.all([waitDticTickets, waitSisTickets]);

    for (const response of [dticTickets, sisTickets]) {
      expect(
        response.status(),
        `Expected portal facade to avoid client/server errors: ${response.url()}`,
      ).toBeLessThan(400);
    }

    await expect(page.getByRole("heading", { name: /Meus chamados/i })).toBeVisible();
    await expect(page.getByText(/Sem sessao ativa/i)).toHaveCount(0);
    await expect(page.getByText(/Consulta parcial/i)).toHaveCount(0);
  });
});
