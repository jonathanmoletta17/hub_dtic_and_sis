import { expect, test, type Page, type Response } from "@playwright/test";

export const smokeUsername = process.env.SMOKE_USERNAME;
export const smokePassword = process.env.SMOKE_PASSWORD;
export const smokeBaseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:18080";

const usernamePlaceholderPattern = /nome[-.]sobrenome/i;
const loginButtonPattern = /Entrar no (Hub|Gateway)/i;
const workspaceButtonNameById = {
  dtic: /Abrir ambiente DTIC/i,
  sis: /Abrir ambiente SIS/i,
} as const;

type ExpectedResponse =
  | string
  | RegExp
  | ((url: string, response: Response) => boolean);

function matchesExpectedResponse(
  response: Response,
  expected: ExpectedResponse,
): boolean {
  const url = response.url();

  if (typeof expected === "string") {
    return url.startsWith(new URL(expected, smokeBaseUrl).toString());
  }

  if (expected instanceof RegExp) {
    return expected.test(url);
  }

  return expected(url, response);
}

export function ensureSmokeCredentials(): void {
  if (!smokeUsername || !smokePassword) {
    throw new Error(
      "Missing SMOKE_USERNAME or SMOKE_PASSWORD. Export both env vars before running the smoke suite.",
    );
  }
}

export function skipUnlessMutationSmokeAllowed(): void {
  test.skip(
    process.env.ALLOW_GLPI_MUTATION_SMOKE !== "true",
    "Smoke de mutacao real desabilitado. Defina ALLOW_GLPI_MUTATION_SMOKE=true somente quando puder criar e limpar dados reais no GLPI.",
  );
}

export function makeSmokeMarker(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${prefix}-${timestamp}`;
}

export async function expectApiResponse(
  page: Page,
  expected: ExpectedResponse,
  action: () => Promise<unknown>,
): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => matchesExpectedResponse(candidate, expected)),
    action(),
  ]);

  expect(
    response.status(),
    `Expected API response ${response.url()} to avoid client/server errors`,
  ).toBeLessThan(400);

  return response;
}

export async function loginThroughGateway(page: Page): Promise<void> {
  ensureSmokeCredentials();

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
    } catch {
      // Transient Chromium navigation aborts happen sporadically on local proxy startup.
      await page.goto("/", { waitUntil: "domcontentloaded" });
    }

    if (/\/selector$/.test(page.url())) {
      await expect(page).toHaveURL(/\/selector$/);
      return;
    }

    const usernameInput = page.getByPlaceholder(usernamePlaceholderPattern);
    const passwordInput = page.locator('input[type="password"]');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await usernameInput.fill(smokeUsername!);
    await passwordInput.fill(smokePassword!);

    try {
      await Promise.all([
        page.waitForURL("**/selector", { waitUntil: "domcontentloaded", timeout: 15_000 }),
        expectApiResponse(page, "/api/v1/dtic/auth/login", async () => {
          await page.getByRole("button", { name: loginButtonPattern }).click();
        }),
      ]);

      await expect(page).toHaveURL(/\/selector$/);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function selectWorkspace(page: Page, workspace: "dtic" | "sis"): Promise<void> {
  const label = workspaceButtonNameById[workspace];
  const targetPrefix = workspace === "dtic" ? /\/dtic\/.+/ : /\/sis\/.+/;

  await Promise.all([
    page.waitForURL(targetPrefix, { waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: label }).click(),
  ]);
}

export async function gotoSisNewTicket(page: Page): Promise<void> {
  await Promise.all([
    page.waitForResponse((response) =>
      matchesExpectedResponse(response, "/api/v1/sis/domain/formcreator/categories"),
    ),
    page.waitForResponse((response) =>
      matchesExpectedResponse(response, /\/api\/v1\/sis\/domain\/formcreator\/forms(?:\?.*)?$/),
    ),
    page.goto("/sis/new-ticket", { waitUntil: "domcontentloaded" }),
  ]);

  await expect
    .poll(async () => page.locator(".service-card").count(), {
      message: "Expected SIS service catalog to render at least one service card",
      timeout: 15_000,
    })
    .toBeGreaterThan(0);

  await expect(page.locator(".service-card").first()).toBeVisible();
}
