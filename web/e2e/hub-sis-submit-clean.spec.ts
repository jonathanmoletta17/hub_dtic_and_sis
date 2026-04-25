import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  ensureSmokeCredentials,
  expectApiResponse,
  gotoSisNewTicket,
  loginThroughGateway,
  makeSmokeMarker,
  selectWorkspace,
  skipUnlessMutationSmokeAllowed,
  smokeBaseUrl,
  smokePassword,
  smokeUsername,
} from "./helpers/hub";

type RuntimeEnv = {
  SIS_GLPI_URL: string;
  SIS_GLPI_APP_TOKEN: string;
  SIS_GLPI_USER_TOKEN: string;
};

type BackendLoginResponse = {
  session_token: string;
  user_id: number;
};

type SubmitFormResponse = {
  form_answer_id: number;
  message: string;
  ticket_ids: number[];
};

type TicketListRow = {
  id: number;
  title: string;
};

function readRuntimeEnv(): RuntimeEnv {
  const envPath = path.resolve(process.cwd(), "../.env.runtime.local");
  const raw = fs.readFileSync(envPath, "utf8");
  const values: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    values[key] = value;
  }

  const required = ["SIS_GLPI_URL", "SIS_GLPI_APP_TOKEN", "SIS_GLPI_USER_TOKEN"] as const;
  for (const key of required) {
    if (!values[key]) {
      throw new Error(`Missing ${key} in ${envPath}`);
    }
  }

  return values as RuntimeEnv;
}

async function backendLogin(): Promise<BackendLoginResponse> {
  const response = await fetch(`${smokeBaseUrl}/api/v1/sis/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: smokeUsername,
      password: smokePassword,
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend login failed with status ${response.status}`);
  }

  return (await response.json()) as BackendLoginResponse;
}

