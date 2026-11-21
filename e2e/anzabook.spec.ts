import { expect, test } from "@playwright/test";
import { API_URL, fitsWidth, setRole, signUp, WEB_URL } from "./helpers";

test.describe("AnzaBook Core End-to-End Flows", () => {
  test("ignores external auth destinations", async ({ page }) => {
    await page.goto("/sign-in?redirect=%2F%2Fexample.test%2Fread");
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("signup preserves a premium reader destination and shows the preview limit", async ({
    page,
  }) => {
    const slug = "sains-logika-seni-hidup-bermutu";
    await page.goto(`/books/${slug}`);
    await expect(
      page.getByRole("button", { name: "Lihat Pilihan Iuran" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Premium", { exact: true }).first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mulai Membaca" })
      .locator(":visible")
      .first()
      .click();
    await expect(page).toHaveURL(/\/sign-in/);
    await page.getByRole("link", { name: "Create an account" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Pembaca Cuplikan");
    await page
      .getByLabel("Email", { exact: true })
      .fill(`cuplikan-${crypto.randomUUID()}@example.test`);
    await page
      .getByLabel("Password", { exact: true })
      .fill("cuplikan-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(new RegExp(`/read/${slug}`));
    await expect(
      page.getByRole("heading", { name: "Akhir cuplikan" }),
    ).toBeVisible();
    await expect(page.locator("[data-preview-fade]")).toHaveCSS(
      "mask-image",
      /linear-gradient/,
    );
    await expect(page.locator("#chapter-sec-2")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Jadi Nakama" }),
    ).toHaveAttribute("href", /\/membership\?book=/);
    await page.getByRole("button", { name: "Keluar ke Home" }).click();
    await expect(page).toHaveURL(/\/app/);
    await expect(
      page.getByRole("region", { name: "Lanjutkan Membaca" }),
    ).toContainText(/Sains, Logika/);
    await expect(
      page.getByRole("region", { name: "Lanjutkan Membaca" }),
    ).toContainText(/Cuplikan \d+%/);
  });

  test("scrolls across chapter dividers and resumes the chapter reached by scrolling", async ({
    page,
  }) => {
    await signUp(page.request, "Pembaca Scroll");
    const slug = "revolusi-cetak-kedaulatan-membaca";
    await page.goto(`/read/${slug}`);
    const secondChapter = page.locator("#chapter-sec-2");
    await expect(secondChapter.getByRole("heading")).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Prapemuat Literasi AnzaBook" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Lanjut ke bab 2", exact: true }),
    ).toHaveCount(0);
    await secondChapter.evaluate((section) =>
      section.scrollIntoView({ block: "start" }),
    );
    await expect(page.getByText("Bab 2/8", { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d+%$/)).toBeVisible();

    await page.getByRole("button", { name: "Keluar ke Home" }).click();
    await expect(page).toHaveURL(/\/app/);
    await expect(
      page.getByRole("region", { name: "Lanjutkan Membaca" }),
    ).toContainText(/\d+%/);
    await page
      .getByRole("region", { name: "Lanjutkan Membaca" })
      .getByRole("link", { name: "Lanjut" })
      .first()
      .click();
    await expect(secondChapter.getByRole("heading")).toBeInViewport();
    await expect(page.getByText("Bab 2/8", { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d+%$/)).toBeVisible();

    const detail = await page.request.get(`${API_URL}/api/books/${slug}`);
    const { data: book } = await detail.json();
    const position = await page.request.get(
      `${API_URL}/api/reading/progress/${book.id}`,
    );
    expect((await position.json()).data).toMatchObject({
      lastChapterNumber: 2,
      layout: "scroll",
    });
    const chapter = book.chapters[1];
    const checkpoint = await page.request.put(
      `${API_URL}/api/reading/progress/${book.id}`,
      {
        headers: { Origin: WEB_URL },
        data: {
          lastChapterId: chapter.id,
          lastChapterNumber: chapter.chapterNumber,
          layout: "slide",
        },
      },
    );
    expect(checkpoint.ok()).toBeTruthy();
    await page.goto(`/read/${slug}`);
    await expect(
      page.getByRole("heading", { name: chapter.title, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/Page \d+ of \d+/i)).toBeVisible();

    await page.setViewportSize({ width: 1700, height: 1050 });
    await page.goto(`/read/${slug}?chapter=1`);
    await expect(
      page.getByRole("dialog", { name: "Prapemuat Literasi AnzaBook" }),
    ).toHaveCount(0);
    await expect(page.getByText("Bab 1/8", { exact: true })).toBeVisible();
    // Bounded DRM-02 sliding window: initially [1, 2], later chapters not dumped upfront
    await expect(page.locator("#chapter-sec-8")).toHaveCount(0);
    await page
      .locator("#chapter-sec-2")
      .evaluate((section) => section.scrollIntoView({ block: "start" }));
    await expect(page.locator("#chapter-sec-3")).toBeAttached();

    // Jump to final chapter via TOC sidebar, then scroll to bottom for 100% completion
    await page
      .getByRole("navigation", { name: "Daftar Bab Naskah" })
      .getByRole("button")
      .nth(7)
      .click();
    await expect(page.locator("#chapter-sec-8")).toBeVisible();
    await page.evaluate(() =>
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      }),
    );
    await expect(page.getByText("Bab 8/8", { exact: true })).toBeVisible();
    await expect(page.getByText("100%", { exact: true })).toBeVisible();
    await expect
      .poll(async () => {
        const response = await page.request.get(
          `${API_URL}/api/reading/progress/${book.id}`,
        );
        return (await response.json()).data;
      })
      .toMatchObject({
        lastChapterNumber: 8,
        lastScrollPercent: 100,
        layout: "scroll",
      });

    await page.goto(`/read/${slug}`);
    await expect(page.getByText("100%", { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const root = document.scrollingElement!;
          return root.scrollHeight - root.clientHeight - root.scrollTop;
        }),
      )
      .toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Keluar ke Home" }).click();
    await page.goto("/app?tab=library");
    await expect(
      page
        .getByRole("region", { name: "Selesai Dibaca" })
        .getByText(book.title)
        .first(),
    ).toBeVisible();
  });

  test("homepage renders hero book shelf, weekly bulletin, and catalog with ratings and tiers", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check main hero headline
    await expect(
      page.getByRole("heading", {
        name: /Aksara Tanpa Penjara Pikiran/i,
      }),
    ).toBeVisible({ timeout: 10000 });

    // Check Hero Book Stage
    await expect(
      page.getByRole("region", { name: /Panggung Rak Buku 3D/i }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: /Panggung Rak Buku 3D/i })
        .locator("[data-book-cover]")
        .first(),
    ).toBeVisible();

    // Check Catalog Book Link (Sains, Logika, dan Seni untuk Hidup Bermutu)
    const bookLink = page
      .getByRole("link", {
        name: /Sains, Logika, dan Seni untuk Hidup Bermutu/i,
      })
      .first();
    await expect(bookLink).toBeVisible();

    // Ensure no horizontal overflow
    expect(await fitsWidth(page)).toBe(true);
  });

  test("book detail page displays author/editor avatars, interactive TOC, and live stock map", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/books/sains-logika-seni-hidup-bermutu");
    await page.waitForLoadState("networkidle");

    // Title and author
    await expect(
      page.getByRole("heading", {
        name: "Sains, Logika, dan Seni untuk Hidup Bermutu",
        level: 1,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Zenius/i).first()).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Anza Book", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("[data-book-cover]:visible").first(),
    ).toBeVisible();

    // Daftar Isi
    await expect(
      page.getByRole("heading", { name: /Daftar Isi/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Sains Sebagai Kunci Smart Living/i),
    ).toBeVisible();

    // Live Stock Tracker & Map
    await expect(
      page.getByRole("heading", {
        name: /Ketersediaan Fisik di Toko Rekanan/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Gramedia Matraman/i).first()).toBeVisible();

    // Action buttons
    await expect(
      page
        .getByRole("button", { name: /Mulai Membaca/i })
        .locator(":visible")
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("button", { name: /Save to Library/i })
        .locator(":visible")
        .first(),
    ).toBeVisible();
  });

  test("signed-in dashboard provides Home, Explore, Library, and Settings", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    await signUp(page.request, "Dewi Pembaca");
    await page.goto("/app?tab=home");
    await page.waitForLoadState("networkidle");

    // Check Home Tab Content
    await expect(page.getByText(/Buletin Mingguan/i).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Bacaan Populer" }),
    ).toBeVisible();

    // Switch to Explore Tab
    await page.goto("/app?tab=explore");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: "Semua Topik" }),
    ).toBeVisible();
    await expect(page.getByText(/Antropologi/i).first()).toBeVisible();
    await expect(page.getByText(/Berpikir Kritis/i).first()).toBeVisible();

    // Switch to My Library Tab
    await page.goto("/app?tab=library");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "Library", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Highlights/i }),
    ).toBeVisible();

    // Switch to Settings Tab
    await page.goto("/app?tab=settings");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "Settings", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Tampilkan QR/i }),
    ).toBeVisible();
  });

  test("protected web reader enforces production DRM ON without toggle, defends against capture/DevTools/DOM tampering, and logs high-risk events for Admin review", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    const readerEmail = await signUp(page.request, "Surya DRM");
    // Even if a user passes ?drm=false, production ignores it and enforces DRM ON
    await page.goto("/read/kecerdasan-sosial-homo-sapiens?chapter=1&drm=false");
    await page.waitForLoadState("networkidle");

    // Verify reader rendered chapter content
    await expect(
      page
        .getByText(/Social Intelligence: Senjata Utama Homo Sapiens/i)
        .first(),
    ).toBeVisible();

    // Production build removes the DRM ON/OFF toggle from the toolbar
    await expect(page.getByText(/DRM (ON|OFF)/i)).toHaveCount(0);

    // Reading canvas stays visually clean without obtrusive diagonal watermark overlays,
    // while keeping the opaque ANZ- session ID bound on the DRM root & steganography.
    await expect(page.getByTestId("drm-watermark-canvas")).toHaveCount(0);
    await expect(page.locator('[data-drm-watermark="true"]')).toHaveCount(0);
    const drmRoot = page.locator('[data-drm-protected="true"]');
    await expect(drmRoot).toBeAttached();
    const watermarkCode = await drmRoot.getAttribute("data-watermark-code");
    expect(watermarkCode).toMatch(/^ANZ-[A-F0-9]{12}$/);
    expect(watermarkCode).not.toContain("@");

    // Glossy progress bar at bottom
    await expect(page.getByText(/Bab 1\//i).first()).toBeVisible();

    // 1. Trigger DRM shield via PrintScreen (verifies synchronous curtain + alertdialog lock)
    await page.keyboard.press("PrintScreen");
    const drmCurtain = page.locator('[data-drm-curtain="true"]');
    await expect(drmCurtain).toHaveClass(/\bflex\b/);
    const drmDialog = page.getByRole("alertdialog");
    await expect(drmDialog).toBeVisible();
    await expect(
      page.getByText(/Tampilan Naskah Terkunci Sementara/i),
    ).toBeVisible();

    // Dismiss shield
    await page.getByRole("button", { name: /Lanjutkan Membaca/i }).click();
    await expect(drmDialog).not.toBeVisible();
    await expect(drmCurtain).toHaveClass(/\bhidden\b/);

    // 1b. Trigger DRM shield via Ctrl+Shift+S (Firefox / Edge Web Capture screenshot shortcut)
    await page.keyboard.press("Control+Shift+KeyS");
    await expect(drmCurtain).toHaveClass(/\bflex\b/);
    await expect(drmDialog).toBeVisible();
    await page.getByRole("button", { name: /Lanjutkan Membaca/i }).click();
    await expect(drmDialog).not.toBeVisible();

    // 2. Trigger DRM shield via DevTools shortcut (F12)
    await page.keyboard.press("F12");
    await expect(drmDialog).toBeVisible();
    await page.getByRole("button", { name: /Lanjutkan Membaca/i }).click();
    await expect(drmDialog).not.toBeVisible();

    // 3. Simulate DevTools DOM node deletion of DRM curtain guard -> MutationObserver recovers & locks
    await page.evaluate(() => {
      document.querySelector('[data-drm-curtain="true"]')?.remove();
    });
    await expect(drmDialog).toBeVisible();
    await expect(drmCurtain).toBeAttached();
    await page.getByRole("button", { name: /Lanjutkan Membaca/i }).click();
    await expect(drmDialog).not.toBeVisible();

    // 4. Admin can monitor high-risk triggers and trace the opaque ANZ- watermark ID
    await setRole(readerEmail, "admin");
    await page.goto("/admin?tab=drm-security");
    await expect(
      page.getByRole("heading", { name: "Monitor Keamanan DRM", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("HIGH RISK").first()).toBeVisible();
    await expect(page.getByText(watermarkCode!).first()).toBeVisible();

    // Use Watermark Session ID tracer
    await page.getByLabel("ID Sesi Watermark").fill(watermarkCode!);
    await page.getByRole("button", { name: /Lacak Sesi/i }).click();
    await expect(page.getByText(readerEmail).first()).toBeVisible();
  });

  test("extracts zero-width steganographic watermark, auto-suspends on 7 high-risk strikes, supports appeal & admin reinstatement, and re-bans on 7 more violations", async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    const readerEmail = await signUp(page.request, "Rama Striker E2E");
    const slug = "revolusi-cetak-kedaulatan-membaca";
    await page.goto(`/read/${slug}?chapter=1`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("drm-watermark-canvas")).toHaveCount(0);
    const drmRoot = page.locator('[data-drm-protected="true"]');
    await expect(drmRoot).toBeAttached();
    const watermarkCode = (await drmRoot.getAttribute("data-watermark-code"))!;
    expect(watermarkCode).toMatch(/^ANZ-[A-F0-9]{12}$/);

    // Verify zero-width steganography fingerprint is embedded in DOM paragraph text
    const leakedProse = await page
      .locator("#chapter-sec-1 p")
      .first()
      .innerText();
    expect(/(?:\u200B|\u200C|\u200D|\u2060|\u2063)/.test(leakedProse)).toBe(
      true,
    );

    const triggerSevenHighRiskStrikes = async () => {
      const keyboardShortcuts = [
        "PrintScreen",
        "Control+Shift+KeyS",
        "F12",
        "Control+KeyU",
        "Control+KeyP",
        "Control+KeyS",
      ];
      for (const shortcut of keyboardShortcuts) {
        const postDone = page.waitForResponse(
          (res) =>
            res.url().includes("/api/reading/drm-events") &&
            res.request().method() === "POST",
        );
        await page.keyboard.press(shortcut);
        await postDone;
        await expect(page.getByRole("alertdialog")).toBeVisible();
        await page.getByRole("button", { name: /Lanjutkan Membaca/i }).click();
        await expect(page.getByRole("alertdialog")).not.toBeVisible();
      }

      // 7th distinct high-risk strike via DevTools DOM removal
      const strike7Done = page.waitForResponse(
        (res) =>
          res.url().includes("/api/reading/drm-events") &&
          res.request().method() === "POST",
      );
      await page.evaluate(() => {
        document.querySelector('[data-drm-curtain="true"]')?.remove();
      });
      await strike7Done;
    };

    // 1. Cycle 1: 7 high-risk strikes trigger immediate auto-suspend in E-Reader
    await triggerSevenHighRiskStrikes();
    await expect(
      page.getByRole("heading", { name: "Akses E-Reader Dibekukan Sementara" }),
    ).toBeVisible();
    await expect(page.getByText(/siklus ke-1/i)).toBeVisible();

    // Reloading confirms backend GET /read enforces 403 READER_SUSPENDED
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Akses E-Reader Dibekukan Sementara" }),
    ).toBeVisible();

    // 2. Reader submits appeal for Admin review
    await page
      .getByLabel("Alasan Peninjauan Akses")
      .fill(
        "Pintasan kepencet tidak sengaja saat bekerja, mohon tinjau ulang akses membaca saya.",
      );
    await page.getByRole("button", { name: "Ajukan Peninjauan Akses" }).click();
    await expect(
      page.getByText("Permintaan Peninjauan Terkirim"),
    ).toBeVisible();

    // 3. Separate Admin context verifies Stego Decoder & approves reinstatement
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await adminPage.setViewportSize({ width: 1280, height: 800 });
    const adminEmail = await signUp(adminPage.request, "Admin Appeal Reviewer");
    await setRole(adminEmail, "admin");

    await adminPage.goto("/admin?tab=drm-security");
    await expect(
      adminPage.getByRole("heading", {
        name: "Monitor Keamanan DRM",
        level: 1,
      }),
    ).toBeVisible();

    // Test Opsi B steganography decoder directly with the leaked paragraph string
    await adminPage
      .getByLabel("Tempel Teks Bocoran Steganografi")
      .fill(leakedProse);
    await adminPage
      .getByRole("button", { name: "Ekstrak ID Watermark" })
      .click();
    await expect(
      adminPage.getByText(`Sidik jari terungkap: ${watermarkCode}`),
    ).toBeVisible();
    await expect(adminPage.getByText(readerEmail).first()).toBeVisible();

    // Approve reader appeal in Suspensions queue
    const reviewNoteInput = adminPage.getByLabel(
      `Catatan tinjauan untuk ${readerEmail}`,
    );
    await reviewNoteInput.fill(
      "Akses dipulihkan untuk pengetesan siklus ke-2.",
    );
    await adminPage
      .getByRole("button", { name: "Pulihkan Akses Baca" })
      .first()
      .click();
    await expect(adminPage.getByText("Dipulihkan").first()).toBeVisible();
    await adminContext.close();

    // 4. Reader verifies access is restored, then commits 7 MORE strikes -> Cycle 2 re-ban!
    await page.getByRole("button", { name: "Periksa Status Akses" }).click();
    await expect(page.locator("#chapter-sec-1")).toBeVisible();
    await expect(
      page.getByText(/Anatomi Buku Mahal di Negeri Kepulauan/i).first(),
    ).toBeVisible();

    await triggerSevenHighRiskStrikes();
    await expect(
      page.getByRole("heading", { name: "Akses E-Reader Dibekukan Sementara" }),
    ).toBeVisible();
    await expect(page.getByText(/siklus ke-2/i)).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Akses E-Reader Dibekukan Sementara" }),
    ).toBeVisible();
  });
});
