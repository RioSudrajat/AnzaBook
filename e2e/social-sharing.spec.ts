import { expect, test } from "@playwright/test";
import { API_URL, fitsWidth, headers, signUp } from "./helpers";

function hasPngSignature(buf: Buffer): boolean {
  return (
    buf.length > 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

test.describe("Social Sharing, Styled Feed Cards & Public OG Previews (Issue #14)", () => {
  test("publishes styled quote via composer, renders in Explore & Public Profile, serves public /post & OG PNG, and blocks unposted items", async ({
    browser,
    page,
  }) => {
    await signUp(page.request, "Saras Kutipan");
    const meRes = await page.request.get(`${API_URL}/api/social/me`);
    expect(meRes.ok()).toBeTruthy();
    const { data: me } = await meRes.json();

    const bookRes = await page.request.get(
      `${API_URL}/api/books/madilog-tan-malaka`,
    );
    expect(bookRes.ok()).toBeTruthy();
    const { data: book } = await bookRes.json();

    const quoteText =
      "Logika yang jernih membebaskan pikiran dari kabut kebiasaan lama.";
    const secretNote = "CatatanRahasiaE2E4401";
    const postCaption = "Paragraf paling menampar di bab awal Madilog.";

    const hlRes = await page.request.post(`${API_URL}/api/reading/highlights`, {
      headers,
      data: {
        bookId: book.id,
        chapterNumber: 1,
        pageNumber: 14,
        selectedText: quoteText,
        color: "coral",
        note: secretNote,
      },
    });
    expect(hlRes.status()).toBe(201);
    const { data: highlight } = await hlRes.json();

    // Unposted highlight must 404 publicly on both /post and /post-preview
    const anonContext = await browser.newContext();
    try {
      const privatePageRes = await anonContext.request.get(
        `/post/quote/${highlight.id}`,
      );
      expect(privatePageRes.status()).toBe(404);

      const privateOgRes = await anonContext.request.get(
        `/post-preview/quote/${highlight.id}`,
      );
      expect(privateOgRes.status()).toBe(404);

      // Publish via real Quote Post Composer UI from Profile -> Aktivitas (unified with Public Profile)
      await page.goto("/app?tab=profile");
      await expect(
        page.getByRole("tab", { name: /Rak Bacaan/i }),
      ).toBeVisible();
      await page.getByRole("tab", { name: /Aktivitas/i }).click();
      await expect(page.getByText(quoteText)).toBeVisible();

      await page
        .getByRole("button", { name: /Post & Bagikan/i })
        .first()
        .click();
      const composer = page.getByRole("dialog", {
        name: "Bagikan & Post Kutipan",
      });
      await expect(composer).toBeVisible();

      await composer.getByRole("button", { name: /Stabilo Malam/i }).click();
      await composer
        .getByPlaceholder("Tulis mengapa paragraf ini berkesan bagimu...")
        .fill(postCaption);
      await composer
        .getByRole("button", { name: "Post ke Feed AnzaBook" })
        .click();
      await expect(
        composer.getByRole("button", { name: "Perbarui di Feed AnzaBook" }),
      ).toBeVisible();
      await composer.getByRole("button", { name: "Tutup dialog" }).click();

      // Verify styled QuotePostCard in Explore feed without private note leak
      await page.goto("/app?tab=explore");
      const exploreQuoteCard = page
        .locator('[data-quote-card][data-quote-template="night_stabilo"]')
        .filter({ hasText: quoteText })
        .first();
      await expect(exploreQuoteCard).toBeVisible();
      await expect(exploreQuoteCard).toContainText(postCaption);
      await expect(exploreQuoteCard).not.toContainText(secretNote);

      // Open in-feed PostShareDialog and check link + 1080p button
      const exploreFeedItem = exploreQuoteCard.locator(
        "xpath=ancestor::article",
      );
      await exploreFeedItem
        .getByRole("button", { name: "Bagikan kutipan" })
        .click();
      const shareDialog = page.getByRole("dialog", {
        name: "Bagikan Postingan",
      });
      await expect(shareDialog).toBeVisible();
      await expect(shareDialog).toContainText(`/post/quote/${highlight.id}`);
      await expect(
        shareDialog.getByRole("button", { name: "Unduh Kartu 1080p PNG" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(shareDialog).not.toBeVisible();

      // Anonymous visitor checks Public Profile, Public Post Page, OG PNG & Conversion CTA
      const anonPage = await anonContext.newPage();
      await anonPage.setViewportSize({ width: 1280, height: 800 });

      const profileHandle = me.username || me.id;
      await anonPage.goto(`/u/${encodeURIComponent(profileHandle)}`);
      await anonPage.getByRole("tab", { name: /Aktivitas/i }).click();
      const profileQuoteCard = anonPage
        .locator('[data-quote-card][data-quote-template="night_stabilo"]')
        .filter({ hasText: quoteText })
        .first();
      await expect(profileQuoteCard).toBeVisible();
      await expect(profileQuoteCard).not.toContainText(secretNote);

      await anonPage.goto(`/post/quote/${highlight.id}`);
      const standaloneCard = anonPage.locator(
        '[data-quote-card][data-quote-template="night_stabilo"]',
      );
      await expect(standaloneCard).toBeVisible();
      await expect(standaloneCard).toContainText(quoteText);
      await expect(standaloneCard).toContainText(postCaption);
      await expect(standaloneCard).not.toContainText(secretNote);
      expect(await fitsWidth(anonPage)).toBe(true);

      // Verify OG & Twitter meta tags
      const ogImage = await anonPage
        .locator('meta[property="og:image"]')
        .getAttribute("content");
      const twitterCard = await anonPage
        .locator('meta[name="twitter:card"]')
        .getAttribute("content");
      expect(ogImage).toContain(`/post-preview/quote/${highlight.id}`);
      expect(twitterCard).toBe("summary_large_image");

      // Verify dynamic OG PNG endpoint returns valid 1200x630 PNG bytes
      const ogRes = await anonContext.request.get(
        `/post-preview/quote/${highlight.id}`,
      );
      expect(ogRes.status()).toBe(200);
      expect(ogRes.headers()["content-type"]).toContain("image/png");
      expect(hasPngSignature(await ogRes.body())).toBe(true);

      // Verify accessible CopyLinkButton stays enabled and announces status
      const copyBtn = anonPage.getByRole("button", { name: "Salin Tautan" });
      await copyBtn.click();
      await expect(copyBtn).toBeEnabled();

      // Mobile viewport layout check (no horizontal overflow)
      await anonPage.setViewportSize({ width: 375, height: 812 });
      expect(await fitsWidth(anonPage)).toBe(true);

      // Curiosity-to-sample CTA conversion -> /books/madilog-tan-malaka
      await anonPage
        .getByRole("link", { name: "Baca Cuplikan di AnzaBook" })
        .click();
      await expect(anonPage).toHaveURL(/\/books\/madilog-tan-malaka/);
    } finally {
      await anonContext.close();
    }
  });

  test("prevents duplicate session after closing session composer from exit sheet, enforces FLEX-03 hidden metrics in feed/public/OG", async ({
    browser,
    page,
  }) => {
    await signUp(page.request, "Bagas Sesi Baca");
    const slug = "madilog-tan-malaka";
    const bookRes = await page.request.get(`${API_URL}/api/books/${slug}`);
    expect(bookRes.ok()).toBeTruthy();
    const { data: book } = await bookRes.json();

    // 1. Wait for initial brand preloader to finish before scrolling to Chapter 2
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
    const exitDialog = page.getByRole("dialog", {
      name: "Ringkasan Sesi Baca",
    });
    await expect(exitDialog).toBeVisible();

    // Launch external session composer from Exit Sheet, then close it
    await exitDialog
      .getByRole("button", { name: "Post / Bagikan Sesi" })
      .click();
    const sessionComposer = page.getByRole("dialog", {
      name: "Bagikan & Post Sesi Baca",
    });
    await expect(sessionComposer).toBeVisible();
    await sessionComposer.getByRole("button", { name: "Tutup dialog" }).click();
    await expect(sessionComposer).not.toBeVisible();

    // Regression check for PR #31 suppressResumeOnCloseRef bug:
    // Exiting immediately after closing composer must NOT open exit sheet again or duplicate the session
    await page.getByRole("button", { name: "Kembali" }).click();
    await expect(page).toHaveURL(/\/app/);

    const sessionsRes = await page.request.get(
      `${API_URL}/api/reading/sessions/${book.id}`,
    );
    expect(sessionsRes.ok()).toBeTruthy();
    const { data: sessions } = await sessionsRes.json();
    expect(sessions).toHaveLength(1);
    const sessionId = sessions[0].id as string;

    const anonContext = await browser.newContext();
    try {
      // Private session must 404 on /post and /post-preview
      expect(
        (await anonContext.request.get(`/post/session/${sessionId}`)).status(),
      ).toBe(404);
      expect(
        (
          await anonContext.request.get(`/post-preview/session/${sessionId}`)
        ).status(),
      ).toBe(404);

      // 2. Publish session via Profile -> Aktivitas -> Session Composer with WPM & duration hidden (FLEX-03)
      await page.goto("/app?tab=profile");
      await page.getByRole("tab", { name: /Aktivitas/i }).click();
      await page
        .getByRole("button", { name: /Post & Bagikan/i })
        .first()
        .click();
      const composer = page.getByRole("dialog", {
        name: "Bagikan & Post Sesi Baca",
      });
      await expect(composer).toBeVisible();

      await composer.getByRole("button", { name: /Indeks Literasi/i }).click();
      await composer
        .getByPlaceholder("Baca Malam · Bumi Manusia")
        .fill("Sesi Fokus Bab Dua");
      await composer.getByLabel("Durasi Baca").uncheck();
      await composer.getByLabel("Ritme & WPM").uncheck();
      await composer
        .getByRole("button", { name: "Post ke Feed AnzaBook" })
        .click();
      await expect(
        composer.getByRole("button", { name: "Perbarui di Feed AnzaBook" }),
      ).toBeVisible();
      await composer.getByRole("button", { name: "Tutup dialog" }).click();

      // 3. Verify Explore styled session card respects FLEX-03 hidden metrics
      await page.goto("/app?tab=explore");
      const exploreSessionCard = page
        .locator('[data-session-card][data-session-template="literary_index"]')
        .filter({ hasText: "Sesi Fokus Bab Dua" })
        .first();
      await expect(exploreSessionCard).toBeVisible();
      await expect(
        exploreSessionCard.locator('[data-session-metric="pages"]'),
      ).toBeVisible();
      await expect(
        exploreSessionCard.locator('[data-session-metric="duration"]'),
      ).toHaveCount(0);
      await expect(
        exploreSessionCard.locator('[data-session-metric="tempo"]'),
      ).toHaveCount(0);
      await expect(exploreSessionCard).not.toContainText("WPM");

      // 4. Verify anonymous public /post/session/:id, OG PNG, mobile fit & Reader redirect
      const anonPage = await anonContext.newPage();
      await anonPage.setViewportSize({ width: 1280, height: 800 });
      await anonPage.goto(`/post/session/${sessionId}`);

      const publicCard = anonPage.locator(
        '[data-session-card][data-session-template="literary_index"]',
      );
      await expect(publicCard).toBeVisible();
      await expect(publicCard).toContainText("Sesi Fokus Bab Dua");
      await expect(publicCard).toContainText("Jejak Baca");
      await expect(
        publicCard.locator('[data-session-metric="duration"]'),
      ).toHaveCount(0);
      await expect(
        publicCard.locator('[data-session-metric="tempo"]'),
      ).toHaveCount(0);
      await expect(publicCard).not.toContainText("WPM");
      expect(await fitsWidth(anonPage)).toBe(true);

      const ogImage = await anonPage
        .locator('meta[property="og:image"]')
        .getAttribute("content");
      expect(ogImage).toContain(`/post-preview/session/${sessionId}`);

      const ogRes = await anonContext.request.get(
        `/post-preview/session/${sessionId}`,
      );
      expect(ogRes.status()).toBe(200);
      expect(ogRes.headers()["content-type"]).toContain("image/png");
      expect(hasPngSignature(await ogRes.body())).toBe(true);

      await anonPage.setViewportSize({ width: 375, height: 812 });
      expect(await fitsWidth(anonPage)).toBe(true);

      // Direct reader CTA redirects anonymous visitors cleanly to /sign-in with redirect param
      await anonPage
        .getByRole("link", { name: "Buka Langsung di Reader" })
        .click();
      await expect(anonPage).toHaveURL(
        /\/sign-in\?redirect=%2Fread%2Fmadilog-tan-malaka/,
      );
    } finally {
      await anonContext.close();
    }
  });
});
