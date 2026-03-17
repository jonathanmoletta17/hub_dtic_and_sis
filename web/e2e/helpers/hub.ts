import { expect, type Page, type Response } from "@playwright/test";

export const smokeUsername = process.env.SMOKE_USERNAME;
export const smokePassword = process.env.SMOKE_PASSWORD;
export const smokeBaseUrl = process.env.SMOKE_BASE_URL ?? "http://hub.local:8080";

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

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  } catch {
    // Transient Chromium navigation aborts happen sporadically on local proxy startup.
    await page.goto("/", { waitUntil: "domcontentloaded" });
  }
  await expect(page.getByPlaceholder("nome.sobrenome")).toBeVisible();
  await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  await page.getByPlaceholder("nome.sobrenome").fill(smokeUsername!);
  await page.getByPlaceholder("••••••••").fill(smokePassword!);

  await Promise.all([
    page.waitForURL("**/selector"),
    expectApiResponse(page, "/api/v1/dtic/auth/login", async () => {
      await page.getByRole("button", { name: /Entrar no Gateway/i }).click();
    }),
  ]);

  await expect(page).toHaveURL(/\/selector$/);
}

export async function selectWorkspace(page: Page, workspace: "dtic" | "sis"): Promise<void> {
  const label = workspace === "dtic" ? /DTIC CONTEXT/i : /SIS CONTEXT/i;
  const targetPrefix = workspace === "dtic" ? /\/dtic\/.+/ : /\/sis\/.+/;

  await Promise.all([
    page.waitForURL(targetPrefix),
    page.locator("button").filter({ hasText: label }).first().click(),
  ]);
}
