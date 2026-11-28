import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { API_URL, headers, signUp } from "./helpers";

function parseRgb(color: string): [number, number, number] {
  const match = color.match(
    /(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/,
  );
  if (!match) return [255, 255, 255];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

test.describe("E-Reader UX, Themes, Progress Sync & Profile Safeguards", () => {
  test("premium preview cuplikan caps reader and home shelf progress cleanly instead of jumping to 100%", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("anzabook-preloader-v1", "1");
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUp(page.request, "Pembaca Cuplikan E2E");

    await page.goto("/read/sains-logika-seni-hidup-bermutu");
    const paywallHeading = page.getByRole("heading", {
      name: "Akhir cuplikan",
    });
    await expect(paywallHeading).toBeVisible();
    await paywallHeading.scrollIntoViewIfNeeded();
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight }),
    );

    const progressRegion = page.getByRole("region", {
      name: /Progres membaca chapter 1 dari 8/i,
    });
    await expect(progressRegion).toBeVisible();
    await expect(
      progressRegion.getByText("1/8", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => {
        const pctText = await progressRegion
          .getByText(/^\d+(?:\.\d)?%$/)
          .innerText();
        return parseFloat(pctText.replace("%", ""));
      })
      .toBeGreaterThan(0);
    const pctText = await progressRegion
      .getByText(/^\d+(?:\.\d)?%$/)
      .innerText();
    const pctValue = parseFloat(pctText.replace("%", ""));
    expect(pctValue).toBeLessThan(15);

    const segments = progressRegion.locator('[role="progressbar"] > div');
    await expect(segments).toHaveCount(8);

    const progressSave = page.waitForResponse(
      (res) =>
        res.url().includes("/api/reading/progress/") &&
        res.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Kembali" }).click();
    await progressSave;

    const exitDialog = page.getByRole("dialog", {
      name: "Ringkasan Sesi Baca",
    });
    const outcome = await Promise.race([
      page.waitForURL(/\/app/, { timeout: 8000 }).then(() => "nav" as const),
      exitDialog
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => "exit" as const),
    ]);
    if (outcome === "exit") {
      await exitDialog.getByRole("button", { name: "Lewati & Keluar" }).click();
      await expect(page).toHaveURL(/\/app/);
    }
    const cuplikanLabel = page.getByText(/^Cuplikan \d+(?:\.\d)?%$/).first();
    await expect(cuplikanLabel).toBeVisible();
    const homePct = parseFloat(
      (await cuplikanLabel.innerText())
        .replace("Cuplikan ", "")
        .replace("%", ""),
    );
    expect(homePct).toBeGreaterThan(0);
    expect(homePct).toBeLessThan(15);
  });

  test("supports Manila/Sepia/Malam themes, unboxed full-bleed Slide mode, centered toggle, Slide->Scroll sync, and no-drop resume", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("anzabook-preloader-v1", "1");
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUp(page.request, "Pembaca Tema & Sinkronisasi");

    const slug = "madilog-tan-malaka";
    await page.goto(`/read/${slug}`);
    await expect(page.locator("#chapter-sec-1")).toBeVisible();

    // Unboxed logo mark & Manila -> Sepia -> Malam theme switching
    const readerLogo = page
      .locator('header [data-brand-mark="anza-arch"]')
      .first();
    await expect(readerLogo).toBeVisible();
    expect(
      await readerLogo.evaluate((el) => getComputedStyle(el).borderTopWidth),
    ).toBe("0px");

    const themeWrapper = page.locator("[data-theme].bg-background");
    const manilaBg = await themeWrapper.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    await page
      .getByRole("button", { name: "Pengaturan Tipografi dan Tampilan" })
      .click();
    await page.getByRole("button", { name: "Sepia" }).click();
    const sepiaBg = await themeWrapper.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(sepiaBg).not.toBe(manilaBg);

    await page.getByRole("button", { name: "Malam" }).click();
    const nightBg = await themeWrapper.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(nightBg).not.toBe(sepiaBg);
    const [nr, ng, nb] = parseRgb(nightBg);
    expect(Math.max(nr, ng, nb)).toBeLessThan(90);

    await page.getByRole("button", { name: "Manila" }).click();
    await page.getByRole("button", { name: "Tutup" }).click();

    // Switch to Slide mode and verify full-bleed spread + centered toggle + per-leaf numbering
    const slideBtn = page.getByRole("button", { name: "Slide", exact: true });
    await slideBtn.click();
    const pageCounter = page.getByText(/^Page \d+ of \d+$/);
    await expect(pageCounter).toBeVisible();

    const bookBox = await page.locator(".reader-book").boundingBox();
    expect(bookBox).not.toBeNull();
    expect(bookBox!.x).toBeLessThanOrEqual(1);
    expect(bookBox!.y).toBeLessThanOrEqual(1);
    expect(bookBox!.width).toBeGreaterThanOrEqual(1276);

    // Centered Scroll|Slide toggle aligned to middle spine (~640px)
    const toggleBox = await slideBtn.locator("..").boundingBox();
    expect(toggleBox).not.toBeNull();
    const toggleCenterX = toggleBox!.x + toggleBox!.width / 2;
    expect(Math.abs(toggleCenterX - 640)).toBeLessThan(8);

    const leafNums = page.locator(".reader-spread-paper .reader-leaf-number");
    await expect(leafNums.nth(0)).toHaveText("1");
    await expect(leafNums.nth(1)).toHaveText("2");

    await page.getByRole("button", { name: "Halaman selanjutnya" }).click();
    await expect(pageCounter).toHaveText(/^Page 2 of \d+$/);
    await expect(leafNums.nth(0)).toHaveText("3");

    // Switching Slide -> Scroll keeps non-zero progress (never drops to 0%)
    await page.getByRole("button", { name: "Scroll", exact: true }).click();
    const scrollBarRegion = page.getByRole("region", {
      name: /Progres membaca chapter/i,
    });
    await expect(scrollBarRegion).toBeVisible();
    await expect
      .poll(async () => {
        const text = await scrollBarRegion
          .getByText(/^\d+(?:\.\d)?%$/)
          .innerText();
        return parseFloat(text.replace("%", ""));
      })
      .toBeGreaterThan(0);

    // Scroll deeper into chapter 2, exit, and verify Resume via Home does not drop progress backward
    const chapter2 = page.locator("#chapter-sec-2");
    await expect(chapter2).toBeVisible();
    const savePut = page.waitForResponse(
      (res) =>
        res.url().includes("/api/reading/progress/") &&
        res.request().method() === "PUT",
    );
    await chapter2.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.evaluate(() => window.scrollBy(0, 260));
    await savePut;

    await expect
      .poll(async () => {
        const text = await scrollBarRegion
          .getByText(/^\d+(?:\.\d)?%$/)
          .innerText();
        return parseFloat(text.replace("%", ""));
      })
      .toBeGreaterThan(5);

    const recordedText = await scrollBarRegion
      .getByText(/^\d+(?:\.\d)?%$/)
      .innerText();
    const recordedPct = parseFloat(recordedText.replace("%", ""));

    await page.getByRole("button", { name: "Kembali" }).click();
    const exitDialog = page.getByRole("dialog", {
      name: "Ringkasan Sesi Baca",
    });
    const exitOutcome = await Promise.race([
      page.waitForURL(/\/app/, { timeout: 8000 }).then(() => "nav" as const),
      exitDialog
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => "exit" as const),
    ]);
    if (exitOutcome === "exit") {
      await exitDialog.getByRole("button", { name: "Lewati & Keluar" }).click();
      await expect(page).toHaveURL(/\/app/);
    }

    await page
      .getByRole("region", { name: "Lanjutkan Membaca" })
      .locator('a[href^="/read/"]')
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/read/${slug}`));
    const resumedBar = page.getByRole("region", {
      name: /Progres membaca chapter/i,
    });
    await expect(resumedBar).toBeVisible();
    await expect
      .poll(async () => {
        const text = await resumedBar.getByText(/^\d+(?:\.\d)?%$/).innerText();
        return parseFloat(text.replace("%", ""));
      })
      .toBeGreaterThanOrEqual(Math.max(1, recordedPct - 1.5));
  });

  test("clicking an already-highlighted passage opens Highlights sidebar instead of immediately opening post composer", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("anzabook-preloader-v1", "1");
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUp(page.request, "Pembaca Stabilo E2E");

    const readRes = await page.request.get(
      `${API_URL}/api/books/madilog-tan-malaka/read?chapter=1`,
    );
    expect(readRes.ok()).toBeTruthy();
    const { data: readerData } = await readRes.json();
    const firstPara = String(readerData.currentChapter.contentId)
      .split(/\n\n+/)[0]
      .replace(/<[^>]*>/g, "")
      .trim();
    const snippet = firstPara.slice(0, 32).trim();
    expect(snippet.length).toBeGreaterThan(8);

    const createHl = await page.request.post(
      `${API_URL}/api/reading/highlights`,
      {
        headers,
        data: {
          bookId: readerData.book.id,
          chapterNumber: 1,
          pageNumber: 1,
          selectedText: snippet,
          color: "yellow",
        },
      },
    );
    expect(createHl.status()).toBe(201);

    await page.goto("/read/madilog-tan-malaka");
    const markEl = page.locator('mark[id^="highlight-"]').first();
    await expect(markEl).toBeVisible();
    await markEl.click();

    await expect(
      page.getByRole("heading", { name: /Highlights \(1\)/i }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: /Bagikan \/ Post/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("hides self follow in Explore and keeps Edit Profile banner above profile header form", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("anzabook-preloader-v1", "1");
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUp(page.request, "Pengguna Profil E2E");

    const meRes = await page.request.get(`${API_URL}/api/social/me`);
    expect(meRes.ok()).toBeTruthy();
    const { data: me } = await meRes.json();

    // Viewing own public profile shows neither Follow nor Sunting Profil button
    await page.goto(`/u/${me.username}`);
    await expect(
      page.getByRole("heading", { name: "Pengguna Profil E2E" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Ikuti$/ })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Sunting Profil/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /Sunting Profil/i }),
    ).toHaveCount(0);

    // Own dashboard profile exposes Sunting Profil -> inline edit view with zero banner overlap
    await page.goto("/app?tab=profile");
    const editBtn = page.getByRole("button", { name: /Sunting Profil/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    await expect(page).toHaveURL(
      /\/app\?.*tab=profile.*view=edit|\/profile\/edit/,
    );

    const heading = page.getByRole("heading", {
      name: /Foto & Header Profil/i,
    });
    await expect(heading).toBeVisible();
    const bannerPrompt = page.getByText(/Letakkan gambar header Anda di sini/i);
    await expect(bannerPrompt).toBeVisible();

    const bannerBox = await bannerPrompt.boundingBox();
    const headingBox = await heading.boundingBox();
    expect(bannerBox).not.toBeNull();
    expect(headingBox).not.toBeNull();
    expect(bannerBox!.y + bannerBox!.height).toBeLessThanOrEqual(headingBox!.y);
  });

  test("Book Detail places cover above title on mobile, keeps only Mulai Membaca as primary CTA, uses icon-only Save/Share, and emits zero runtime console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`console.error: ${msg.text()}`);
      }
    });
    page.on("response", (res) => {
      if (res.status() >= 400 && !res.url().includes("openstreetmap.org")) {
        errors.push(`http.${res.status()}: ${res.url()}`);
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/books/madilog-tan-malaka", { waitUntil: "networkidle" });

    const cover = page.locator("[data-book-cover]:visible").first();
    const titleHeading = page.getByRole("heading", {
      name: /Madilog/i,
      level: 1,
    });
    await expect(cover).toBeVisible();
    await expect(titleHeading).toBeVisible();

    const coverBox = await cover.boundingBox();
    const titleBox = await titleHeading.boundingBox();
    expect(coverBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(coverBox!.y + coverBox!.height).toBeLessThanOrEqual(titleBox!.y + 4);

    await expect(
      page.getByRole("link", { name: /Lihat Stok Buku Fisik/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Mulai Membaca/i }).first(),
    ).toBeVisible();

    const saveBtn = page.getByRole("button", { name: "Simpan ke Rak Baca" });
    const shareBtn = page.getByRole("button", { name: "Bagikan Buku" });
    await expect(saveBtn).toBeVisible();
    await expect(shareBtn).toBeVisible();
    expect((await saveBtn.innerText()).trim()).toBe("");
    expect((await shareBtn.innerText()).trim()).toBe("");

    await page.goto("/books/kecerdasan-sosial-homo-sapiens", {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("link", { name: /Lihat Stok Buku Fisik/i }),
    ).toHaveCount(0);

    // Check library & explore do not emit missing-param 404s or console errors
    await signUp(page.request, "Audit Clean User");
    await page.goto("/app?tab=library", { waitUntil: "networkidle" });
    await page.goto("/app?tab=explore", { waitUntil: "networkidle" });

    expect(errors).toEqual([]);
  });

  test("Studio editor avoids toolbar toggle overlap, has single header divider, live editable chapters, selectable components, and manual + auto page breaks", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("anzabook-preloader-v1", "1");
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    const writerEmail = await signUp(page.request, "Penulis Studio Editor E2E");
    const pool = new Pool({
      connectionString: process.env.STARTER_TEST_DATABASE_URL,
      max: 1,
    });
    try {
      await pool.query(
        `UPDATE "user" SET author_status = 'verified' WHERE email = $1`,
        [writerEmail],
      );
    } finally {
      await pool.end();
    }

    const draftRes = await page.request.post(
      `${API_URL}/api/publisher/manuscripts/drafts`,
      {
        headers,
        data: {
          title: "Naskah Uji Canvas Studio",
          synopsis: "Sinopsis pengujian editor canvas AnzaBook.",
        },
      },
    );
    expect(draftRes.status()).toBe(201);
    const draftJson = (await draftRes.json()) as { data: { id: string } };

    await page.goto(`/read/manuscript-${draftJson.data.id}`, {
      waitUntil: "networkidle",
    });

    // Switch into Edit mode if not active yet
    const editToggleBtn = page.getByRole("button", {
      name: /^Edit$/i,
    });
    await expect(editToggleBtn).toBeVisible();
    await editToggleBtn.click();

    // 1. Ensure Scroll|Slide and Preview|Edit toggles do NOT overlap
    const scrollBtn = page.getByRole("button", { name: /Scroll/i });
    const slideBtn = page.getByRole("button", { name: /Slide/i });
    const previewBtn = page.getByRole("button", { name: /Preview/i });
    await expect(scrollBtn).toBeVisible();
    await expect(previewBtn).toBeVisible();

    const scrollBox = await scrollBtn.boundingBox();
    const slideBox = await slideBtn.boundingBox();
    const previewBox = await previewBtn.boundingBox();
    expect(scrollBox).not.toBeNull();
    expect(slideBox).not.toBeNull();
    expect(previewBox).not.toBeNull();
    // Same row: horizontal end of Scroll|Slide group must not intrude on Preview button
    expect(slideBox!.x + slideBox!.width).toBeLessThanOrEqual(
      previewBox!.x + 1,
    );

    // 2. Single divider between ReaderBookHeader and Chapter 1, plus bottom divider on Chapter 1 title
    const headerBottom = page.locator("main header.border-b").first();
    await expect(headerBottom).toBeVisible();

    const chap1Break = page.locator(
      '[data-type="chapter-break"][data-chapter-number="1"]',
    );
    await expect(chap1Break).toBeVisible();
    const chap1Title = chap1Break.locator(".tiptap-chapter-title");
    await expect(chap1Title).toBeVisible();

    // Chapter 1 has ONLY 1 .h-px rule and it sits strictly BELOW the title (no top rule above CHAPTER 1)
    expect(await chap1Break.locator(".h-px").count()).toBe(1);
    const chap1TitleBox = await chap1Title.boundingBox();
    const chap1DividerBox = await chap1Break.locator(".h-px").boundingBox();
    expect(chap1TitleBox).not.toBeNull();
    expect(chap1DividerBox).not.toBeNull();
    expect(chap1DividerBox!.y).toBeGreaterThanOrEqual(
      chap1TitleBox!.y + chap1TitleBox!.height,
    );

    // 3. Chapter 1 title is live editable; Enter moves caret below divider into body paragraph
    await chap1Title.click({ clickCount: 3 });
    await page.keyboard.type("Judul Bab Pertama Live");
    await expect(chap1Title).toContainText("Judul Bab Pertama Live");

    await page.keyboard.press("Enter");
    await page.keyboard.type("Paragraf pertama setelah garis judul bab satu.");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Paragraf kedua punya jarak paragraf baru.");
    const canvasRoot = page.locator(".tiptap-editorial-canvas .ProseMirror");
    await expect(canvasRoot).toContainText(
      "Paragraf pertama setelah garis judul bab satu.",
    );
    await expect(canvasRoot).toContainText(
      "Paragraf kedua punya jarak paragraf baru.",
    );
    const p1 = canvasRoot.locator("> p", {
      hasText: "Paragraf pertama setelah garis judul bab satu.",
    });
    const p2 = canvasRoot.locator("> p", {
      hasText: "Paragraf kedua punya jarak paragraf baru.",
    });
    const p1Box = await p1.boundingBox();
    const p2Box = await p2.boundingBox();
    expect(p1Box).not.toBeNull();
    expect(p2Box).not.toBeNull();
    expect(p2Box!.y).toBeGreaterThanOrEqual(p1Box!.y + p1Box!.height + 12);
    // Body text must NOT end up inside .tiptap-chapter-title
    expect(await chap1Title.textContent()).not.toContain(
      "Paragraf pertama setelah garis judul bab satu.",
    );

    // 4. "+ Chapter Baru" places caret directly in the new chapter title with bottom divider line
    await page.getByRole("button", { name: "+ Chapter Baru" }).click();
    const chap2Break = page.locator(
      '[data-type="chapter-break"][data-chapter-number="2"]',
    );
    await expect(chap2Break).toBeVisible();
    const chap2Title = chap2Break.locator(".tiptap-chapter-title");
    const chap2TitleBox = await chap2Title.boundingBox();
    const chap2BottomDividerBox = await chap2Break
      .locator(".h-px")
      .last()
      .boundingBox();
    expect(chap2TitleBox).not.toBeNull();
    expect(chap2BottomDividerBox).not.toBeNull();
    expect(chap2BottomDividerBox!.y).toBeGreaterThanOrEqual(
      chap2TitleBox!.y + chap2TitleBox!.height,
    );

    await page.keyboard.type("Bab Dua Dari Kanvas");
    await expect(chap2Title).toContainText("Bab Dua Dari Kanvas");

    await page.keyboard.press("Enter");
    await page.keyboard.type("Paragraf awal bab dua.");
    await expect(chap2Title).not.toContainText("Paragraf awal bab dua.");

    // 5. Manual page break via Pemisah -> Pembatas Halaman AND verify component is selectable
    await page.getByRole("button", { name: /Pemisah/i }).click();
    await page.getByRole("button", { name: /Pembatas Halaman/i }).click();

    const firstPageBreak = page.locator('[data-type="page-break"]').first();
    await expect(firstPageBreak).toBeVisible();
    await firstPageBreak.click();
    await expect(firstPageBreak).toHaveClass(/ProseMirror-selectednode/);

    // 6. Auto-pagination on Enter once 1-page word limit (>= 250 words) is reached
    const canvasEditor = page.locator(".tiptap-editorial-canvas .ProseMirror");
    await canvasEditor.locator("p").last().click();
    const longPageBody = Array.from(
      { length: 260 },
      (_, idx) => `kata${idx + 1}`,
    ).join(" ");
    await page.keyboard.insertText(` ${longPageBody}`);
    await page.keyboard.press("Enter");

    await expect(page.locator('[data-type="page-break"]')).toHaveCount(2);

    // 7. Regression checks: clearing title to empty stays empty & template cover persists across save + reload
    const titleInput = page.getByLabel("Judul buku atau naskah");
    await titleInput.fill("Judul Sementara Uji Hapus");
    await expect(titleInput).toHaveValue("Judul Sementara Uji Hapus");
    await titleInput.fill("");
    await expect(titleInput).toHaveValue("");

    await page
      .getByRole("button", { name: "Pilih atau unggah sampul buku" })
      .click();
    const coverDialog = page.getByRole("dialog", {
      name: "Konfigurasi Sampul Buku",
    });
    await expect(coverDialog).toBeVisible();
    await coverDialog.getByRole("button", { name: "Emerald Tua" }).click();
    await coverDialog.getByRole("button", { name: "Selesai" }).click();
    await expect(coverDialog).toHaveCount(0);

    const savePatch = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/publisher/manuscripts/${draftJson.data.id}`) &&
        res.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Simpan" }).click();
    await savePatch;

    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Edit$/i }).click();
    await expect(page.getByLabel("Judul buku atau naskah")).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "Ganti Sampul" }),
    ).toBeVisible();
  });
});