async function listRecentSisTickets(sessionToken: string, requesterId: number): Promise<TicketListRow[]> {
  const url = new URL(`${smokeBaseUrl}/api/v1/sis/db/tickets`);
  url.searchParams.set("requester_id", String(requesterId));
  url.searchParams.set("limit", "100");
  url.searchParams.set("offset", "0");

  const response = await fetch(url, {
    headers: {
      "Session-Token": sessionToken,
    },
  });

  if (!response.ok) {
    throw new Error(`Ticket list failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { data: TicketListRow[] };
  return payload.data ?? [];
}

async function pollTicketIdByMarker(sessionToken: string, requesterId: number, marker: string): Promise<number> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const tickets = await listRecentSisTickets(sessionToken, requesterId);
    const match = tickets.find((ticket) => ticket.title.includes(marker));
    if (match) {
      return match.id;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Ticket with marker ${marker} was not found in requester list`);
}

async function pollNoTicketByMarker(sessionToken: string, requesterId: number, marker: string): Promise<TicketListRow[]> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const tickets = await listRecentSisTickets(sessionToken, requesterId);
    const matches = tickets.filter((ticket) => ticket.title.includes(marker));
    if (matches.length === 0) {
      return [];
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return listRecentSisTickets(sessionToken, requesterId).then((tickets) =>
    tickets.filter((ticket) => ticket.title.includes(marker)),
  );
}

async function glpiServiceInit(runtimeEnv: RuntimeEnv): Promise<string> {
  const response = await fetch(`${runtimeEnv.SIS_GLPI_URL}/initSession`, {
    headers: {
      Authorization: `user_token ${runtimeEnv.SIS_GLPI_USER_TOKEN}`,
      "App-Token": runtimeEnv.SIS_GLPI_APP_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`GLPI service initSession failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { session_token?: string };
  if (!payload.session_token) {
    throw new Error("GLPI service initSession did not return session_token");
  }
  return payload.session_token;
}

async function glpiServiceDelete(runtimeEnv: RuntimeEnv, serviceSessionToken: string, itemtype: string, itemId: number): Promise<void> {
  const url = new URL(`${runtimeEnv.SIS_GLPI_URL}/${encodeURIComponent(itemtype)}/${itemId}`);
  url.searchParams.set("force_purge", "true");

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "App-Token": runtimeEnv.SIS_GLPI_APP_TOKEN,
      "Session-Token": serviceSessionToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GLPI delete failed for ${itemtype}/${itemId}: ${response.status} ${body}`);
  }
}

async function glpiServiceGet(runtimeEnv: RuntimeEnv, serviceSessionToken: string, itemtype: string, itemId: number): Promise<Response> {
  return fetch(`${runtimeEnv.SIS_GLPI_URL}/${encodeURIComponent(itemtype)}/${itemId}`, {
    headers: {
      "App-Token": runtimeEnv.SIS_GLPI_APP_TOKEN,
      "Session-Token": serviceSessionToken,
      "Content-Type": "application/json",
    },
  });
}

async function pollFormAnswerDeleted(
  runtimeEnv: RuntimeEnv,
  serviceSessionToken: string,
  formAnswerId: number,
): Promise<boolean> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const probe = await glpiServiceGet(
      runtimeEnv,
      serviceSessionToken,
      "PluginFormcreatorFormAnswer",
      formAnswerId,
    );
    if (probe.status >= 400) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

async function glpiServiceKill(runtimeEnv: RuntimeEnv, serviceSessionToken: string): Promise<void> {
  await fetch(`${runtimeEnv.SIS_GLPI_URL}/killSession`, {
    headers: {
      "App-Token": runtimeEnv.SIS_GLPI_APP_TOKEN,
      "Session-Token": serviceSessionToken,
      "Content-Type": "application/json",
    },
  });
}

test.describe("Hub SIS mutation smoke @mutation", () => {
  test.setTimeout(180_000);

  test("abre chamado real do SIS e limpa ticket e form answer", async ({ page }) => {
    skipUnlessMutationSmokeAllowed();
    ensureSmokeCredentials();

    const runtimeEnv = readRuntimeEnv();
    const marker = makeSmokeMarker("CODEX-HUB-NEW-SIS");
    const outputDir = path.resolve(process.cwd(), "output", "phase3-sis-submit-clean");
    fs.mkdirSync(outputDir, { recursive: true });

    let formAnswerId: number | null = null;
    let ticketId: number | null = null;
    let serviceSessionToken: string | null = null;
    let detailVisible = false;

    try {
      await loginThroughGateway(page);
      await selectWorkspace(page, "sis");

      await gotoSisNewTicket(page);

      await page.locator(".service-card").filter({ hasText: "Carregadores" }).first().click();
      await expect(page.getByRole("heading", { name: /Dados gerais/i })).toBeVisible();

      const atendimentoField = page.locator(".field-wrapper").filter({
        has: page.locator(".field-label", { hasText: "Este atendimento é para quem?" }),
      });
      await atendimentoField.locator("select").selectOption({ label: "Para mim" });

      const localizacaoField = page.locator(".field-wrapper").filter({
        has: page.locator(".field-label", { hasText: "Localização" }),
      });
      await localizacaoField.locator(".combobox-trigger").click();
      await localizacaoField.locator(".combobox-input").fill("Palacio Piratini");
      await localizacaoField.locator(".combobox-option").filter({ hasText: "Palacio Piratini" }).first().click();

      const telefoneField = page.locator(".field-wrapper").filter({
        has: page.locator(".field-label", { hasText: "Telefone de Contato" }),
      });
      await telefoneField.locator("input").fill("5199990000");

      await page.screenshot({ path: path.join(outputDir, "01-sis-step2-filled.png"), fullPage: true });
      await page.getByRole("button", { name: /Próximo/i }).click();

      await expect(page.getByRole("heading", { name: /Detalhamento/i })).toBeVisible();

      const tipoField = page.locator(".field-wrapper").filter({
        has: page.locator(".field-label", { hasText: "Tipo" }),
      });
      await tipoField.locator(".combobox-trigger").click();
      await tipoField.locator(".combobox-input").fill("Movimentação de Insumos");
      await tipoField.locator(".combobox-option").filter({ hasText: "Movimentação de Insumos" }).first().click();

      const assuntoField = page.locator(".field-wrapper").filter({
        has: page.locator(".field-label", { hasText: "Assunto" }),
      });
      await assuntoField.locator("input").fill(marker);

      const descricaoField = page.locator(".field-wrapper").filter({
        has: page.locator(".field-label", { hasText: "Descrição" }),
      });
      await descricaoField.locator("textarea").fill(`${marker} - validação de submissão real do SIS na base extraída.`);

      await page.screenshot({ path: path.join(outputDir, "02-sis-step3-filled.png"), fullPage: true });
      await page.getByRole("button", { name: /Próximo/i }).click();

      await expect(page.getByRole("heading", { name: /Revisao do chamado/i })).toBeVisible();
      await expect(page.getByText(marker).first()).toBeVisible();
      await page.screenshot({ path: path.join(outputDir, "03-sis-review.png"), fullPage: true });

      const submitResponse = await expectApiResponse(
        page,
        /\/api\/v1\/sis\/domain\/formcreator\/forms\/\d+\/submit$/,
        async () => {
          await page.getByRole("button", { name: /Abrir chamado/i }).click();
        },
      );
      const submitPayload = (await submitResponse.json()) as SubmitFormResponse;
      formAnswerId = submitPayload.form_answer_id;
      await expect(page.locator(".service-card").first()).toBeVisible();
      await page.screenshot({ path: path.join(outputDir, "04-sis-after-submit.png"), fullPage: true });

      const auth = await backendLogin();
      ticketId = await pollTicketIdByMarker(auth.session_token, auth.user_id, marker);

      await expectApiResponse(page, "/api/v1/sis/db/tickets", async () => {
        await page.goto("/sis/user", { waitUntil: "domcontentloaded" });
      });
      await expect(page.getByText(marker).first()).toBeVisible();
      await page.screenshot({ path: path.join(outputDir, "05-sis-user-list-with-marker.png"), fullPage: true });

      await expectApiResponse(page, new RegExp(`/api/v1/sis/tickets/${ticketId}/detail$`), async () => {
        await page.goto(`/sis/ticket/${ticketId}`, { waitUntil: "domcontentloaded" });
      });
      await expect(page.getByText(marker).first()).toBeVisible();
      detailVisible = true;
      await page.screenshot({ path: path.join(outputDir, "06-sis-detail-created-ticket.png"), fullPage: true });

      serviceSessionToken = await glpiServiceInit(runtimeEnv);
    } finally {
      let postDeleteMatches: TicketListRow[] = [];
      let formAnswerDeleted = false;
      let ticketDeleted = false;

      if (serviceSessionToken && ticketId) {
        await glpiServiceDelete(runtimeEnv, serviceSessionToken, "Ticket", ticketId);
      }
      if (serviceSessionToken && formAnswerId) {
        await glpiServiceDelete(runtimeEnv, serviceSessionToken, "PluginFormcreatorFormAnswer", formAnswerId);
        formAnswerDeleted = await pollFormAnswerDeleted(runtimeEnv, serviceSessionToken, formAnswerId);
      }

      try {
        const auth = await backendLogin();
        postDeleteMatches = await pollNoTicketByMarker(auth.session_token, auth.user_id, marker);
        ticketDeleted = postDeleteMatches.length === 0;
      } catch {
        postDeleteMatches = [];
      }

      if (serviceSessionToken) {
        await glpiServiceKill(runtimeEnv, serviceSessionToken);
      }

      const summary = {
        baseUrl: smokeBaseUrl,
        marker,
        formAnswerId,
        ticketId,
        detailVisible,
        cleanup: {
          ticketDeleted,
          formAnswerDeleted,
          postDeleteMatches,
        },
      };
      fs.writeFileSync(
        path.join(outputDir, "summary.json"),
        JSON.stringify(summary, null, 2),
        "utf8",
      );

      expect(postDeleteMatches).toHaveLength(0);
      if (formAnswerId) {
        expect(formAnswerDeleted).toBe(true);
      }
    }
  });
});
