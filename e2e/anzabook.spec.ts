import { expect, test } from "@playwright/test";
import { fitsWidth, signUp } from "./helpers";

test.describe("AnzaBook Core End-to-End Flows", () => {
  test("homepage renders hero book shelf, weekly bulletin, and catalog", async ({
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
    await expect(
      page.getByRole("button", { name: /Pilih buku/i }).first(),
    ).toBeVisible();

    // Check Weekly Bulletin
    await expect(
      page.getByRole("heading", { name: /Sorotan Redaksi Pekan Ini/i }),
    ).toBeVisible();

    // Check Catalog Book Link
    const bookLink = page
      .getByRole("link", { name: /Revolusi Cetak & Kedaulatan Membaca/i })
      .first();
    await expect(bookLink).toBeVisible();

    // Ensure no horizontal overflow
    expect(await fitsWidth(page)).toBe(true);
  });

  test("book detail page displays 3D paper switcher and live stock tracker", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/books/revolusi-cetak-kedaulatan-membaca");
    await page.waitForLoadState("networkidle");

    // Title and author
    await expect(
      page.getByRole("heading", {
        name: "Revolusi Cetak & Kedaulatan Membaca",
        level: 1,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Sutan Sjahrir/i).first()).toBeVisible();

    // 3D Paper Tier Switcher
    await expect(page.getByText(/Pilih Format & Jenis Kertas/i)).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /Edisi Rakyat/i }),
    ).toBeVisible();

    // Click Edisi Standar
    const standardTierBtn = page.getByRole("radio", { name: /Edisi Standar/i });
    if (await standardTierBtn.isVisible()) {
      await standardTierBtn.click();
      await expect(page.getByText(/Bookpaper Krem 72 gsm/i).first()).toBeVisible();
    }

    // Live Stock Tracker
    await expect(
      page.getByRole("heading", {
        name: /Ketersediaan Fisik di Toko Rekanan/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Gramedia Matraman/i)).toBeVisible();
  });

  test("signed-in dashboard provides Strava share studio and publisher HPP calculator", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    await signUp(page.request, "Dewi Pembaca");
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    // User greeting
    await expect(
      page.getByRole("heading", { name: /Selamat Datang, Dewi Pembaca/i }),
    ).toBeVisible();

    // Switch to Strava Literasi Tab
    const shareTabBtn = page.getByRole("button", {
      name: /Studio Strava Literasi/i,
    });
    await shareTabBtn.click();

    // Canvas sticker generator visible
    await expect(
      page.getByRole("heading", {
        name: /Studio Strava Literasi/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Unduh Stiker PNG Beresolusi Tinggi/i }),
    ).toBeVisible();

    // Switch to Publisher HPP Tab
    const pubTabBtn = page.getByRole("button", {
      name: /Studio Penerbit HPP/i,
    });
    await pubTabBtn.click();

    await expect(
      page.getByRole("heading", {
        name: /Studio Penerbit: Simulasi HPP Cetak Transparan/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Pilihan Rakyat/i)).toBeVisible();
  });

  test("protected web reader enforces DRM pre-trigger shield upon screenshot keydown", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    await signUp(page.request, "Surya DRM");
    await page.goto("/read/revolusi-cetak-kedaulatan-membaca?mode=full&chapter=1");
    await page.waitForLoadState("networkidle");

    // Verify reader rendered chapter
    await expect(page.getByText(/Bab 1/i).first()).toBeVisible();

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
