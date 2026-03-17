import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  ensureSmokeCredentials,
  expectApiResponse,
  loginThroughGateway,
  makeSmokeMarker,
  selectWorkspace,
} from "./helpers/hub";

type TicketSeed = {
  description: string;
  genericText: string;
  numericText: string;
  subject: string;
};

function buildTicketSeed(): TicketSeed {
  const marker = makeSmokeMarker("smoke-ticket");
  return {
    subject: marker,
    description: `${marker} - descricao automatizada para validacao E2E do wizard.`,
    genericText: `${marker} - campo preenchido automaticamente.`,
    numericText: "51999999999",
  };
}

async function fillFieldWrapper(wrapper: Locator, page: Page, seed: TicketSeed): Promise<void> {
  const labelText = ((await wrapper.locator(".field-label").textContent()) ?? "").trim().toLowerCase();

  const textarea = wrapper.locator("textarea");
  if (await textarea.count()) {
    if (!(await textarea.first().inputValue()).trim()) {
      const value = labelText.includes("descri") ? seed.description : seed.genericText;
      await textarea.first().fill(value);
    }
    return;
  }

  const numberInput = wrapper.locator('input[type="number"]');
  if (await numberInput.count()) {
    if (!(await numberInput.first().inputValue()).trim()) {
      await numberInput.first().fill(seed.numericText);
    }
    return;
  }

  const textInput = wrapper.locator('input[type="text"]');
  if (await textInput.count()) {
    const activeInput = textInput.first();
    if (!(await activeInput.inputValue()).trim()) {
      const value = labelText.includes("assunto") ? seed.subject : seed.genericText;
      await activeInput.fill(value);
    }
    return;
  }

  const select = wrapper.locator("select");
  if (await select.count()) {
    const currentValue = await select.first().inputValue();
    if (!currentValue) {
      const options = await select.first().locator("option").evaluateAll((nodes) =>
        nodes.map((option) => {
          const typedOption = option as HTMLOptionElement;
          return {
            disabled: typedOption.disabled,
            value: typedOption.value ?? "",
          };
        }),
      );
      const candidate = options.find((option) => option.value && !option.disabled);
      if (candidate) {
        await select.first().selectOption(candidate.value);
      }
    }
    return;
  }

  const checkedRadio = wrapper.locator('input[type="radio"]:checked');
  if (await wrapper.locator('input[type="radio"]').count()) {
    if (!(await checkedRadio.count())) {
      await wrapper.locator(".field-radio-option").first().click();
    }
    return;
  }

  const urgencyButtons = wrapper.locator(".field-urgency-btn");
  if (await urgencyButtons.count()) {
    if (!(await wrapper.locator(".field-urgency-btn.selected").count())) {
      const mediumButton = wrapper.locator(".field-urgency-btn", { hasText: "Média" });
      if (await mediumButton.count()) {
        await mediumButton.click();
      } else {
        await urgencyButtons.first().click();
      }
    }
    return;
  }

  const comboTrigger = wrapper.locator(".combobox-trigger");
  if (await comboTrigger.count()) {
    if (!(await wrapper.locator(".combobox-clear").count())) {
      await comboTrigger.click();
      const firstOption = wrapper.locator(".combobox-dropdown .combobox-option").first();
      await expect(firstOption).toBeVisible();
      await firstOption.click();
      await page.waitForTimeout(150);
    }
  }
}

async function fillCurrentWizardStep(page: Page, seed: TicketSeed): Promise<void> {
  const wrappers = page.locator(".field-wrapper");
  const count = await wrappers.count();

  for (let index = 0; index < count; index += 1) {
    const wrapper = wrappers.nth(index);
    if (await wrapper.isVisible()) {
      await fillFieldWrapper(wrapper, page, seed);
    }
  }
}

async function advanceWizard(page: Page, nextStepLabel: RegExp, seed: TicketSeed): Promise<void> {
  const activeStep = page.locator(".wizard-step-indicator.active .wizard-step-label");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await fillCurrentWizardStep(page, seed);
    await page.getByRole("button", { name: /Próximo/i }).click();

    try {
      await expect(activeStep).toHaveText(nextStepLabel, { timeout: 4_000 });
      return;
    } catch {
      await page.waitForTimeout(300);
    }
  }

  throw new Error(`Wizard did not advance to ${nextStepLabel}`);
}

async function selectServiceForWizard(page: Page): Promise<void> {
  const preferredServices = ["Ar-Condicionado", "Carregadores", "Copa"];

  for (const serviceName of preferredServices) {
    const serviceButton = page.locator("button").filter({ hasText: serviceName }).first();
    if (await serviceButton.count()) {
      await serviceButton.click();
      return;
    }
  }

  await page.locator(".service-card").first().click();
}

