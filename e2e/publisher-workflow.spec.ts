import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { API_URL, fitsWidth, headers, setRole, signUp } from "./helpers";

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
    const teamTab = ownerPage.getByRole("tab", { name: /Tim Redaksi/i });
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
});
