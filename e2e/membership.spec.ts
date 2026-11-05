import { expect, test } from "@playwright/test";
import { API_URL, fitsWidth, signUp } from "./helpers";

test("shows the same membership plans on landing and the membership page", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("link", { name: "Lihat paket Nakama" }).click();
  await expect(page.getByRole("heading", { name: "Jadi Nakama" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3 bulan" })).toBeVisible();
  await expect(page.getByText("Rp60.000", { exact: true })).toBeVisible();
  await expect(page.getByText("Rp66.600 setelah pajak", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Beli sebagai hadiah", exact: true }).first()).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
});

test("adds tax to the package price and verifies the gift recipient before checkout", async ({ page }) => {
  await signUp(page.request, "Pembeli hadiah");
  const slug = "sains-logika-seni-hidup-bermutu";
  await page.route(`${API_URL}/api/membership`, (route) =>
    route.fulfill({ json: { data: { username: null, expiresAt: null, status: "inactive", checkoutAvailable: true, reminderEmailsEnabled: true } } }),
  );
  await page.route(`${API_URL}/api/membership/recipient`, async (route) => {
    expect(route.request().postDataJSON()).toEqual({ username: "nakama_uji" });
    await route.fulfill({ json: { data: { username: "nakama_uji", displayName: "Nakama Uji" } } });
  });
  const orderId = "ae8f7246-ec9d-4ad9-abfc-2b7b59f75689";
  const checkoutUrl = "https://app.sandbox.midtrans.com/snap/v2/vtweb/test-transaction";
  const checkout = {
    id: orderId, status: "pending", checkoutUrl, planId: "quarterly", priceIdr: 66600,
    months: 3, recipientUsername: "nakama_uji", bookSlug: null, createdAt: new Date().toISOString(),
    paidAt: null, tax: { subtotalIdr: 60000, taxIdr: 6600, rateBps: 1100 },
  };
  await page.route(`${API_URL}/api/membership/checkout`, async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      planId: "quarterly",
      recipientUsername: "nakama_uji",
      requestId: expect.any(String),
    });
    await route.fulfill({ status: 201, json: { data: checkout } });
  });
  await page.route(checkoutUrl, (route) => route.fulfill({ body: "Midtrans sandbox" }));

  await page.goto(`/membership?book=${slug}&plan=quarterly&gift=true`);
  await expect(page.getByText("Harga sebelum pajak", { exact: true })).toBeVisible();
  await expect(page.getByText("Pajak (11%)", { exact: true })).toBeVisible();
  await expect(page.getByText("Rp6.600", { exact: true })).toBeVisible();
  await expect(page.getByText("Rp66.600", { exact: true })).toBeVisible();
  const pay = page.getByRole("button", { name: "Bayar dengan QRIS" });
  await expect(pay).toBeDisabled();
  await page.getByLabel("Username penerima").fill("Nakama_Uji");
  await page.getByRole("button", { name: "Cek penerima" }).click();
  await expect(page.getByText("Nakama Uji", { exact: false })).toBeVisible();
  await expect(pay).toBeEnabled();
  await pay.click();
  await expect(page).toHaveURL(checkoutUrl);
});

test("returns to the saved book only after a verified self-payment", async ({ page }) => {
  await signUp(page.request, "Pembaca Nakama");
  const slug = "sains-logika-seni-hidup-bermutu";
  const orderId = "40e5cf3d-60c3-4cb9-8a4c-4ec057922026";
  const checkout = {
    id: orderId, status: "pending", checkoutUrl: null, planId: "quarterly", priceIdr: 66600,
    months: 3, recipientUsername: null, bookSlug: slug, createdAt: new Date().toISOString(),
    paidAt: null, tax: { subtotalIdr: 60000, taxIdr: 6600, rateBps: 1100 },
  };
  await page.route(`${API_URL}/api/membership`, (route) =>
    route.fulfill({ json: { data: { username: null, expiresAt: null, status: "inactive", checkoutAvailable: true, reminderEmailsEnabled: true } } }),
  );
  await page.route(`${API_URL}/api/membership/checkout`, async (route) => {
    expect(route.request().postDataJSON().bookSlug).toBe(slug);
    await route.fulfill({ status: 201, json: { data: checkout } });
  });
  await page.route(`${API_URL}/api/membership/orders/${orderId}`, (route) =>
    route.fulfill({ json: { data: checkout } }),
  );
  let verify = false;
  await page.route(`${API_URL}/api/membership/orders/${orderId}/refresh`, (route) =>
    route.fulfill({ json: { data: verify ? { ...checkout, status: "paid", paidAt: new Date().toISOString() } : checkout } }),
  );

  await page.goto(`/membership?book=${slug}&plan=quarterly`);
  await page.getByRole("button", { name: "Bayar dengan QRIS" }).click();
  await expect(page).toHaveURL(new RegExp(`/membership/checkout/${orderId}`));
  await expect(page.getByRole("heading", { name: "Menunggu pembayaran" })).toBeVisible();
  verify = true;
  await page.getByRole("button", { name: "Periksa pembayaran" }).click();
  await expect(page).toHaveURL(new RegExp(`/read/${slug}$`));
});
