import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "@playwright/test";
import { API_URL, fitsWidth, headers, PASSWORD } from "./helpers";

test("anonymous visitors cannot access the protected app", async ({
  page,
  request,
}) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fapp$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  const session = await request.get(`${API_URL}/api/auth/get-session`);
  expect(await session.json()).toBeNull();
});

test("signup, persisted session, signout, rejected password, and signin work across origins", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `builder-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name", { exact: true }).fill("Ada Builder");
  await page.getByLabel("Email", { exact: true }).fill(email);
  const passwordField = page.getByLabel("Password", { exact: true });
  await passwordField.fill(PASSWORD);
  await expect(passwordField).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Tampilkan kata sandi" }).click();
  await expect(passwordField).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Sembunyikan kata sandi" }).click();
  await expect(passwordField).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const profileNav = page
    .getByRole("navigation", { name: "Menu Utama" })
    .getByRole("button", { name: "Profil Saya" });
  await expect(profileNav).toBeVisible();
  // A full reload is rendered by the web server, which reads the session
  // from the API with the browser's cookie.
  await page.reload();
  await expect(page).toHaveURL(/\/app$/);
  await expect(profileNav).toBeVisible();
  const cookies = await context.cookies(API_URL);
  expect(
    cookies.some(
      (cookie) => cookie.name.includes("session_token") && cookie.httpOnly,
    ),
  ).toBe(true);
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/app$/);
  await profileNav.click();
  await page.getByRole("button", { name: "Pengaturan" }).click();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fapp$/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "We couldn't sign you in." }),
  ).toContainText("Check your email and password");
  await passwordField.fill(PASSWORD);
  await expect(passwordField).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Tampilkan kata sandi" }).click();
  await expect(passwordField).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Sembunyikan kata sandi" }).click();
  await expect(passwordField).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  expect(errors).toEqual([]);
});

test("auth rejects untrusted origins and invalid signup data", async ({
  request,
}) => {
  test.setTimeout(90_000);
  let crossOrigin = await request.post(`${API_URL}/api/auth/sign-up/email`, {
    headers: { Origin: "https://untrusted.example" },
    data: {
      name: "Test",
      email: "cross-origin@example.com",
      password: "Test-password-123",
    },
  });
  for (
    let attempt = 0;
    attempt < 2 && crossOrigin.status() === 429;
    attempt++
  ) {
    const seconds = Number(crossOrigin.headers()["retry-after"] || 10);
    await delay((Math.min(seconds, 60) + 1) * 1000);
    crossOrigin = await request.post(`${API_URL}/api/auth/sign-up/email`, {
      headers: { Origin: "https://untrusted.example" },
      data: {
        name: "Test",
        email: "cross-origin@example.com",
        password: "Test-password-123",
      },
    });
  }
  expect(crossOrigin.status()).toBe(403);
  const invalid = await request.post(`${API_URL}/api/auth/sign-up/email`, {
    headers,
    data: { name: "Test", email: "not-an-email", password: "short" },
  });
  expect(invalid.status()).toBeGreaterThanOrEqual(400);
  expect(invalid.status()).toBeLessThan(500);
});

test("auth pages fit a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
});
