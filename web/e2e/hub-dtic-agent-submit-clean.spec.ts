import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  ensureSmokeCredentials,
  expectApiResponse,
  loginThroughGateway,
  makeSmokeMarker,
  selectWorkspace,
  skipUnlessMutationSmokeAllowed,
  smokeBaseUrl,
  smokePassword,
  smokeUsername,
} from "./helpers/hub";

type RuntimeEnv = {
  DTIC_GLPI_URL: string;
  DTIC_GLPI_APP_TOKEN: string;
  DTIC_GLPI_USER_TOKEN: string;
};

type BackendLoginResponse = {
  session_token: string;
  user_id: number;
};

type TicketDetailResponse = {
  ticket: {
    id: number;
    title: string;
    content: string;
    category?: string | null;
    urgency?: string | null;
    status?: string | null;
  };
};

type AuditEvent = Record<string, unknown>;

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

  const required = ["DTIC_GLPI_URL", "DTIC_GLPI_APP_TOKEN", "DTIC_GLPI_USER_TOKEN"] as const;
  for (const key of required) {
    if (!values[key]) {
      throw new Error(`Missing ${key} in ${envPath}`);
    }
  }

  return values as RuntimeEnv;
}

function readAuditEvents(logPath: string): AuditEvent[] {
  if (!fs.existsSync(logPath)) {
    return [];
  }
  return fs
    .readFileSync(logPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as AuditEvent);
}

