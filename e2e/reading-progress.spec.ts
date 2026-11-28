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
  await expect(home.locator("[data-book-cover]")).toHaveCount(2);
  await expect(home.locator("progress")).toHaveCount(2);
  await expect(home.locator('a[href^="/read/"]').first()).toHaveAttribute(
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

  const results = page.getByRole("region", { name: "Buku Terkait" });
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

test("Post-Reading Exit Prompt skips immediate exit and shows real metrics after forward progress", async ({
  page,
}) => {
  await signUp(page.request, "Pembaca Ringkasan Sesi");
  const slug = "madilog-tan-malaka";
  const detail = await page.request.get(`${API_URL}/api/books/${slug}`);
  expect(detail.ok()).toBeTruthy();
  const { data: book } = await detail.json();

  // 1. Immediate exit (< 15s and no forward progress) navigates straight home without modal or session record.
  await page.goto(`/read/${slug}`);
  await expect(page.locator("#chapter-sec-1")).toBeVisible();
  await page.getByRole("button", { name: "Kembali" }).click();
  await expect(
    page.getByRole("dialog", { name: "Ringkasan Sesi Baca" }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/app/);

  const immediateSessionsRes = await page.request.get(
    `${API_URL}/api/reading/sessions/${book.id}`,
  );
  expect(immediateSessionsRes.ok()).toBeTruthy();
  const { data: immediateSessions } = await immediateSessionsRes.json();
  expect(immediateSessions).toHaveLength(0);

  // 2. Forward progress into chapter 2 triggers the exit sheet with real telemetry.
  // Wait for the brand preloader to dismiss first so scroll lock doesn't reset scroll before Kembali clicks.
  await page.goto(`/read/${slug}`, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("dialog", { name: "Prapemuat Literasi AnzaBook" }),
  ).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator("#chapter-sec-1")).toBeVisible();
  await expect(page.getByText(/^1\/\d+$/)).toBeVisible();
  const secondChapter = page.locator("#chapter-sec-2");
  await expect(secondChapter).toBeVisible();
  await secondChapter.evaluate((section) =>
    section.scrollIntoView({ block: "start" }),
  );
  await expect(page.getByText(/^2\/\d+$/)).toBeVisible();

  await page.getByRole("button", { name: "Kembali" }).click();
  const exitDialog = page.getByRole("dialog", { name: "Ringkasan Sesi Baca" });
  await expect(exitDialog).toBeVisible();
  await expect(exitDialog.getByText("Durasi Aktif")).toBeVisible();
  await expect(exitDialog.getByText("Halaman Standar")).toBeVisible();
  await expect(exitDialog.getByText("Progres Buku")).toBeVisible();
  await expect(
    exitDialog.getByRole("button", { name: "Post / Bagikan Sesi" }),
  ).toBeVisible();

  // 3. Escape dismisses the modal cleanly so reading can resume, then further progress prompts again.
  await page.keyboard.press("Escape");
  await expect(exitDialog).not.toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/read/${slug}`));

  await secondChapter
    .locator("[data-reader-paragraph]")
    .last()
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.getByRole("button", { name: "Kembali" }).click();
  await expect(exitDialog).toBeVisible();

  // 4. 1-click Lewati & Keluar exits home while keeping the session private by default.
  await exitDialog.getByRole("button", { name: "Lewati & Keluar" }).click();
  await expect(page).toHaveURL(/\/app/);

  const sessionsRes = await page.request.get(
    `${API_URL}/api/reading/sessions/${book.id}`,
  );
  expect(sessionsRes.ok()).toBeTruthy();
  const { data: sessions } = await sessionsRes.json();
  expect(sessions).toHaveLength(2);
  expect(sessions[0]).toMatchObject({
    endChapterNumber: 2,
    isPosted: false,
  });
  expect(sessions[0].wordsRead).toBeGreaterThan(0);
});
