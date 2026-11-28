import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { fitsWidth, setRole, signUp } from "./helpers";

test.describe("Issue #23 Reading Spots Reviews, Community Submissions & Admin Moderation", () => {
  test("navigates from Home Banner to /spots, verifies Google Maps deep link, completes review CRUD, and submits a spot report", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUp(page.request, "Pembaca Sudut Baca");

    // 1. Land on Home -> see seeded Sudut Baca banner -> expand to /spots inside AppShell
    await page.goto("/app?tab=home");
    await expect(
      page.getByRole("heading", { name: /Sudut Baca di sekitar/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("link", { name: /Buka Peta Sudut Baca/i }).click();
    await expect(page).toHaveURL(/\/spots/);
    expect(await fitsWidth(page)).toBe(true);

    const sidebar = page.locator(
      'aside[aria-label="Daftar dan penyaring sudut baca"]',
    );
    await expect(sidebar).toBeVisible();

    // 2. Filter by category & select a seeded Jakarta spot
    await sidebar
      .getByRole("button", { name: "Toko Buku Indie", exact: true })
      .click();
    const firstSpotButton = sidebar
      .locator('ul[aria-label="Hasil sudut baca"] li button')
      .first();
    await expect(firstSpotButton).toBeVisible({ timeout: 15_000 });
    const spotHeadingText = (
      await firstSpotButton.locator("h3").textContent()
    )?.trim();
    expect(spotHeadingText).toBeTruthy();

    await firstSpotButton.click();

    // Verify SpotDetailPanel opens with valid Google Maps universal directions link
    const directionsLink = sidebar.getByRole("link", {
      name: /Buka Rute di Google Maps/i,
    });
    await expect(directionsLink).toBeVisible({ timeout: 15_000 });
    const mapsHref = await directionsLink.getAttribute("href");
    expect(mapsHref).toMatch(
      /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=-?\d+(\.\d+)?,-?\d+(\.\d+)?/,
    );

    // 3. Submit a 5-star review + 2 Reading Vibe Tags
    const reviewSection = sidebar.locator(
      'section[aria-label^="Ulasan dan rating untuk"]',
    );
    await expect(reviewSection).toBeVisible();

    await reviewSection
      .locator("label", {
        has: page.getByRole("radio", { name: "5 bintang" }),
      })
      .click();
    await reviewSection.getByRole("button", { name: "Colokan banyak" }).click();
    await reviewSection
      .getByRole("button", { name: "Tenang untuk fokus" })
      .click();

    const initialReviewText =
      "Tempat membaca yang sangat nyaman, pencahayaan hangat dan tenang untuk menamatkan buku.";
    await reviewSection
      .locator('textarea[name="content"]')
      .fill(initialReviewText);
    await reviewSection.getByRole("button", { name: "Kirim Ulasan" }).click();

    await expect(
      reviewSection.getByText("Ulasan Anda", { exact: true }),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(reviewSection.getByText(initialReviewText)).toBeVisible();
    await expect(reviewSection.getByText("5.0").first()).toBeVisible();

    // 4. Reload and confirm review & rating persisted
    await page.reload();
    const reloadedSidebar = page.locator(
      'aside[aria-label="Daftar dan penyaring sudut baca"]',
    );
    const reloadedReviewSection = reloadedSidebar.locator(
      'section[aria-label^="Ulasan dan rating untuk"]',
    );
    await expect(
      reloadedReviewSection.getByText("Ulasan Anda", { exact: true }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      reloadedReviewSection.getByText(initialReviewText),
    ).toBeVisible();

    // 5. Edit own review inline
    await reloadedReviewSection
      .getByRole("button", { name: "Edit Ulasan" })
      .click();
    await reloadedReviewSection
      .locator("label", {
        has: page.getByRole("radio", { name: "4 bintang" }),
      })
      .click();

    const updatedReviewText =
      "Suasana tetap nyaman untuk membaca, hanya saja sore hari agak ramai di dekat kasir.";
    await reloadedReviewSection
      .locator('textarea[name="content"]')
      .fill(updatedReviewText);
    await reloadedReviewSection
      .getByRole("button", { name: "Simpan Perubahan" })
      .click();

    await expect(
      reloadedReviewSection.getByText(updatedReviewText),
    ).toBeVisible({ timeout: 10_000 });
    await expect(reloadedReviewSection.getByText("4.0").first()).toBeVisible();

    // 6. Delete own review with confirmation
    await reloadedReviewSection
      .getByRole("button", { name: "Hapus", exact: true })
      .click();
    await reloadedReviewSection
      .getByRole("button", { name: "Ya, Hapus", exact: true })
      .click();

    await expect(
      reloadedReviewSection.getByText("Ulasan Anda telah dihapus."),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      reloadedReviewSection.getByRole("button", { name: "Kirim Ulasan" }),
    ).toBeVisible();

    // 7. Report spot info correction via ReportSpotDialog
    await reloadedSidebar
      .getByRole("button", { name: /Laporkan \/ Koreksi/i })
      .click();
    const reportDialog = page.locator("dialog[open]");
    await expect(reportDialog).toBeVisible();
    await reportDialog
      .locator('textarea[name="details"]')
      .fill(
        "Jam buka terbaru sekarang mulai pukul 10.00 WIB pada akhir pekan.",
      );
    await reportDialog.getByRole("button", { name: "Kirim Laporan" }).click();
    await expect(
      reportDialog.getByText("Laporan berhasil dikirim"),
    ).toBeVisible({ timeout: 10_000 });
    await reportDialog.getByRole("button", { name: "Selesai" }).click();
    await expect(reportDialog).toHaveCount(0);

    // 8. Verify 409 duplicate open report inline error, auto-clear on edit, and Escape dialog guard
    await reloadedSidebar
      .getByRole("button", { name: /Laporkan \/ Koreksi/i })
      .click();
    await expect(reportDialog).toBeVisible();
    await reportDialog
      .locator('textarea[name="details"]')
      .fill("Laporan duplikat jam buka untuk verifikasi 409.");
    await reportDialog.getByRole("button", { name: "Kirim Laporan" }).click();
    const duplicateAlert = reportDialog.locator('[role="alert"]');
    await expect(duplicateAlert).toBeVisible({ timeout: 10_000 });

    // Editing details clears stale submitError immediately
    await reportDialog
      .locator('textarea[name="details"]')
      .fill(
        "Mengubah detail laporan harus membersihkan pesan galat sebelumnya.",
      );
    await expect(duplicateAlert).toHaveCount(0);

    // Pressing Escape closes only the dialog, keeping SpotDetailPanel open
    await page.keyboard.press("Escape");
    await expect(reportDialog).toHaveCount(0);
    await expect(
      reloadedSidebar.getByRole("link", { name: /Buka Rute di Google Maps/i }),
    ).toBeVisible();
  });

  test("submits a new reading spot with geocode fallback, 429 guard, 100m duplicate guard, admin approval, and review_abuse report", async ({
    browser,
  }) => {
    const suffix = randomUUID().slice(0, 8);
    const spotName = `Sudut Baca Uji ${suffix}`;

    // 1. Regular user context submits a new spot
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await userPage.setViewportSize({ width: 1280, height: 800 });
    await signUp(userPage.request, "Kontributor Sudut Baca");

    // Deterministic geocode proxy mock: empty [] for unknown query, Bandung match otherwise
    await userPage.route("**/api/spots/geocode*", async (route) => {
      const url = new URL(route.request().url());
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      if (q.includes("tidak ditemukan")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [] }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              displayName: "Jl. Ciumbuleuit Atas, Bandung, Jawa Barat",
              address: "Jl. Ciumbuleuit Atas No. 88, Cidadap",
              district: "Cidadap",
              city: "Bandung",
              province: "Jawa Barat",
              latitude: -6.87123,
              longitude: 107.60891,
            },
          ],
        }),
      });
    });

    await userPage.goto("/spots");
    const sidebar = userPage.locator(
      'aside[aria-label="Daftar dan penyaring sudut baca"]',
    );
    await expect(sidebar).toBeVisible({ timeout: 15_000 });

    await sidebar.getByRole("button", { name: /Usulkan Sudut Baca/i }).click();
    const submitDialog = userPage.locator("dialog[open]");
    await expect(submitDialog).toBeVisible();

    // Step 1a: Empty geocode [] -> fallback hint -> city preset click
    const geocodeInput = submitDialog.getByPlaceholder(
      "Contoh: Jl. Braga Bandung, Kemang Jakarta...",
    );
    await geocodeInput.fill("Lokasi Tidak Ditemukan XYZ");
    await submitDialog
      .getByRole("button", { name: "Cari", exact: true })
      .click();
    await expect(
      submitDialog.getByText(/Hasil pencarian tidak ditemukan\?/i),
    ).toBeVisible({ timeout: 10_000 });
    await submitDialog
      .getByRole("button", { name: "Bandung", exact: true })
      .click();

    // Step 1b: Search geocode & pick result
    await geocodeInput.fill("Ciumbuleuit Bandung");
    await submitDialog
      .getByRole("button", { name: "Cari", exact: true })
      .click();
    await submitDialog
      .getByRole("button", { name: /Jl\. Ciumbuleuit Atas/i })
      .click();

    await submitDialog
      .getByRole("button", { name: /Lanjut Cek Duplikat/i })
      .click();

    // Step 2: 100m duplicate guard completes cleanly
    await expect(
      submitDialog.getByText(
        /Tidak ditemukan sudut baca serupa dalam radius 100 m/i,
      ),
    ).toBeVisible({ timeout: 10_000 });
    await submitDialog
      .getByRole("button", { name: /Lanjut ke Detail/i })
      .click();

    // Step 3: Fill high-signal comfort form
    await submitDialog.locator('input[name="name"]').fill(spotName);
    await submitDialog
      .locator('input[name="googleMapsUrl"]')
      .fill("https://maps.app.goo.gl/anzabookTestSpot");
    await submitDialog
      .locator('input[name="openingHoursText"]')
      .fill("Sen-Min 09:00-21:00");
    await submitDialog
      .locator('textarea[name="description"]')
      .fill(
        "Ruang baca tenang dengan jendela menghadap pepohonan dan banyak colokan.",
      );

    // Intercept once with 429 to verify rate-limit UI feedback preserves draft
    let interceptedRateLimit = false;
    await userPage.route("**/api/spots", async (route) => {
      const reqUrl = new URL(route.request().url());
      if (
        route.request().method() === "POST" &&
        reqUrl.pathname === "/api/spots" &&
        !interceptedRateLimit
      ) {
        interceptedRateLimit = true;
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: "Batas maksimal 5 usulan per hari tercapai.",
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await submitDialog
      .getByRole("button", { name: "Kirim Usulan Sudut Baca" })
      .click();
    await expect(
      submitDialog.getByText("Batas maksimal 5 usulan per hari tercapai."),
    ).toBeVisible({ timeout: 10_000 });
    await expect(submitDialog.locator('input[name="name"]')).toHaveValue(
      spotName,
    );

    // Retry submit hits live backend cleanly
    await submitDialog
      .getByRole("button", { name: "Kirim Usulan Sudut Baca" })
      .click();

    // Step 4: Verify pending_review confirmation -> open Kontribusi Saya
    await expect(
      submitDialog.getByText(/Usulan diterima — sedang ditinjau tim kurasi/i),
    ).toBeVisible({ timeout: 10_000 });

    await submitDialog
      .getByRole("button", { name: /Pantau di Kontribusi Saya/i })
      .click();

    const drawerDialog = userPage.locator("dialog[open]");
    await expect(drawerDialog).toBeVisible();
    await expect(drawerDialog.getByText(spotName)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      drawerDialog.getByText("Menunggu Kurasi").first(),
    ).toBeVisible();
    await drawerDialog.getByRole("button", { name: "Tutup dialog" }).click();

    // 2. Admin context approves the pending submission on /admin?tab=spots
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await adminPage.setViewportSize({ width: 1280, height: 800 });
    const adminEmail = await signUp(adminPage.request, "Kurator Sudut Baca");
    await setRole(adminEmail, "admin");

    await adminPage.goto("/admin?tab=spots");
    await expect(
      adminPage.getByRole("heading", { name: "Kurasi Sudut Baca" }),
    ).toBeVisible({ timeout: 15_000 });

    const spotCard = adminPage.locator("article", { hasText: spotName });
    await expect(spotCard).toBeVisible({ timeout: 15_000 });
    await spotCard
      .getByRole("button", { name: /Setujui & Tayangkan/i })
      .click();

    await expect(
      adminPage.getByText(
        new RegExp(`${spotName}: Disetujui dan ditayangkan`, "i"),
      ),
    ).toBeVisible({ timeout: 10_000 });

    // Mobile responsive check on /admin?tab=spots
    await adminPage.setViewportSize({ width: 390, height: 844 });
    expect(await fitsWidth(adminPage)).toBe(true);

    // 3. Regular user sees the newly approved spot live on /spots AND verifies 100m duplicate guard UI
    await userPage.goto(`/spots?q=${encodeURIComponent(spotName)}`);
    const publicSidebar = userPage.locator(
      'aside[aria-label="Daftar dan penyaring sudut baca"]',
    );
    await expect(publicSidebar.getByText(spotName)).toBeVisible({
      timeout: 15_000,
    });

    // Open SubmitSpotDialog at the exact coordinates of the published spot -> verify 100m duplicate warning
    await publicSidebar
      .getByRole("button", { name: /Usulkan Sudut Baca/i })
      .click();
    const dupDialog = userPage.locator("dialog[open]");
    await expect(dupDialog).toBeVisible();
    await dupDialog.getByLabel("Lintang (Latitude)").fill("-6.87123");
    await dupDialog.getByLabel("Lintang (Latitude)").blur();
    await dupDialog.getByLabel("Bujur (Longitude)").fill("107.60891");
    await dupDialog.getByLabel("Bujur (Longitude)").blur();
    await dupDialog
      .getByRole("button", { name: /Lanjut Cek Duplikat/i })
      .click();

    await expect(
      dupDialog.getByText(/Ditemukan \d+ sudut baca berdekatan/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      dupDialog.getByRole("button", { name: /Lanjut ke Detail/i }),
    ).toBeDisabled();
    await dupDialog
      .getByRole("button", { name: /Buka Spot & Tulis Ulasan/i })
      .first()
      .click();
    await expect(dupDialog).toHaveCount(0);

    // 4. First user posts a review on the approved spot; second user reports it via review_abuse
    const reviewSection = publicSidebar.locator(
      'section[aria-label^="Ulasan dan rating untuk"]',
    );
    await expect(reviewSection).toBeVisible({ timeout: 15_000 });
    await reviewSection
      .locator("label", {
        has: userPage.getByRole("radio", { name: "5 bintang" }),
      })
      .click();
    await reviewSection
      .locator('textarea[name="content"]')
      .fill("Ulasan uji coba untuk memverifikasi pelaporan review_abuse.");
    await reviewSection.getByRole("button", { name: "Kirim Ulasan" }).click();
    await expect(
      reviewSection.getByText("Ulasan Anda", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    // Mobile responsive check on /spots
    await userPage.setViewportSize({ width: 390, height: 844 });
    expect(await fitsWidth(userPage)).toBe(true);
    await userContext.close();

    // Second user (adminPage) switches to desktop, opens spotName, and reports the review
    await adminPage.setViewportSize({ width: 1280, height: 800 });
    await adminPage.goto(`/spots?q=${encodeURIComponent(spotName)}`);
    const adminSidebar = adminPage.locator(
      'aside[aria-label="Daftar dan penyaring sudut baca"]',
    );
    await adminSidebar
      .locator('ul[aria-label="Hasil sudut baca"] li button')
      .first()
      .click();
    const adminReviewSection = adminSidebar.locator(
      'section[aria-label^="Ulasan dan rating untuk"]',
    );
    await expect(adminReviewSection).toBeVisible({ timeout: 15_000 });
    await adminReviewSection
      .getByRole("button", { name: /Laporkan ulasan dari/i })
      .first()
      .click();

    const reviewReportDialog = adminPage.locator("dialog[open]");
    await expect(reviewReportDialog).toBeVisible();
    await expect(
      reviewReportDialog.getByText(/Ulasan tidak pantas \/ spam/i),
    ).toBeVisible();
    await reviewReportDialog
      .locator('textarea[name="details"]')
      .fill("Ulasan ini dilaporkan untuk verifikasi alur review_abuse.");
    await reviewReportDialog
      .getByRole("button", { name: "Kirim Laporan" })
      .click();
    await expect(
      reviewReportDialog.getByText("Laporan berhasil dikirim"),
    ).toBeVisible({ timeout: 10_000 });
    await adminContext.close();
  });
});