async function createTicketThroughWizard(page: Page, seed: TicketSeed): Promise<void> {
  await page.goto("/sis/new-ticket", { waitUntil: "networkidle" });
  await expect(page.getByText(/Novo Chamado — SIS/i)).toBeVisible();
  await expect(page.locator(".service-card").first()).toBeVisible();

  await selectServiceForWizard(page);
  await expect(page.locator(".wizard-step-indicator.active .wizard-step-label")).toHaveText(/Dados Gerais/i);

  await advanceWizard(page, /Detalhamento/i, seed);
  await advanceWizard(page, /Revisão/i, seed);

  await expect(page.getByRole("button", { name: /Abrir Chamado/i })).toBeVisible();

  await expectApiResponse(
    page,
    /\/api\/v1\/sis\/domain\/formcreator\/forms\/\d+\/submit$/,
    async () => {
      await page.getByRole("button", { name: /Abrir Chamado/i }).click();
    },
  );

  await expect(page.locator(".wizard-step-indicator.active .wizard-step-label")).toHaveText(/Serviço/i);
}

async function openCreatedTicketFromDashboard(page: Page, subject: string): Promise<number> {
  const painelButton = page.getByRole("button", { name: /^Painel$/i });
  const dashboardButton = page.getByRole("button", { name: /^Dashboard$/i });
  const navTarget = /\/sis\/dashboard(?:\?.*)?$/;

  if (await painelButton.count()) {
    await Promise.all([
      page.waitForURL(navTarget),
      painelButton.first().click(),
    ]);
  } else {
    await Promise.all([
      page.waitForURL(navTarget),
      dashboardButton.first().click(),
    ]);
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const ticketCard = page.locator("button").filter({ hasText: subject }).first();
    if (await ticketCard.count()) {
      await Promise.all([
        page.waitForURL(/\/sis\/ticket\/\d+$/),
        ticketCard.click(),
      ]);

      const match = page.url().match(/\/ticket\/(\d+)$/);
      if (!match) {
        throw new Error("Unable to extract created ticket id from URL.");
      }

      return Number(match[1]);
    }

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(750);
  }

  throw new Error(`Created ticket "${subject}" was not found in SIS dashboard.`);
}

test.describe("Hub UX-critical flows", () => {
  test.beforeEach(() => {
    ensureSmokeCredentials();
  });

  test("submits a FormCreator ticket and exercises the dedicated ticket workflow", async ({ page }) => {
    const seed = buildTicketSeed();

    await loginThroughGateway(page);
    await selectWorkspace(page, "sis");

    await createTicketThroughWizard(page, seed);
    const ticketId = await openCreatedTicketFromDashboard(page, seed.subject);

    await expect(page.getByText(new RegExp(`GLPI-${ticketId}`))).toBeVisible();

    await expectApiResponse(page, `/api/v1/sis/tickets/${ticketId}/assume`, async () => {
      await page.getByRole("button", { name: /Assumir Ticket/i }).click();
    });
    await expect(page.getByRole("button", { name: /Delegar Ticket/i })).toBeVisible();

    const followup = `${seed.subject} - acompanhamento E2E`;
    const followupField = page.getByPlaceholder(/Escrever acompanhamento/i);
    await followupField.fill(followup);
    await expectApiResponse(page, `/api/v1/sis/tickets/${ticketId}/followups`, async () => {
      await followupField.press("Enter");
    });
    await expect(page.getByText(followup, { exact: false })).toBeVisible();

    await expectApiResponse(page, `/api/v1/sis/tickets/${ticketId}/pending`, async () => {
      await page.getByRole("button", { name: /Colocar em Pendente/i }).click();
    });
    await expect(page.getByRole("button", { name: /Retomar Atendimento/i })).toBeVisible();

    await expectApiResponse(page, `/api/v1/sis/tickets/${ticketId}/resume`, async () => {
      await page.getByRole("button", { name: /Retomar Atendimento/i }).click();
    });
    await expect(page.getByRole("button", { name: /Delegar Ticket/i })).toBeVisible();

    await expectApiResponse(page, "/api/v1/sis/lookups/users/technicians", async () => {
      await page.getByRole("button", { name: /Delegar Ticket/i }).click();
    });

    await expect(page.getByRole("heading", { name: /Delegar Ticket/i })).toBeVisible();
    expect(await page.locator("select").last().locator("option").count()).toBeGreaterThan(1);
    await page.getByRole("button", { name: /Cancelar/i }).click();
  });

  test("loads charger creation lookups through the normalized lookup service", async ({ page }) => {
    await loginThroughGateway(page);
    await selectWorkspace(page, "sis");

    await page.goto("/sis/gestao-carregadores", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: /Gerenciar/i }).click();
    await expectApiResponse(page, "/api/v1/sis/lookups/locations", async () => {
      await page.getByRole("button", { name: /Novo Carregador/i }).click();
    });

    await expect(page.getByRole("heading", { name: /Novo Carregador/i })).toBeVisible();
    const locationSelect = page.locator("select").first();
    expect(await locationSelect.locator("option").count()).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Cancelar" }).click();
  });
});
