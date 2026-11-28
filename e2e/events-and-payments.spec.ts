import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { API_URL, fitsWidth, headers, setRole, signUp } from "./helpers";

test.describe("Issue #6 Payments Alignment & Event Host / Co-Host Flows", () => {
  test("creates an event with co-hosts, shows Coming Soon ticket popover without Stripe, and invites a co-host admin", async ({
    browser,
  }) => {
    const suffix = randomUUID().slice(0, 8);
    const calSlug = `komunitas-acara-${suffix}`;
    const calName = `Komunitas Acara ${suffix}`;

    // 1. Owner creates and admin verifies a community calendar
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await ownerPage.setViewportSize({ width: 1280, height: 800 });
    await signUp(ownerPage.request, "Pemilik Acara");

    const calRes = await ownerPage.request.post(
      `${API_URL}/api/events/calendars`,
      {
        headers,
        data: {
          name: calName,
          slug: calSlug,
          type: "community",
          description: "Komunitas untuk menguji co-host dan tiket coming soon.",
          city: "Jakarta",
        },
      },
    );
    expect(calRes.status()).toBe(201);

    const adminContext = await browser.newContext();
    const adminEmail = await signUp(adminContext.request, "Kurator Acara");
    await setRole(adminEmail, "admin");
    const verifyRes = await adminContext.request.patch(
      `${API_URL}/api/events/calendars/${calSlug}/verify`,
      {
        headers,
        data: { status: "verified" },
      },
    );
    expect(verifyRes.status()).toBe(200);
    await adminContext.close();

    // 2. Collaborator signs up and sets a username so owner can invite via @username
    const partnerContext = await browser.newContext();
    const partnerPage = await partnerContext.newPage();
    await partnerPage.setViewportSize({ width: 1280, height: 800 });
    await signUp(partnerPage.request, "Rekan Penyelenggara");
    const partnerUsername = `rekan_${suffix}`;
    const usernameRes = await partnerPage.request.post(
      `${API_URL}/api/membership/username`,
      {
        headers,
        data: { username: partnerUsername },
      },
    );
    expect(usernameRes.status()).toBe(200);

    // 3. Owner invites collaborator via Community Hub -> Pengurus & Anggota tab
    await ownerPage.goto(`/c/${calSlug}`);
    await ownerPage.waitForLoadState("networkidle");
    await ownerPage.getByRole("tab", { name: /Pengurus & Anggota/i }).click();

    await ownerPage
      .getByLabel("Email atau @username")
      .fill(`@${partnerUsername}`);
    await ownerPage.getByLabel("Peran").selectOption("admin");
    await ownerPage.getByRole("button", { name: "Tambahkan" }).click();

    await expect(
      ownerPage.getByText(/Rekan Penyelenggara ditambahkan ke tim komunitas/i),
    ).toBeVisible();
    await expect(ownerPage.getByText(`@${partnerUsername}`)).toBeVisible();

    // 4. Invited admin opens Create Event dialog from /app?tab=events
    await partnerPage.goto("/app?tab=events");
    await partnerPage.waitForLoadState("networkidle");
    await partnerPage
      .getByRole("button", { name: "Buat Acara", exact: true })
      .click();

    await expect(
      partnerPage.getByText("Buat Acara Baru", { exact: true }),
    ).toBeVisible();
    expect(await fitsWidth(partnerPage)).toBe(true);

    // Verify Harga Tiket shows Gratis and Coming Soon (zero Stripe text)
    await partnerPage.getByRole("button", { name: /Gratis/i }).click();
    const popover = partnerPage.getByRole("region", {
      name: "Informasi Tiket Acara",
    });
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("Coming Soon");
    await expect(popover).not.toContainText(/Stripe/i);
    await popover.getByRole("button", { name: "Mengerti" }).click();
    await expect(popover).toHaveCount(0);

    // Fill title, virtual location, description, and add Co-Host
    const eventTitle = `Diskusi Sastra Kolaboratif ${suffix}`;
    await partnerPage.getByPlaceholder("Nama Acara").fill(eventTitle);

    await partnerPage.getByText("Tambahkan Lokasi Acara").click();
    await partnerPage.getByRole("button", { name: "Buat Google Meet" }).click();

    await partnerPage.getByText("Tambahkan Deskripsi Acara").click();
    await partnerPage
      .getByPlaceholder("Siapa yang harus datang? Tentang apa acara ini?")
      .fill("Sesi diskusi buku bersama co-host komunitas lintas kota.");
    await partnerPage.getByRole("button", { name: "Selesai" }).click();

    await partnerPage.getByRole("button", { name: "+ Tambah" }).click();
    await partnerPage
      .getByLabel("Nama kolaborator acara")
      .fill("Klub Baca Nusantara");
    await partnerPage.getByLabel("Peran kolaborator acara").fill("Co-Host");
    await partnerPage
      .getByRole("button", { name: "Tambah", exact: true })
      .click();

    await expect(partnerPage.getByText("Klub Baca Nusantara")).toBeVisible();

    await partnerPage
      .getByRole("button", { name: "Buat Acara", exact: true })
      .last()
      .click();

    // Newly created event opens in drawer/list and renders co-host
    await expect(
      partnerPage.getByRole("heading", { name: eventTitle }).first(),
    ).toBeVisible();
    await expect(
      partnerPage.getByText("Klub Baca Nusantara").first(),
    ).toBeVisible();

    await partnerContext.close();
    await ownerContext.close();
  });

  test("creates Midtrans QRIS checkout order with tax breakdown on single_purchase book and unlocks on confirmation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUp(page.request, "Pembeli Satuan Uji");

    const suffix = randomUUID().slice(0, 8);
    const bookSlug = `buku-satuan-e2e-${suffix}`;
    const bookTitle = `Buku Uji Satuan ${suffix}`;
    const purchaseId = randomUUID();
    let bookId = "";
    const pool = new Pool({
      connectionString: process.env.STARTER_TEST_DATABASE_URL,
      max: 1,
    });
    try {
      const inserted = await pool.query<{ id: string }>(
        `INSERT INTO books (slug, title, author, cover_url, synopsis, page_count, total_chapters, digital_policy, digital_price_idr, access_tier)
         VALUES ($1, $2, $3, $4, $5, 120, 2, 'single_purchase', 49000, 'premium')
         RETURNING id`,
        [
          bookSlug,
          bookTitle,
          "Penulis Uji",
          "/covers/default-book.jpg",
          "Sinopsis buku uji pembelian satuan mode simulasi sandbox Midtrans.",
        ],
      );
      bookId = inserted.rows[0].id;
      await pool.query(
        `INSERT INTO book_chapters (book_id, chapter_number, title_id, content_id)
         VALUES ($1, 1, 'Bab 1', 'Paragraf pembuka.\n\nParagraf kedua.'),
                ($1, 2, 'Bab 2', 'Paragraf bab dua.\n\nParagraf penutup bab dua.')`,
        [bookId],
      );
    } finally {
      await pool.end();
    }

    const checkoutUrl =
      "https://app.sandbox.midtrans.com/snap/v4/redirection/book-test-transaction";
    const order = {
      id: purchaseId,
      bookId,
      bookSlug,
      bookTitle,
      bookCoverUrl: "/covers/default-book.jpg",
      status: "pending" as const,
      checkoutUrl,
      priceIdr: 54390,
      createdAt: new Date().toISOString(),
      paidAt: null as string | null,
      tax: { subtotalIdr: 49000, taxIdr: 5390, rateBps: 1100 },
    };

    let paid = false;
    await page.route(
      `${API_URL}/api/books/${encodeURIComponent(bookSlug)}/checkout`,
      async (route) => {
        expect(route.request().postDataJSON()).toMatchObject({
          requestId: expect.any(String),
        });
        await route.fulfill({ status: 201, json: { data: order } });
      },
    );
    await page.route(
      `${API_URL}/api/books/purchases/${encodeURIComponent(purchaseId)}`,
      async (route) => {
        await route.fulfill({
          json: {
            data: paid
              ? { ...order, status: "paid", paidAt: new Date().toISOString() }
              : order,
          },
        });
      },
    );
    await page.route(
      `${API_URL}/api/books/purchases/${encodeURIComponent(purchaseId)}/refresh`,
      async (route) => {
        await route.fulfill({
          json: {
            data: paid
              ? { ...order, status: "paid", paidAt: new Date().toISOString() }
              : order,
          },
        });
      },
    );

    await page.goto(`/books/${bookSlug}`);
    await page.waitForLoadState("networkidle");

    await expect(
      page
        .getByRole("button", { name: /Klaim Akses Digital Buku Fisik/i })
        .locator(":visible")
        .first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Beli Buku Digital — Rp49\.000/i })
      .first()
      .click();

    await expect(page).toHaveURL(
      new RegExp(`/books/${bookSlug}/checkout/${purchaseId}$`),
    );
    await expect(
      page.getByRole("heading", { name: "Menunggu Pembayaran" }),
    ).toBeVisible();
    await expect(page.getByText("Rp49.000", { exact: true })).toBeVisible();
    await expect(page.getByText("Rp5.390", { exact: true })).toBeVisible();
    await expect(page.getByText("Rp54.390", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Buka Pembayaran QRIS Midtrans/i }),
    ).toHaveAttribute("href", checkoutUrl);

    paid = true;
    await page
      .getByRole("button", { name: "Periksa Status Pembayaran" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Pembayaran Lunas — Akses Buku Aktif Selamanya",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Mulai Membaca Buku" }),
    ).toHaveAttribute("href", `/read/${bookSlug}`);
  });
});