async function backendLogin(): Promise<BackendLoginResponse> {
  const response = await fetch(`${smokeBaseUrl}/api/v1/dtic/auth/login`, {
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

async function fetchDticTicketDetail(sessionToken: string, ticketId: number): Promise<TicketDetailResponse> {
  const response = await fetch(`${smokeBaseUrl}/api/v1/dtic/tickets/${ticketId}/detail`, {
    headers: {
      "Session-Token": sessionToken,
    },
  });

  if (!response.ok) {
    throw new Error(`DTIC ticket detail failed with status ${response.status}`);
  }

  return (await response.json()) as TicketDetailResponse;
}

async function glpiServiceInit(runtimeEnv: RuntimeEnv): Promise<string> {
  const response = await fetch(`${runtimeEnv.DTIC_GLPI_URL}/initSession`, {
    headers: {
      Authorization: `user_token ${runtimeEnv.DTIC_GLPI_USER_TOKEN}`,
      "App-Token": runtimeEnv.DTIC_GLPI_APP_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`DTIC GLPI initSession failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { session_token?: string };
  if (!payload.session_token) {
    throw new Error("DTIC GLPI initSession did not return session_token");
  }
  return payload.session_token;
}

async function glpiServiceDelete(
  runtimeEnv: RuntimeEnv,
  serviceSessionToken: string,
  itemtype: string,
  itemId: number,
): Promise<unknown> {
  const url = new URL(`${runtimeEnv.DTIC_GLPI_URL}/${encodeURIComponent(itemtype)}/${itemId}`);
  url.searchParams.set("force_purge", "true");

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "App-Token": runtimeEnv.DTIC_GLPI_APP_TOKEN,
      "Session-Token": serviceSessionToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DTIC GLPI delete failed for ${itemtype}/${itemId}: ${response.status} ${body}`);
  }

  return response.json();
}

async function glpiServiceGet(
  runtimeEnv: RuntimeEnv,
  serviceSessionToken: string,
  itemtype: string,
  itemId: number,
): Promise<Response> {
  return fetch(`${runtimeEnv.DTIC_GLPI_URL}/${encodeURIComponent(itemtype)}/${itemId}`, {
    headers: {
      "App-Token": runtimeEnv.DTIC_GLPI_APP_TOKEN,
      "Session-Token": serviceSessionToken,
      "Content-Type": "application/json",
    },
  });
}

async function glpiServiceKill(runtimeEnv: RuntimeEnv, serviceSessionToken: string): Promise<void> {
  await fetch(`${runtimeEnv.DTIC_GLPI_URL}/killSession`, {
    headers: {
      "App-Token": runtimeEnv.DTIC_GLPI_APP_TOKEN,
      "Session-Token": serviceSessionToken,
      "Content-Type": "application/json",
    },
  });
}

test.describe("Hub DTIC agent-first mutation smoke @mutation", () => {
  test.setTimeout(240_000);

  test("abre ticket real via chat inline, valida no hub e limpa o ticket ao final", async ({ page }) => {
    skipUnlessMutationSmokeAllowed();
    ensureSmokeCredentials();

    const runtimeEnv = readRuntimeEnv();
    const marker = makeSmokeMarker("CODEX-HUB-DTIC-HERMES");
    const outputDir = path.resolve(process.cwd(), "output", "phase23-dtic-inline-agent-submit-clean");
    const agentAuditLogPath = path.resolve(process.cwd(), "../../glpi-ticket-agent-mvp/logs/agent-events.jsonl");
    fs.mkdirSync(outputDir, { recursive: true });

    const auditBeforeCount = readAuditEvents(agentAuditLogPath).length;

    let ticketId: number | null = null;
    let createdTicketDetail: TicketDetailResponse | null = null;
    let serviceSessionToken: string | null = null;
    let detailVisible = false;
    let successMessage = "";
    let conversationBodyText = "";
    let draftBodyText = "";
    let successBodyText = "";

    try {
      await loginThroughGateway(page);
      await selectWorkspace(page, "dtic");

      await page.goto("/dtic/new-ticket", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: /Abrir chamado/i })).toBeVisible();

      const narrative =
        `Equipe inteira sem acesso ao sistema de protocolo. ` +
        `Marcador de smoke: ${marker}.`;
      await page.getByPlaceholder(/Escreva o problema, erro ou pedido/i).fill(narrative);
      await page.screenshot({ path: path.join(outputDir, "01-dtic-agent-chat.png"), fullPage: true });

      await page.getByRole("button", { name: /Enviar mensagem/i }).click();
      await page.getByRole("button", { name: /Abrir chamado/i }).waitFor({ timeout: 15000 });
      await page.waitForTimeout(1000);
      conversationBodyText = await page.locator("body").innerText();
      fs.writeFileSync(path.join(outputDir, "02-inline-conversation.txt"), conversationBodyText, "utf8");
      await page.screenshot({ path: path.join(outputDir, "02-inline-conversation.png"), fullPage: true });

      draftBodyText = await page.locator("body").innerText();
      fs.writeFileSync(path.join(outputDir, "03-inline-draft.txt"), draftBodyText, "utf8");
      await page.screenshot({ path: path.join(outputDir, "03-inline-draft.png"), fullPage: true });

      await page.getByRole("button", { name: /Abrir chamado/i }).click();
      await expect
        .poll(async () => await page.locator("body").innerText(), { timeout: 30000 })
        .toMatch(/Chamado aberto:\s*#\d+\./i);
      await page.waitForTimeout(1000);
      successBodyText = await page.locator("body").innerText();
      fs.writeFileSync(path.join(outputDir, "04-inline-success.txt"), successBodyText, "utf8");
      await page.screenshot({ path: path.join(outputDir, "04-inline-success.png"), fullPage: true });

      const match = successBodyText.match(/#(\d+)/i);
      if (!match) {
        throw new Error("Nao foi possivel extrair o ticket_id da resposta do atendimento");
      }
      ticketId = Number(match[1]);
      successMessage = match[0];

      const auth = await backendLogin();
      createdTicketDetail = await fetchDticTicketDetail(auth.session_token, ticketId);
      expect(createdTicketDetail.ticket.id).toBe(ticketId);
      expect(createdTicketDetail.ticket.content.toLowerCase()).toContain(marker.toLowerCase());

      await expectApiResponse(page, new RegExp(`/api/v1/dtic/tickets/${ticketId}/detail$`), async () => {
        await page.goto(`/dtic/ticket/${ticketId}`, { waitUntil: "domcontentloaded" });
      });
      await expect(page.getByText(marker).first()).toBeVisible();
      detailVisible = true;
      await page.screenshot({ path: path.join(outputDir, "05-dtic-detail.png"), fullPage: true });
      fs.writeFileSync(
        path.join(outputDir, "06-hub-ticket-detail.json"),
        JSON.stringify(createdTicketDetail, null, 2),
        "utf8",
      );

      serviceSessionToken = await glpiServiceInit(runtimeEnv);
      const createdTicketResponse = await glpiServiceGet(runtimeEnv, serviceSessionToken, "Ticket", ticketId);
      expect(createdTicketResponse.status).toBeLessThan(400);
      const rawTicket = await createdTicketResponse.json();
      fs.writeFileSync(
        path.join(outputDir, "07-glpi-ticket.json"),
        JSON.stringify(rawTicket, null, 2),
        "utf8",
      );
    } finally {
      let ticketDeleted = false;
      let ticketStillExistsInGlpi = false;
      let deleteResult: unknown = null;

      if (!serviceSessionToken && ticketId) {
        serviceSessionToken = await glpiServiceInit(runtimeEnv);
      }

      if (serviceSessionToken && ticketId) {
        deleteResult = await glpiServiceDelete(runtimeEnv, serviceSessionToken, "Ticket", ticketId);
        const probe = await glpiServiceGet(runtimeEnv, serviceSessionToken, "Ticket", ticketId);
        ticketStillExistsInGlpi = probe.status < 400;
      }

      ticketDeleted = !ticketStillExistsInGlpi;

      if (serviceSessionToken) {
        await glpiServiceKill(runtimeEnv, serviceSessionToken);
      }

      const auditAfter = readAuditEvents(agentAuditLogPath);
      const newAuditEvents = auditAfter.slice(auditBeforeCount);
      fs.writeFileSync(
        path.join(outputDir, "08-agent-audit-events.json"),
        JSON.stringify(newAuditEvents, null, 2),
        "utf8",
      );

      const summary = {
        baseUrl: smokeBaseUrl,
        marker,
        ticketId,
        createdTicketDetail,
        detailVisible,
        successMessage,
        interaction: {
          conversationBodyText,
          draftBodyText,
          successBodyText,
        },
        cleanup: {
          deleteResult,
          ticketDeleted,
          ticketStillExistsInGlpi,
        },
        agentAuditEvents: newAuditEvents,
      };
      fs.writeFileSync(
        path.join(outputDir, "summary.json"),
        JSON.stringify(summary, null, 2),
        "utf8",
      );

      if (ticketId) {
        expect(ticketDeleted).toBe(true);
      }
    }
  });
});
