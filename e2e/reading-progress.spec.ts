import { expect, test } from "@playwright/test";
import { API_URL, signUp, WEB_URL } from "./helpers";

test("Home and Library use the same books and show history only for the selected title", async ({
  page,
}) => {
  await signUp(page.request, "Pembaca Dua Buku");
  const ids = [];
  const titles = [];
  for (const [index, slug] of [
    "madilog-tan-malaka",
    "kecerdasan-sosial-homo-sapiens",
  ].entries()) {
    const details = await page.request.get(`${API_URL}/api/books/${slug}`);
    expect(details.ok()).toBeTruthy();
    const { data: book } = await details.json();
    ids.push(book.id);
    titles.push(book.title);
    const checkpoint = await page.request.put(
      `${API_URL}/api/reading/progress/${book.id}`,
      {
        headers: { Origin: WEB_URL },
        data: {
          lastChapterNumber: 1,
          lastScrollPercent: index * 30,
          layout: "scroll",
        },
      },
    );
    expect(checkpoint.ok()).toBeTruthy();
  }

  const session = await page.request.post(`${API_URL}/api/reading`, {
    headers: { Origin: WEB_URL },
    data: { bookId: ids[0], pagesRead: 1, durationSeconds: 90, avgWpm: 180 },
  });
  expect(session.ok()).toBeTruthy();
  await page.goto("/app");
  const home = page.getByRole("region", { name: "Lanjutkan Membaca" });
  await expect(
    home.getByRole("heading", { name: titles[1], exact: true }),
  ).toBeVisible();
  await expect(home.locator("[data-book-cover]")).toHaveCount(1);
  await expect(home.getByRole("link", { name: "Lanjut Baca" })).toHaveAttribute(
    "href",
    "/read/kecerdasan-sosial-homo-sapiens",
  );
  await home.getByRole("link", { name: "Rak Saya" }).click();

  const reading = page.getByRole("region", { name: "Sedang Dibaca" });
  await expect(reading.getByRole("button", { name: titles[0] })).toBeVisible();
  await expect(reading.getByRole("button", { name: titles[1] })).toBeVisible();
  await expect(reading.locator("[data-book-cover]")).toHaveCount(2);
  await expect(reading.getByText("Riwayat sesi")).toHaveCount(0);
  await reading.getByRole("button", { name: titles[1] }).click();
  await expect(
    reading.getByText("Belum ada sesi baca untuk buku ini."),
  ).toBeVisible();
  await reading.getByRole("button", { name: titles[0] }).click();
  await expect(reading.getByText("180 kata/menit")).toBeVisible();
  await page.goBack();
  await expect(home).toBeVisible();
});

test("Explore category filters return real titles with the shared cover", async ({
  page,
}) => {
  await signUp(page.request, "Pembaca Jelajah");
  await page.goto("/app?tab=explore");
  await page.getByRole("button", { name: /Berpikir Kritis/ }).click();

  const results = page.getByRole("region", { name: "Buku di katalog" });
  await expect(
    results
      .getByRole("link", {
        name: "Sains, Logika, dan Seni untuk Hidup Bermutu",
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await expect(results.getByRole("link", { name: /Madilog/ })).toHaveCount(0);
  await expect(results.locator("[data-book-cover]")).toHaveCount(2);
});
