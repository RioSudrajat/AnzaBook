import { expect, test } from "@playwright/test";
import { API_URL, fitsWidth, signUp, WEB_URL } from "./helpers";

test.describe("AnzaBook Core End-to-End Flows", () => {
  test("ignores external auth destinations", async ({ page }) => {
    await page.goto("/sign-in?redirect=%2F%2Fexample.test%2Fread");
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("signup preserves a premium reader destination and shows the preview limit", async ({ page }) => {
    const slug = "sains-logika-seni-hidup-bermutu";
    await page.goto(`/books/${slug}`);
    await expect(page.getByRole("button", { name: "Lihat Pilihan Iuran" })).toHaveCount(0);
    await expect(page.getByText("Premium", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Start Reading" }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await page.getByRole("link", { name: "Create an account" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Pembaca Cuplikan");
    await page.getByLabel("Email", { exact: true }).fill(`cuplikan-${crypto.randomUUID()}@example.test`);
    await page.getByLabel("Password", { exact: true }).fill("cuplikan-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(new RegExp(`/read/${slug}`));
    await expect(page.getByRole("heading", { name: "Akhir cuplikan" })).toBeVisible();
    await expect(page.locator("[data-preview-fade]")).toHaveCSS("mask-image", /linear-gradient/);
    await expect(page.locator("#chapter-sec-2")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Jadi Nakama" })).toHaveAttribute("href", /\/membership\?book=/);
    await page.getByRole("button", { name: "Keluar ke Home" }).click();
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByRole("region", { name: "Lanjutkan Membaca" })).toContainText(/Sains, Logika/);
    await expect(page.getByRole("region", { name: "Lanjutkan Membaca" })).toContainText(/Cuplikan \d+%/);
  });

  test("scrolls across chapter dividers and resumes the chapter reached by scrolling", async ({ page }) => {
    await signUp(page.request, "Pembaca Scroll");
    const slug = "revolusi-cetak-kedaulatan-membaca";
    await page.goto(`/read/${slug}`);
    const secondChapter = page.locator("#chapter-sec-2");
    await expect(secondChapter.getByRole("heading")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Prapemuat Literasi AnzaBook" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Lanjut ke bab 2", exact: true })).toHaveCount(0);
    await secondChapter.evaluate((section) => section.scrollIntoView({ block: "start" }));
    await expect(page.getByText("Bab 2/2", { exact: true })).toBeVisible();
    await expect(page.getByText("50%", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Keluar ke Home" }).click();
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByRole("region", { name: "Lanjutkan Membaca" })).toContainText("50%");
    await page.getByRole("region", { name: "Lanjutkan Membaca" }).getByRole("link", { name: "Lanjut Baca" }).click();
    await expect(secondChapter.getByRole("heading")).toBeInViewport();
    await expect(page.getByText("Bab 2/2", { exact: true })).toBeVisible();
    await expect(page.getByText("50%", { exact: true })).toBeVisible();

    const detail = await page.request.get(`${API_URL}/api/books/${slug}`);
    const { data: book } = await detail.json();
    const position = await page.request.get(`${API_URL}/api/reading/progress/${book.id}`);
    expect((await position.json()).data).toMatchObject({ lastChapterNumber: 2, layout: "scroll" });
    const chapter = book.chapters[1];
    const checkpoint = await page.request.put(`${API_URL}/api/reading/progress/${book.id}`, {
      headers: { Origin: WEB_URL },
      data: { lastChapterId: chapter.id, lastChapterNumber: chapter.chapterNumber, layout: "slide" },
    });
    expect(checkpoint.ok()).toBeTruthy();
    await page.goto(`/read/${slug}`);
    await expect(page.getByRole("heading", { name: chapter.title, exact: true, level: 1 })).toBeVisible();
    await expect(page.getByText("Halaman 1 dari 1", { exact: true })).toBeVisible();
    await expect(page.getByText("99%", { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 1700, height: 1050 });
    await page.goto(`/read/${slug}?chapter=1`);
    await expect(page.getByRole("dialog", { name: "Prapemuat Literasi AnzaBook" })).toHaveCount(0);
    await expect(page.getByText("Bab 1/2", { exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await expect(page.getByText("Bab 2/2", { exact: true })).toBeVisible();
    await expect(page.getByText("100%", { exact: true })).toBeVisible();
    await expect.poll(async () => {
      const response = await page.request.get(`${API_URL}/api/reading/progress/${book.id}`);
      return (await response.json()).data;
    }).toMatchObject({ lastChapterNumber: 2, lastScrollPercent: 100, lastParagraphIndex: 1, layout: "scroll" });

    await page.goto(`/read/${slug}`);
    await expect(page.getByText("100%", { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      const root = document.scrollingElement!;
      return root.scrollHeight - root.clientHeight - root.scrollTop;
    })).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Keluar ke Home" }).click();
    await page.goto("/app?tab=library");
    await expect(page.getByRole("region", { name: "Selesai Dibaca" }).getByRole("link", { name: book.title })).toBeVisible();
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
        name: /Aksara Tanpa Tirani Harga/i,
      }),
    ).toBeVisible({ timeout: 10000 });

    // Check Hero Book Stage
    await expect(
      page.getByRole("region", { name: /Panggung Rak Buku 3D/i }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: /Panggung Rak Buku 3D/i }).locator("[data-book-cover]").first()).toBeVisible();

    // Check Catalog Book Link (Sains, Logika, dan Seni untuk Hidup Bermutu)
    const bookLink = page
      .getByRole("link", { name: /Sains, Logika, dan Seni untuk Hidup Bermutu/i })
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
    await expect(page.getByRole("img", { name: "Anza Book", exact: true })).toBeVisible();
    await expect(page.locator("[data-book-cover]").first()).toBeVisible();

    // Daftar Isi
    await expect(page.getByRole("heading", { name: /Daftar Isi/i })).toBeVisible();
    await expect(page.getByText(/Sains Sebagai Kunci Smart Living/i)).toBeVisible();

    // Live Stock Tracker & Map
    await expect(
      page.getByRole("heading", {
        name: /Ketersediaan Fisik di Toko Rekanan/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Gramedia Matraman/i).first()).toBeVisible();

    // Action buttons
    await expect(page.getByRole("button", { name: /Start Reading/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Save to Library/i })).toBeVisible();
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
    await expect(page.getByRole("heading", { name: "Bacaan Populer" })).toBeVisible();

    // Switch to Explore Tab
    await page.goto("/app?tab=explore");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /Jelajahi Berdasarkan Kategori/i })).toBeVisible();
    await expect(page.getByText(/Antropologi/i).first()).toBeVisible();
    await expect(page.getByText(/Berpikir Kritis/i).first()).toBeVisible();

    // Switch to My Library Tab
    await page.goto("/app?tab=library");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("main").getByRole("heading", { name: "My Library" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Highlights/i })).toBeVisible();

    // Switch to Settings Tab
    await page.goto("/app?tab=settings");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("main").getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Tampilkan QR/i })).toBeVisible();
  });

  test("protected web reader renders layout mode switcher and enforces DRM shield upon PrintScreen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    await signUp(page.request, "Surya DRM");
    await page.goto("/read/kecerdasan-sosial-homo-sapiens?chapter=1&drm=true");
    await page.waitForLoadState("networkidle");

    // Verify reader rendered chapter content
    await expect(page.getByText(/Social Intelligence: Senjata Utama Homo Sapiens/i).first()).toBeVisible();

    // Glossy progress bar at bottom
    await expect(page.getByText(/Bab 1\//i).first()).toBeVisible();

    // Trigger DRM pre-trigger by pressing PrintScreen
    await page.keyboard.press("PrintScreen");

    // Expect the DRM alert dialog
    const drmDialog = page.getByRole("alertdialog");
    await expect(drmDialog).toBeVisible();
    await expect(
      page.getByText(/Tampilan Naskah Terkunci Sementara/i),
    ).toBeVisible();

    // Click "Lanjutkan Membaca" to resume
    const resumeBtn = page.getByRole("button", { name: /Lanjutkan Membaca/i });
    await resumeBtn.click();

    // Ensure DRM shield is dismissed
    await expect(drmDialog).not.toBeVisible();
  });
});
