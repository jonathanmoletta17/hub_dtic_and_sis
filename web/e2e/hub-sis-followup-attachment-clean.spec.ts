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

type TicketWorkflowDetailResponse = {
  timeline: Array<{
    id: number;
    type: "followup" | "solution" | "task";
    content: string;
  }>;
  attachments: Array<{
    id: number;
    relation_id?: number | null;
    filename: string;
    mime_type: string;
    size: number;
    url: string;
  }>;
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

async function fetchTicketWorkflowDetail(sessionToken: string, ticketId: number): Promise<TicketWorkflowDetailResponse> {
  const response = await fetch(`${smokeBaseUrl}/api/v1/sis/tickets/${ticketId}/detail`, {
    headers: {
      "Session-Token": sessionToken,
    },
  });

  if (!response.ok) {
    throw new Error(`Ticket detail failed with status ${response.status}`);
  }

  return (await response.json()) as TicketWorkflowDetailResponse;
}

async function validateAttachmentDownload(sessionToken: string, ticketId: number, documentId: number): Promise<string> {
  const response = await fetch(
    `${smokeBaseUrl}/api/v1/sis/tickets/${ticketId}/attachments/${documentId}/download`,
    {
      headers: {
        "Session-Token": sessionToken,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Attachment download failed with status ${response.status}`);
  }

  return response.text();
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

async function glpiServiceDelete(
  runtimeEnv: RuntimeEnv,
  serviceSessionToken: string,
  itemtype: string,
  itemId: number,
): Promise<void> {
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

async function glpiServiceGet(
  runtimeEnv: RuntimeEnv,
  serviceSessionToken: string,
  itemtype: string,
  itemId: number,
): Promise<Response> {
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

test.describe("Hub SIS followup and attachment smoke @mutation", () => {
  test.setTimeout(240_000);

  test("cria ticket real, envia followup, envia anexo, valida download e limpa tudo", async ({ page }) => {
    skipUnlessMutationSmokeAllowed();
    ensureSmokeCredentials();

    const runtimeEnv = readRuntimeEnv();
    const marker = makeSmokeMarker("CODEX-HUB-SIS-FOLLOWUP-ATTACH");
    const followupText = `${marker} - followup real pela base extraida`;
    const attachmentName = `${marker}.txt`;
    const attachmentContent = `${marker} - anexo real pela base extraida`;
    const outputDir = path.resolve(process.cwd(), "output", "phase4-sis-followup-attachment-clean");
    fs.mkdirSync(outputDir, { recursive: true });

    let formAnswerId: number | null = null;
    let ticketId: number | null = null;
    let attachmentId: number | null = null;
    let attachmentRelationId: number | null = null;
    let serviceSessionToken: string | null = null;
    let detailVisible = false;
    let followupVisible = false;
    let attachmentVisible = false;
    let downloadValidated = false;

    try {
      await loginThroughGateway(page);
      await selectWorkspace(page, "sis");

      await gotoSisNewTicket(page);

      await page.locator(".service-card").filter({ hasText: "Carregadores" }).first().click();
      await expect(page.getByRole("heading", { name: "Dados gerais" })).toBeVisible();

      const step2Fields = page.locator(".field-wrapper");
      await step2Fields.nth(0).locator("select").selectOption({ label: "Para mim" });
      await step2Fields.nth(1).locator(".combobox-trigger").click();
      await step2Fields.nth(1).locator(".combobox-input").fill("Palacio");
      await step2Fields.nth(1).locator(".combobox-option").first().click();
      await step2Fields.nth(2).locator("input").fill("5199990000");
      await page.locator("button").filter({ hasText: "Pr\u00f3ximo" }).first().click();

      await expect(page.getByRole("heading", { name: "Detalhamento" })).toBeVisible();

      const step3Fields = page.locator(".field-wrapper");
      await step3Fields.nth(0).locator(".combobox-trigger").click();
      await step3Fields.nth(0).locator(".combobox-input").fill("Movimenta");
      await step3Fields.nth(0).locator(".combobox-option").filter({ hasText: "Movimenta" }).first().click();
      await step3Fields.nth(1).locator("input").fill(marker);
      await step3Fields.nth(2).locator("textarea").fill(`${marker} - validacao real de followup e anexo.`);

      await page.locator("button").filter({ hasText: "Pr\u00f3ximo" }).first().click();
      await expect(page.getByRole("heading", { name: "Revisao" })).toBeVisible();
      await page.screenshot({ path: path.join(outputDir, "01-review-before-submit.png"), fullPage: true });

      const submitResponse = await expectApiResponse(
        page,
        /\/api\/v1\/sis\/domain\/formcreator\/forms\/\d+\/submit$/,
        async () => {
          await page.getByRole("button", { name: /Abrir chamado/i }).click();
        },
      );
      const submitPayload = (await submitResponse.json()) as SubmitFormResponse;
      formAnswerId = submitPayload.form_answer_id;

      const auth = await backendLogin();
      ticketId = await pollTicketIdByMarker(auth.session_token, auth.user_id, marker);

      await expectApiResponse(page, new RegExp(`/api/v1/sis/tickets/${ticketId}/detail$`), async () => {
        await page.goto(`/sis/ticket/${ticketId}`, { waitUntil: "domcontentloaded" });
      });
      await expect(page.getByText(marker).first()).toBeVisible();
      detailVisible = true;
      await page.screenshot({ path: path.join(outputDir, "02-detail-before-followup.png"), fullPage: true });

      const composer = page.locator("textarea").last();
      await composer.fill(followupText);
      await expectApiResponse(page, new RegExp(`/api/v1/sis/tickets/${ticketId}/followups$`), async () => {
        await composer.press("Enter");
      });
      await expect(page.getByText(followupText).first()).toBeVisible();
      followupVisible = true;
      await page.screenshot({ path: path.join(outputDir, "03-detail-with-followup.png"), fullPage: true });

      const fileInput = page.locator('input[type="file"]');
      await expectApiResponse(page, new RegExp(`/api/v1/sis/tickets/${ticketId}/attachments$`), async () => {
        await fileInput.setInputFiles({
          name: attachmentName,
          mimeType: "text/plain",
          buffer: Buffer.from(attachmentContent, "utf8"),
        });
      });
      await expect(page.getByText(attachmentName).first()).toBeVisible();
      attachmentVisible = true;
      await page.screenshot({ path: path.join(outputDir, "04-detail-with-attachment.png"), fullPage: true });

      const detailPayload = await fetchTicketWorkflowDetail(auth.session_token, ticketId);
      const attachment = detailPayload.attachments.find((item) => item.filename === attachmentName);
      expect(attachment).toBeTruthy();
      attachmentId = attachment?.id ?? null;
      attachmentRelationId = attachment?.relation_id ?? null;
      expect(detailPayload.timeline.some((item) => item.type === "followup" && item.content.includes(marker))).toBe(true);

      if (!attachmentId) {
        throw new Error("Attachment id was not returned by workflow detail");
      }

      const downloadedContent = await validateAttachmentDownload(auth.session_token, ticketId, attachmentId);
      expect(downloadedContent).toContain(marker);
      downloadValidated = true;

      serviceSessionToken = await glpiServiceInit(runtimeEnv);
    } finally {
      let postDeleteMatches: TicketListRow[] = [];
      let formAnswerDeleted = false;
      let ticketDeleted = false;
      let documentDeleted = false;
      let relationDeleted = false;

      if (serviceSessionToken && attachmentRelationId) {
        await glpiServiceDelete(runtimeEnv, serviceSessionToken, "Document_Item", attachmentRelationId);
        const relationProbe = await glpiServiceGet(runtimeEnv, serviceSessionToken, "Document_Item", attachmentRelationId);
        relationDeleted = relationProbe.status >= 400;
      }
      if (serviceSessionToken && attachmentId) {
        await glpiServiceDelete(runtimeEnv, serviceSessionToken, "Document", attachmentId);
        const documentProbe = await glpiServiceGet(runtimeEnv, serviceSessionToken, "Document", attachmentId);
        documentDeleted = documentProbe.status >= 400;
      }
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
        ticketId,
        formAnswerId,
        attachmentId,
        attachmentRelationId,
        detailVisible,
        followupVisible,
        attachmentVisible,
        downloadValidated,
        cleanup: {
          ticketDeleted,
          formAnswerDeleted,
          relationDeleted,
          documentDeleted,
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
      if (attachmentRelationId) {
        expect(relationDeleted).toBe(true);
      }
      if (attachmentId) {
        expect(documentDeleted).toBe(true);
      }
    }
  });
});
