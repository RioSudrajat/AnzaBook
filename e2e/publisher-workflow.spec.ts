import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { API_URL, fitsWidth, headers, setRole, signUp } from "./helpers";

const SCREENSHOT_DIR = process.env.CAPTURE_SCREENSHOT_DIR;

// Minimal valid 1x1 PNG binary for real `/api/media/upload-image` E2E upload.
const TEST_COVER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function maybeCapture(
  page: Page,
  filename: string,
  options?: { fullPage?: boolean },
) {
  if (!SCREENSHOT_DIR) return;
  const skipSplash = page.getByRole("button", { name: /LEWATI/i });
  if (await skipSplash.isVisible().catch(() => false)) {
    await skipSplash.click().catch(() => {});
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(200);
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: options?.fullPage ?? false,
  });
}

test.describe("Publisher Studio, Dual Submission Flow, and Admin Cleanup (Issue #10)", () => {
  test("admin CMS removes manuscript curation tab while retaining claim batches", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const adminEmail = await signUp(page.request, "Admin Publisher Check");
    await setRole(adminEmail, "admin");

    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("button", { name: /Penulis & Penerbit/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Kode Klaim Phygital/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Kurasi Naskah/i }),
    ).toHaveCount(0);

    await page.goto("/admin?tab=manuscripts");
    await expect(
      page.getByRole("heading", { name: /Editor & Kurasi Naskah Masuk/i }),
    ).toHaveCount(0);
  });

  test("guards publisher studio from outsiders and supports Path 1 + Path 2 manuscript submission", async ({
    browser,
  }) => {
    const suffix = randomUUID().slice(0, 8);
    const publisherSlug = `penerbit-uji-${suffix}`;
    const publisherName = `Penerbit Uji ${suffix}`;

    // 1. Owner registers a publisher and Admin approves it via existing API endpoints
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await ownerPage.setViewportSize({ width: 1280, height: 800 });
    await signUp(ownerPage.request, "Pemilik Penerbit");

    const applyRes = await ownerPage.request.post(
      `${API_URL}/api/publisher/apply`,
      {
        headers,
        data: {
          name: publisherName,
          slug: publisherSlug,
          city: "Yogyakarta",
          description: "Penerbit uji untuk alur kerja studio redaksi.",
          topics: ["Sastra & Fiksi", "Filsafat & Pemikiran"],
          isAcceptingSubmissions: true,
          submissionGuidelines:
            "Kirimkan sinopsis utuh minimal 10 karakter dan bab pembuka.",
        },
      },
    );
    expect(applyRes.status()).toBe(201);
    const applyJson = (await applyRes.json()) as { data: { id: string } };
    const publisherId = applyJson.data.id;

    const adminContext = await browser.newContext();
    const adminEmail = await signUp(adminContext.request, "Admin Verifikator");
    await setRole(adminEmail, "admin");
    const verifyRes = await adminContext.request.patch(
      `${API_URL}/api/admin/publishers/${encodeURIComponent(publisherId)}/verify`,
      {
        headers,
        data: { status: "verified" },
      },
    );
    expect(verifyRes.status()).toBe(200);
    await adminContext.close();

    // 2. Non-member author checks Studio access guard and Path 1 public CTA banner
    const authorContext = await browser.newContext();
    const authorPage = await authorContext.newPage();
    await authorPage.setViewportSize({ width: 1280, height: 800 });
    await signUp(authorPage.request, "Penulis Uji");

    await authorPage.goto(`/p/${publisherSlug}/studio`);
    await expect(
      authorPage.getByRole("heading", {
        name: "Akses Studio Redaksi Dibatasi",
      }),
    ).toBeVisible();
    await expect(authorPage.getByRole("tab")).toHaveCount(0);

    await authorPage.goto(`/p/${publisherSlug}`);
    await expect(
      authorPage.getByRole("heading", {
        name: new RegExp(`Kirim Naskah ke Redaksi ${publisherName}`, "i"),
      }),
    ).toBeVisible();
    await expect(
      authorPage.getByRole("tab", { name: /Inbox Naskah/i }),
    ).toHaveCount(0);

    // 3. Author clicks "Tulis Draf Baru" (Path 1) and opens Path 2 searchable picker
    await authorPage.getByRole("button", { name: "Tulis Draf Baru" }).click();
    await expect(authorPage).toHaveURL(/\/read\/manuscript-/);
    await expect(
      authorPage.getByRole("button", { name: "Ajukan Naskah" }),
    ).toBeVisible();

    await authorPage.getByRole("button", { name: "Ajukan Naskah" }).click();
    const configDialog = authorPage.locator("dialog[open]");
    await expect(configDialog).toBeVisible();

    const searchInput = configDialog.locator("#publisher-target-search");
    await expect(searchInput).toBeVisible();
    await searchInput.fill(publisherName);

    const targetRadio = configDialog.getByRole("radio", {
      name: new RegExp(publisherName, "i"),
    });
    await expect(targetRadio).toBeVisible();
    await targetRadio.click();

    await configDialog
      .getByLabel("Judul Naskah", { exact: true })
      .fill(`Naskah E2E ${suffix}`);
    await configDialog
      .getByLabel(/Sinopsis Naskah/i)
      .fill("Sinopsis lengkap naskah pengujian end-to-end untuk redaksi.");

    await configDialog
      .getByRole("button", { name: /Kirim Naskah ke Penerbit/i })
      .click();
    await expect(authorPage).toHaveURL(/\/app/);
    await authorContext.close();

    // 4. Publisher owner opens Dedicated Studio and verifies all 4 tabs & incoming manuscript
    await ownerPage.goto(`/p/${publisherSlug}/studio`);
    await expect(
      ownerPage.getByRole("heading", { name: publisherName, exact: true }),
    ).toBeVisible();
    expect(await fitsWidth(ownerPage)).toBe(true);

    const inboxTab = ownerPage.getByRole("tab", { name: /Inbox Naskah/i });
    const catalogTab = ownerPage.getByRole("tab", { name: /Katalog Terbit/i });
    const teamTab = ownerPage.getByRole("tab", { name: /Tim & Penulis/i });
    const profileTab = ownerPage.getByRole("tab", {
      name: /Profil & Topik Kurasi/i,
    });

    await expect(inboxTab).toBeVisible();
    await expect(catalogTab).toBeVisible();
    await expect(teamTab).toBeVisible();
    await expect(profileTab).toBeVisible();

    await expect(ownerPage.getByText(`Naskah E2E ${suffix}`)).toBeVisible();
    await expect(
      ownerPage.getByRole("button", { name: /Buka Editor Naskah/i }),
    ).toBeVisible();

    await catalogTab.click();
    await expect(catalogTab).toHaveAttribute("aria-selected", "true");

    await teamTab.click();
    await expect(teamTab).toHaveAttribute("aria-selected", "true");

    await profileTab.click();
    await expect(profileTab).toHaveAttribute("aria-selected", "true");
    await expect(
      ownerPage.getByLabel("Menerima Pengajuan Naskah Baru"),
    ).toBeVisible();

    await ownerContext.close();
  });

  test("Phase 1 workflow: approved writers priority submission, withdraw, image upload, publish metadata, store inventory, and role-gated queries", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const suffix = randomUUID().slice(0, 8);
    const publisherSlug = `penerbit-fase1-${suffix}`;
    const publisherName = `Penerbit Fase Satu ${suffix}`;

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await ownerPage.setViewportSize({ width: 1280, height: 800 });
    await ownerPage.emulateMedia({ reducedMotion: "reduce" });
    await signUp(ownerPage.request, "Pemilik Fase Satu");

    const applyRes = await ownerPage.request.post(
      `${API_URL}/api/publisher/apply`,
      {
        headers,
        data: {
          name: publisherName,
          slug: publisherSlug,
          city: "Bandung",
          description: "Penerbit sastra dan filsafat independen.",
          topics: ["Sastra & Fiksi", "Filsafat & Pemikiran"],
          isAcceptingSubmissions: false,
          submissionGuidelines:
            "Terbuka khusus penulis rekanan saat jeda kurasi publik.",
        },
      },
    );
    expect(applyRes.status()).toBe(201);
    const { id: publisherId } = (
      (await applyRes.json()) as {
        data: { id: string };
      }
    ).data;

    // Verify publisher via Admin
    const adminContext = await browser.newContext();
    const adminEmail = await signUp(adminContext.request, "Admin Verifikator");
    await setRole(adminEmail, "admin");
    const verifyRes = await adminContext.request.patch(
      `${API_URL}/api/admin/publishers/${encodeURIComponent(publisherId)}/verify`,
      {
        headers,
        data: { status: "verified" },
      },
    );
    expect(verifyRes.status()).toBe(200);
    await adminContext.close();

    // Create an Editor account and Approved Writer account
    const editorContext = await browser.newContext();
    const editorPage = await editorContext.newPage();
    await editorPage.setViewportSize({ width: 1280, height: 800 });
    await editorPage.emulateMedia({ reducedMotion: "reduce" });
    const editorEmail = await signUp(editorPage.request, "Editor Fase Satu");

    const writerContext = await browser.newContext();
    const writerPage = await writerContext.newPage();
    await writerPage.setViewportSize({ width: 1280, height: 800 });
    await writerPage.emulateMedia({ reducedMotion: "reduce" });
    const writerEmail = await signUp(writerPage.request, "Penulis Rekanan E2E");

    // Owner invites Editor via API then opens Studio Tab Tim & Penulis to add Approved Writer in UI
    const addEditorRes = await ownerPage.request.post(
      `${API_URL}/api/publisher/${publisherSlug}/members`,
      {
        headers,
        data: { email: editorEmail, role: "editor" },
      },
    );
    expect(addEditorRes.status()).toBe(201);

    await ownerPage.goto(`/p/${publisherSlug}/studio?tab=team`);
    await expect(
      ownerPage.getByRole("heading", { name: publisherName, exact: true }),
    ).toBeVisible();

    await ownerPage.locator("#approved-writer-identifier").fill(writerEmail);
    await ownerPage
      .getByRole("button", { name: "Tambah Penulis", exact: true })
      .click();
    await expect(
      ownerPage.getByText(/Penulis rekanan .* berhasil ditambahkan/i),
    ).toBeVisible();
    await expect(
      ownerPage.getByText("Penulis Rekanan E2E").first(),
    ).toBeVisible();
    await ownerPage.evaluate(() => window.scrollTo(0, 0));
    await maybeCapture(
      ownerPage,
      "01-studio-team-approved-writers-desktop.png",
    );

    // Verify Editor role triggers ZERO 403 background requests when opening Studio
    const editorForbiddenUrls: string[] = [];
    editorPage.on("response", (res) => {
      if (res.status() === 403) editorForbiddenUrls.push(res.url());
    });
    await editorPage.goto(`/p/${publisherSlug}/studio`);
    await editorPage.waitForLoadState("networkidle");
    expect(editorForbiddenUrls).toEqual([]);
    await editorContext.close();

    // Approved Writer visits public /p/$slug -> sees Jalur Prioritas CTA & Penulis Rekanan showcase
    await writerPage.goto(`/p/${publisherSlug}`);
    await expect(
      writerPage.getByText("Jalur Prioritas Penulis Rekanan"),
    ).toBeVisible();
    await maybeCapture(writerPage, "02-public-publisher-priority-desktop.png");

    await writerPage.getByRole("tab", { name: /Tentang & Ketentuan/i }).click();
    await expect(
      writerPage.getByRole("heading", { name: /Penulis Rekanan/i }),
    ).toBeVisible();
    await expect(
      writerPage
        .getByRole("tabpanel", { name: /Tentang & Ketentuan/i })
        .getByText("Penulis Rekanan E2E"),
    ).toBeVisible();

    // Submit manuscript via Path 1 + inline synopsis + ManuscriptConfigDialog
    await writerPage.getByRole("button", { name: "Tulis Draf Baru" }).click();
    await expect(writerPage).toHaveURL(/\/read\/manuscript-/);
    await expect(writerPage.getByText(/\b\d+\s+chapters?\b/i)).toHaveCount(0);

    const longSynopsis =
      "Sinopsis lengkap karya sastra dwibahasa untuk pengujian jalur prioritas.\n\nParagraf kedua mengenai sejarah panjang literasi Nusantara dari masa ke masa yang ditulis secara mendalam untuk menguji pemotongan pratinjau otomatis pada halaman baca.\n\nParagraf ketiga mengulas peran penting pembaca, penyunting, dan komunitas buku dalam merawat naskah berkualitas.";
    const inlineSynopsis = writerPage.getByLabel("Sinopsis buku");
    await expect(inlineSynopsis).toBeVisible();
    await inlineSynopsis.fill(longSynopsis);
    await expect(
      writerPage.getByText(/\d+\s*\/\s*5000 karakter/),
    ).toBeVisible();
    await maybeCapture(writerPage, "02b-editor-inline-synopsis-desktop.png");

    await writerPage.getByRole("button", { name: "Ajukan Naskah" }).click();

    const configDialog = writerPage.locator("dialog[open]");
    await expect(configDialog).toBeVisible();
    const bookTitle = `Naskah Dwibahasa ${suffix}`;
    await configDialog
      .getByLabel("Judul Naskah", { exact: true })
      .fill(bookTitle);
    await configDialog
      .getByRole("radio", { name: /Nakama & Beli Satuan/i })
      .click();
    await configDialog
      .getByLabel("Usulan Harga Beli Satuan Digital (IDR)")
      .fill("52000");
    await configDialog.getByLabel(/Sinopsis Naskah/i).fill(longSynopsis);

    await configDialog
      .locator("summary", { hasText: /Pengaturan Lanjutan/i })
      .click();
    await configDialog.getByLabel("Bahasa Utama Naskah").selectOption("en");
    await configDialog
      .getByLabel("Target Pembaca")
      .selectOption("mature_academic");
    await configDialog
      .getByLabel("ISBN (Opsional)")
      .fill(`978-602-${suffix.slice(0, 4)}`);
    await configDialog
      .getByLabel(/Catatan Pengantar untuk Redaksi/i)
      .fill("Siap didiskusikan bersama editor bahasa.");

    const targetRadio = configDialog.getByRole("radio", {
      name: new RegExp(publisherName, "i"),
    });
    await expect(targetRadio).toBeVisible();
    await targetRadio.click();

    await configDialog
      .getByRole("button", { name: /Kirim Naskah ke Penerbit/i })
      .click();
    await expect(writerPage).toHaveURL(/\/app/);

    // Test "Tarik Kembali" (withdraw) on Studio Penulis tab, then resubmit
    const studioPenulisBtn = writerPage
      .getByRole("tab", {
        name: /Studio Penulis/i,
      })
      .first();
    await expect(studioPenulisBtn).toBeVisible();
    await studioPenulisBtn.click();
    const withdrawBtn = writerPage
      .getByRole("button", { name: /Tarik Kembali/i })
      .first();
    await expect(withdrawBtn).toBeVisible();
    await withdrawBtn.click();
    await expect(
      writerPage.getByText(/Naskah berhasil ditarik kembali ke draf/i),
    ).toBeVisible();

    await writerPage
      .getByRole("button", { name: /Lanjutkan Menulis/i })
      .first()
      .click();
    await expect(writerPage).toHaveURL(/\/read\/manuscript-/);
    await writerPage.getByRole("button", { name: "Ajukan Naskah" }).click();
    const resubmitDialog = writerPage.locator("dialog[open]");
    await expect(resubmitDialog).toBeVisible();
    await resubmitDialog
      .getByRole("button", { name: /Kirim Naskah ke Penerbit/i })
      .click();
    await expect(writerPage).toHaveURL(/\/app/);
    await writerContext.close();

    // Owner checks Studio Inbox -> sees Penulis Rekanan badge & author notes
    await ownerPage.goto(`/p/${publisherSlug}/studio?tab=inbox`);
    await expect(ownerPage.getByText(bookTitle)).toBeVisible();
    await expect(
      ownerPage
        .getByRole("tabpanel", { name: /Inbox Naskah/i })
        .getByText("Penulis Rekanan", { exact: true }),
    ).toBeVisible();
    await expect(ownerPage.getByText(/Bahasa Inggris/i)).toBeVisible();
    await maybeCapture(
      ownerPage,
      "03-studio-inbox-approved-writer-desktop.png",
    );

    await ownerPage
      .getByRole("button", { name: /Buka Editor Naskah/i })
      .first()
      .click();
    await expect(ownerPage).toHaveURL(/\/read\/manuscript-/);

    // Check Preview mode truncated synopsis & "Lihat selengkapnya" toggle
    const editUrl = new URL(ownerPage.url());
    await ownerPage.goto(
      `${editUrl.pathname}?editorial=preview&publisherSlug=${publisherSlug}`,
    );
    await ownerPage.waitForLoadState("networkidle");
    const expandSynopsisBtn = ownerPage.getByRole("button", {
      name: /Lihat selengkapnya/i,
    });
    await expect(expandSynopsisBtn).toBeVisible();
    await maybeCapture(ownerPage, "02c-preview-synopsis-toggle-desktop.png");
    await expandSynopsisBtn.click();
    await expect(
      ownerPage.getByRole("button", { name: /Ringkas/i }),
    ).toBeVisible();
    await ownerPage.goto(editUrl.toString());
    await ownerPage.waitForLoadState("networkidle");

    await ownerPage
      .getByRole("button", { name: "Setujui & Terbitkan", exact: true })
      .click();
    const publishDialog = ownerPage.locator("dialog[open]");
    await expect(publishDialog).toBeVisible();

    // Upload real PNG cover inside PublishManuscriptDialog -> hits /api/media/upload-image
    const fileInput = publishDialog.locator('input[type="file"]');
    const uploadPromise = ownerPage.waitForResponse(
      (res) =>
        res.url().includes("/api/media/upload-image") &&
        res.request().method() === "POST",
    );
    await fileInput.setInputFiles({
      name: "test-cover.png",
      mimeType: "image/png",
      buffer: TEST_COVER_PNG,
    });
    const uploadResp = await uploadPromise;
    expect(uploadResp.status()).toBe(201);
    await expect(publishDialog.locator("#publish-cover-url")).toHaveValue(
      /\/api\/media\/images\/.+\.png$/,
    );

    // Fill collapsible bibliography & progressive translation disclosure
    await publishDialog.getByText(/Metadata Bibliografi/i).click();
    await publishDialog.locator("#publish-is-translation").check();
    await publishDialog
      .locator("#publish-orig-title")
      .fill("The Bilingual Essay");
    await publishDialog.locator("#publish-translator").fill("Siti Bahasa");
    await publishDialog
      .locator("#publish-collection")
      .fill("Seri Pustaka Baru");
    await maybeCapture(ownerPage, "04-publish-dialog-desktop.png");

    await publishDialog
      .getByRole("button", { name: "Terbitkan Sekarang" })
      .click();
    await expect(
      publishDialog.getByText("Buku Resmi Diterbitkan"),
    ).toBeVisible();

    // Navigate to Studio Catalog -> inspect Stok Toko dialog & capture
    await publishDialog
      .getByRole("link", { name: "Lihat di Studio Penerbit" })
      .click();
    await expect(ownerPage).toHaveURL(new RegExp(`/p/${publisherSlug}/studio`));
    await expect(
      ownerPage.getByRole("heading", { name: bookTitle, level: 2 }),
    ).toBeVisible();
    await maybeCapture(ownerPage, "05-studio-catalog-desktop.png");

    // Ensure catalog seed populates partner store branches
    await ownerPage.request.get(`${API_URL}/api/books?limit=1`);

    const stockBtn = ownerPage
      .getByRole("button", { name: /Stok Toko/i })
      .first();
    await expect(stockBtn).toBeVisible();
    await stockBtn.click();
    const invDialog = ownerPage.locator("dialog[open]");
    await expect(invDialog).toBeVisible();
    await expect(
      invDialog.getByText("Stok Buku Cetak di Toko Mitra"),
    ).toBeVisible();
    const rakyatInput = invDialog.getByLabel("Stok Edisi Rakyat").first();
    await expect(rakyatInput).toBeVisible();
    await rakyatInput.fill("15");
    await invDialog.getByLabel("Stok Edisi Standar").first().fill("7");
    await invDialog.getByRole("button", { name: "Simpan Stok" }).click();
    await expect(
      invDialog.getByText(
        /Stok buku fisik di seluruh cabang berhasil diperbarui/i,
      ),
    ).toBeVisible();
    await maybeCapture(ownerPage, "06-studio-inventory-dialog-desktop.png");
    await invDialog.getByRole("button", { name: "Tutup", exact: true }).click();

    // Verify published book page renders uploaded cover, metadata, bibliography, stock, and zero legacy distribution text
    await ownerPage.getByRole("link", { name: "Halaman Buku" }).first().click();
    await expect(ownerPage).toHaveURL(/\/books\//);
    const bookDetailPath = new URL(ownerPage.url()).pathname;
    await expect(
      ownerPage.getByRole("heading", { name: bookTitle, level: 1 }),
    ).toBeVisible();
    await expect(
      ownerPage.locator('img[src*="/api/media/images/"]:visible').first(),
    ).toBeVisible();
    await expect(ownerPage.getByText("Premium", { exact: true })).toBeVisible();
    await expect(ownerPage.getByText("The Bilingual Essay")).toBeVisible();
    await expect(ownerPage.getByText("Siti Bahasa")).toBeVisible();
    await expect(ownerPage.getByText("Seri Pustaka Baru")).toBeVisible();
    await expect(
      ownerPage.getByRole("button", { name: /Beli Akses Digital/i }).first(),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole("heading", {
        name: /Ketersediaan Fisik di Toko Rekanan/i,
      }),
    ).toBeVisible();

    const bodyText = await ownerPage.locator("body").innerText();
    expect(bodyText.toLowerCase()).not.toContain(["ala", "carte"].join(""));
    expect(bodyText.toLowerCase()).not.toContain(
      ["a", "la", "carte"].join(" "),
    );
    expect(await fitsWidth(ownerPage)).toBe(true);
    await maybeCapture(ownerPage, "07-book-detail-desktop.png");

    // Unified profile & explore checks (Desktop)
    await ownerPage.goto("/app?tab=profile");
    await ownerPage.waitForLoadState("networkidle");
    await expect(
      ownerPage.getByRole("button", { name: /Sunting Profil/i }),
    ).toBeVisible();
    expect(await fitsWidth(ownerPage)).toBe(true);
    await maybeCapture(ownerPage, "00-user-profile-desktop.png");

    await ownerPage.goto("/app?tab=explore");
    await ownerPage.waitForLoadState("networkidle");
    expect(await fitsWidth(ownerPage)).toBe(true);
    await maybeCapture(ownerPage, "00c-explore-desktop.png");

    // Seed and verify Community Profile + inline Pengaturan Profil tab
    const communitySlug = `komunitas-uji-${suffix}`;
    const calRes = await ownerPage.request.post(
      `${API_URL}/api/events/calendars`,
      {
        headers,
        data: {
          name: `Komunitas E2E ${suffix}`,
          slug: communitySlug,
          type: "community",
          description:
            "Komunitas pembaca untuk verifikasi profil terpadu AnzaBook.",
          city: "Yogyakarta",
        },
      },
    );
    expect(calRes.status()).toBe(201);

    await ownerPage.goto(`/c/${communitySlug}`);
    await ownerPage.waitForLoadState("networkidle");
    expect(await fitsWidth(ownerPage)).toBe(true);
    await maybeCapture(ownerPage, "00d-community-desktop.png");

    // Inline community settings tab (zero modal dialog)
    await ownerPage.getByRole("tab", { name: /Pengaturan Profil/i }).click();
    await expect(ownerPage.locator("dialog[open]")).toHaveCount(0);
    await expect(
      ownerPage.getByRole("button", { name: /Simpan Pengaturan Komunitas/i }),
    ).toBeVisible();

    // Mobile responsive check (390x844) across unified profiles, book detail, & studio
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await ownerPage.waitForTimeout(150);
    expect(await fitsWidth(ownerPage)).toBe(true);
    await maybeCapture(ownerPage, "00e-community-mobile.png");

    await ownerPage.goto("/app?tab=profile");
    await ownerPage.waitForLoadState("networkidle");
    expect(await fitsWidth(ownerPage)).toBe(true);
    await maybeCapture(ownerPage, "00b-user-profile-mobile.png");

    await ownerPage.goto(`/p/${publisherSlug}/studio?tab=inbox`);
    await ownerPage.waitForLoadState("networkidle");
    expect(await fitsWidth(ownerPage)).toBe(true);
    await maybeCapture(ownerPage, "09-studio-inbox-mobile.png");

    await ownerPage.goto(`/p/${publisherSlug}`);
    await ownerPage.waitForLoadState("networkidle");
    expect(await fitsWidth(ownerPage)).toBe(true);
    await maybeCapture(ownerPage, "10-public-publisher-mobile.png");

    await ownerPage.goto(bookDetailPath);
    await ownerPage.waitForLoadState("networkidle");
    expect(await fitsWidth(ownerPage)).toBe(true);
    await maybeCapture(ownerPage, "08-book-detail-mobile.png");

    await ownerContext.close();
  });
});
