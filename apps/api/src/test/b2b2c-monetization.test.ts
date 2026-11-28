import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { agent, originHeader, signUp } from "./helpers";
import { env } from "../config/env";
import { db } from "../db";
import {
  books,
  bookChapters,
  bookClaimCodes,
  bookPurchases,
  communityCalendars,
  communityEvents,
  communityWalletLedgers,
  eventRsvps,
  membershipOrders,
  memberships,
  publishers,
  readingSessions,
  user,
} from "../db/schema";
import { reconcileMembershipPayment } from "../services/membership.service";

async function createTestPublisher(name = "Penerbit Uji Coba") {
  const slug = `pub-${randomUUID().slice(0, 8)}`;
  const [pub] = await db
    .insert(publishers)
    .values({
      name,
      slug,
      verificationStatus: "verified",
    })
    .returning();
  return pub;
}

async function createTestBook(params: {
  slug: string;
  title: string;
  digitalPolicy: "free_open" | "nakama_subscription" | "single_purchase";
  publisherId?: string;
  digitalPriceIdr?: number | null;
}) {
  const [book] = await db
    .insert(books)
    .values({
      slug: params.slug,
      title: params.title,
      author: "Penulis Uji",
      coverUrl: "https://example.com/cover.jpg",
      synopsis: "Sinopsis buku uji coba B2B2C.",
      pageCount: 150,
      totalChapters: 3,
      digitalPolicy: params.digitalPolicy,
      publisherId: params.publisherId,
      digitalPriceIdr: params.digitalPriceIdr ?? null,
    })
    .returning();

  await db.insert(bookChapters).values([
    {
      bookId: book.id,
      chapterNumber: 1,
      titleId: "Bab 1: Sampel Awal",
      contentId:
        "Paragraf pembuka sampel bab 1.\n\nParagraf kedua sampel bab 1.",
    },
    {
      bookId: book.id,
      chapterNumber: 2,
      titleId: "Bab 2: Konten Eksklusif",
      contentId: "Paragraf eksklusif bab 2.\n\nParagraf kedua eksklusif bab 2.",
    },
    {
      bookId: book.id,
      chapterNumber: 3,
      titleId: "Bab 3: Konklusi",
      contentId: "Paragraf penutup bab 3.\n\nParagraf akhir bab 3.",
    },
  ]);

  return book;
}

describe("B2B2C Monetization & DRM Engine", () => {
  it("denies chapter 2 of single_purchase book to Nakama member without purchase or claimed code", async () => {
    const client = agent();
    const email = await signUp(client, "Nakama Member Only");
    const [usr] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email));

    // Grant active Nakama membership
    await db.insert(memberships).values({
      userId: usr.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const slug = `single-only-book-${randomUUID().slice(0, 8)}`;
    await createTestBook({
      slug,
      title: "Buku Satuan Tanpa Nakama",
      digitalPolicy: "single_purchase",
      digitalPriceIdr: 99_000,
    });

    // Chapter 1 is allowed as preview
    const ch1 = await client.get(`/api/books/${slug}/read?chapter=1&mode=full`);
    expect(ch1.status).toBe(200);
    expect(ch1.body.data.hasFullAccess).toBe(false);

    // Chapter 2 must be 403 Forbidden even with active Nakama membership
    const ch2 = await client.get(`/api/books/${slug}/read?chapter=2&mode=full`);
    expect(ch2.status).toBe(403);
    expect(ch2.body.error.code).toBe("FORBIDDEN_DIGITAL_ACCESS");
  });

  it("unlocks full access when physical claim code is redeemed on single_purchase or nakama_subscription book", async () => {
    const client = agent();
    await signUp(client, "Claimer Reader");

    const slug = `claimable-book-${randomUUID().slice(0, 8)}`;
    const book = await createTestBook({
      slug,
      title: "Buku Berkode Klaim",
      digitalPolicy: "single_purchase",
      digitalPriceIdr: 99_000,
    });

    const claimCode = `PHY-${randomUUID().slice(0, 8).toUpperCase()}`;
    await db.insert(bookClaimCodes).values({
      bookId: book.id,
      code: claimCode,
      isDemo: false,
    });

    // Redeem code
    const claimRes = await client
      .post(`/api/books/${slug}/claim-code`)
      .set(originHeader)
      .send({ code: claimCode });
    expect(claimRes.status).toBe(200);
    expect(claimRes.body.data.success).toBe(true);

    // Chapter 2 is now fully accessible
    const ch2 = await client.get(`/api/books/${slug}/read?chapter=2&mode=full`);
    expect(ch2.status).toBe(200);
    expect(ch2.body.data.hasFullAccess).toBe(true);
    expect(ch2.body.data.currentChapter.chapterNumber).toBe(2);
  });

  it("handles single purchase (75:10:15 split), credits community wallet, and unlocks full access", async () => {
    const client = agent();
    const email = await signUp(client, "Direct Digital Buyer");
    const [usr] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email));

    const publisher = await createTestPublisher("Penerbit Kolaborasi");
    const calSlug = `komunitas-literasi-${randomUUID().slice(0, 8)}`;
    const [calendar] = await db
      .insert(communityCalendars)
      .values({
        name: "Komunitas Literasi Nusantara",
        slug: calSlug,
        type: "community",
        verificationStatus: "verified",
        createdByUserId: usr.id,
      })
      .returning();

    const bookSlug = `single-book-${randomUUID().slice(0, 8)}`;
    const book = await createTestBook({
      slug: bookSlug,
      title: "Buku Beli Satuan Eksklusif",
      digitalPolicy: "single_purchase",
      publisherId: publisher.id,
      digitalPriceIdr: 50_000,
    });

    // Before purchase: Chapter 2 is locked
    const lockedRes = await client.get(
      `/api/books/${bookSlug}/read?chapter=2&mode=full`,
    );
    expect(lockedRes.status).toBe(403);

    // Purchase via POST /api/books/:slug/purchase
    const purchaseRes = await client
      .post(`/api/books/${bookSlug}/purchase`)
      .set(originHeader)
      .send({
        affiliateCalendarSlug: calSlug,
        paymentMethod: "manual_or_midtrans",
      });

    expect([200, 201]).toContain(purchaseRes.status);
    const purchaseData = purchaseRes.body.data;
    expect(purchaseData).toMatchObject({
      bookId: book.id,
      priceIdr: 50_000,
      publisherShareIdr: 37_500, // 75%
      affiliateCommissionIdr: 5_000, // 10%
      anzabookNetIdr: 7_500, // 15%
      status: "paid",
    });

    // Check community wallet ledger
    const ledgers = await db
      .select()
      .from(communityWalletLedgers)
      .where(
        and(
          eq(communityWalletLedgers.calendarId, calendar.id),
          eq(communityWalletLedgers.entryType, "affiliate_book_purchase"),
        ),
      );

    expect(ledgers).toHaveLength(1);
    expect(ledgers[0].amountIdr).toBe(5_000);
    expect(ledgers[0].sourceBookPurchaseId).toBe(purchaseData.id);

    // After purchase: Chapter 2 is unlocked
    const unlockedRes = await client.get(
      `/api/books/${bookSlug}/read?chapter=2&mode=full`,
    );
    expect(unlockedRes.status).toBe(200);
    expect(unlockedRes.body.data.hasFullAccess).toBe(true);

    // Repeat purchase returns 409 Conflict
    const repeatRes = await client
      .post(`/api/books/${bookSlug}/purchase`)
      .set(originHeader)
      .send({ affiliateCalendarSlug: calSlug });
    expect(repeatRes.status).toBe(409);
    expect(repeatRes.body.error.code).toBe("BOOK_ALREADY_PURCHASED");
  });

  it("prevents duplicate book purchases under parallel requests from the same user", async () => {
    const client = agent();
    await signUp(client, "Concurrent Book Buyer");

    const publisher = await createTestPublisher("Penerbit Concurrency");
    const bookSlug = `concurrent-book-${randomUUID().slice(0, 8)}`;
    await createTestBook({
      slug: bookSlug,
      title: "Buku Uji Paralel",
      digitalPolicy: "single_purchase",
      publisherId: publisher.id,
      digitalPriceIdr: 45_000,
    });

    const [res1, res2] = await Promise.all([
      client.post(`/api/books/${bookSlug}/purchase`).set(originHeader).send({}),
      client.post(`/api/books/${bookSlug}/purchase`).set(originHeader).send({}),
    ]);

    const statuses = [res1.status, res2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);
  });

  it("automatically attributes community commission from user RSVP history within 14 days", async () => {
    const client = agent();
    const email = await signUp(client, "RSVP Attributed Reader");
    const [usr] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email));

    const publisher = await createTestPublisher("Penerbit Komunitas Cerdas");
    const [calendar] = await db
      .insert(communityCalendars)
      .values({
        name: "Klub Buku Senja",
        slug: `klub-senja-${randomUUID().slice(0, 8)}`,
        type: "community",
        verificationStatus: "verified",
        createdByUserId: usr.id,
      })
      .returning();

    const [event] = await db
      .insert(communityEvents)
      .values({
        calendarId: calendar.id,
        title: "Kumpul Diskusi Buku Alternatif",
        description: "Diskusi buku alternatif mingguan komunitas.",
        coverUrl: "https://example.com/event.jpg",
        slug: `event-senja-${randomUUID().slice(0, 8)}`,
        status: "published",
        startsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 7200000),
        timezone: "Asia/Jakarta",
        format: "offline",
        district: "Tebet",
        city: "Jakarta Selatan",
      })
      .returning();

    // User attended event 3 days ago
    await db.insert(eventRsvps).values({
      eventId: event.id,
      userId: usr.id,
      status: "going",
      checkinCode: `CHK-${randomUUID().slice(0, 6).toUpperCase()}`,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });

    const bookSlug = `auto-attrib-book-${randomUUID().slice(0, 8)}`;
    await createTestBook({
      slug: bookSlug,
      title: "Buku Pembelajaran Mandiri",
      digitalPolicy: "single_purchase",
      publisherId: publisher.id,
      digitalPriceIdr: 40_000,
    });

    // Purchase WITHOUT passing affiliateCalendarSlug or affiliateCalendarId
    const purchaseRes = await client
      .post(`/api/books/${bookSlug}/purchase`)
      .set(originHeader)
      .send({});

    expect([200, 201]).toContain(purchaseRes.status);
    const purchaseData = purchaseRes.body.data;
    expect(purchaseData.affiliateCalendarId).toBe(calendar.id);
    expect(purchaseData.affiliateCommissionIdr).toBe(4_000); // 10% of 40,000

    const [ledger] = await db
      .select()
      .from(communityWalletLedgers)
      .where(eq(communityWalletLedgers.sourceBookPurchaseId, purchaseData.id));
    expect(ledger).toBeDefined();
    expect(ledger.calendarId).toBe(calendar.id);
    expect(ledger.amountIdr).toBe(4_000);
  });

  it("keeps Nakama members and single purchase buyers strictly separated by distribution model", async () => {
    const nakamaClient = agent();
    const nakamaEmail = await signUp(nakamaClient, "Nakama Model Member");
    const [nakamaUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, nakamaEmail));

    await db.insert(memberships).values({
      userId: nakamaUser.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const buyerClient = agent();
    await signUp(buyerClient, "Direct Model Buyer");

    const publisher = await createTestPublisher("Penerbit Tiga Model");
    const nakamaBookSlug = `nakama-book-${randomUUID().slice(0, 8)}`;
    await createTestBook({
      slug: nakamaBookSlug,
      title: "Buku Khusus Nakama",
      digitalPolicy: "nakama_subscription",
      publisherId: publisher.id,
    });

    const singleBookSlug = `single-book-${randomUUID().slice(0, 8)}`;
    await createTestBook({
      slug: singleBookSlug,
      title: "Buku Khusus Satuan",
      digitalPolicy: "single_purchase",
      publisherId: publisher.id,
      digitalPriceIdr: 99_000,
    });

    // 1. Nakama member reads nakama_subscription chapter 2, but cannot read single_purchase chapter 2
    const nakamaCh2 = await nakamaClient.get(
      `/api/books/${nakamaBookSlug}/read?chapter=2&mode=full`,
    );
    expect(nakamaCh2.status).toBe(200);
    expect(nakamaCh2.body.data.hasFullAccess).toBe(true);

    const nakamaOnSingle = await nakamaClient.get(
      `/api/books/${singleBookSlug}/read?chapter=2&mode=full`,
    );
    expect(nakamaOnSingle.status).toBe(403);

    // 2. Non-member buyer initially locked on single_purchase, unlocks after purchase
    const buyerLocked = await buyerClient.get(
      `/api/books/${singleBookSlug}/read?chapter=2&mode=full`,
    );
    expect(buyerLocked.status).toBe(403);

    const buyRes = await buyerClient
      .post(`/api/books/${singleBookSlug}/purchase`)
      .set(originHeader)
      .send({});
    expect([200, 201]).toContain(buyRes.status);

    const buyerUnlocked = await buyerClient.get(
      `/api/books/${singleBookSlug}/read?chapter=2&mode=full`,
    );
    expect(buyerUnlocked.status).toBe(200);
    expect(buyerUnlocked.body.data.hasFullAccess).toBe(true);
  });

  it("idempotently credits 10% community commission on paid Nakama membership", async () => {
    const client = agent();
    const email = await signUp(client, "Nakama Affiliate Subscriber");
    const [usr] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email));

    const [calendar] = await db
      .insert(communityCalendars)
      .values({
        name: "Komunitas Pembaca Pantura",
        slug: `pantura-${randomUUID().slice(0, 8)}`,
        type: "community",
        verificationStatus: "verified",
        createdByUserId: usr.id,
      })
      .returning();

    // Create a membership order with affiliateCalendarId
    const [order] = await db
      .insert(membershipOrders)
      .values({
        buyerId: usr.id,
        beneficiaryId: usr.id,
        requestId: randomUUID(),
        planId: "quarterly",
        months: 3,
        priceIdr: 60_000,
        subtotalIdr: 54_054,
        taxIdr: 5_946,
        taxRateBps: 1100,
        currency: "IDR",
        status: "pending",
        affiliateCalendarId: calendar.id,
      })
      .returning();

    // First settlement
    const txnId = `txn-${randomUUID().slice(0, 8)}`;
    await reconcileMembershipPayment({
      orderId: order.id,
      transactionId: txnId,
      priceIdr: 60_000,
      currency: "IDR",
      status: "paid",
      paidAt: new Date(),
    });

    const ledgers1 = await db
      .select()
      .from(communityWalletLedgers)
      .where(
        and(
          eq(communityWalletLedgers.calendarId, calendar.id),
          eq(communityWalletLedgers.entryType, "affiliate_nakama"),
        ),
      );

    expect(ledgers1).toHaveLength(1);
    expect(ledgers1[0].amountIdr).toBe(6_000); // 10% of 60,000
    expect(ledgers1[0].sourceOrderId).toBe(order.id);

    // Duplicate webhook / settlement replay
    await reconcileMembershipPayment({
      orderId: order.id,
      transactionId: txnId,
      priceIdr: 60_000,
      currency: "IDR",
      status: "paid",
      paidAt: new Date(),
    });

    const ledgers2 = await db
      .select()
      .from(communityWalletLedgers)
      .where(
        and(
          eq(communityWalletLedgers.calendarId, calendar.id),
          eq(communityWalletLedgers.entryType, "affiliate_nakama"),
        ),
      );

    // Must still have exactly 1 ledger entry, no double credit
    expect(ledgers2).toHaveLength(1);
  });

  it("enforces WPM anti-fraud guard on reading sessions", async () => {
    const client = agent();
    const email = await signUp(client, "Speed Reader Auditor");
    const [usr] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email));

    // Active Nakama membership
    await db.insert(memberships).values({
      userId: usr.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const bookSlug = `pool-book-${randomUUID().slice(0, 8)}`;
    const book = await createTestBook({
      slug: bookSlug,
      title: "Buku Royalti Nakama Pool",
      digitalPolicy: "nakama_subscription",
    });

    // 1. Bot speed: avgWpm = 1200 -> isValidForRoyalty = false
    const botSession = await client
      .post("/api/reading")
      .set(originHeader)
      .send({
        bookId: book.id,
        pagesRead: 5,
        durationSeconds: 180,
        avgWpm: 1200,
        mode: "full",
      });

    expect(botSession.status).toBe(201);
    const [botDb] = await db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.id, botSession.body.data.id));
    expect(botDb.isValidForRoyalty).toBe(false);

    // 2. Realistic human reader: avgWpm = 200, duration = 180s -> isValidForRoyalty = true
    const humanSession = await client
      .post("/api/reading")
      .set(originHeader)
      .send({
        bookId: book.id,
        pagesRead: 3,
        durationSeconds: 180,
        avgWpm: 200,
        mode: "full",
      });

    expect(humanSession.status).toBe(201);
    const [humanDb] = await db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.id, humanSession.body.data.id));
    expect(humanDb.isValidForRoyalty).toBe(true);

    // 3. Too short reading duration (< 120s): duration = 60s -> isValidForRoyalty = false
    const shortSession = await client
      .post("/api/reading")
      .set(originHeader)
      .send({
        bookId: book.id,
        pagesRead: 1,
        durationSeconds: 60,
        avgWpm: 200,
        mode: "full",
      });

    expect(shortSession.status).toBe(201);
    const [shortDb] = await db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.id, shortSession.body.data.id));
    expect(shortDb.isValidForRoyalty).toBe(false);
  });

  it("blocks simulated single-book purchase with 503 PAYMENT_UNAVAILABLE when MIDTRANS_ENV is production", async () => {
    const buyer = agent();
    const email = await signUp(buyer, "Prod Guard Buyer");
    const [usr] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email));

    const publisher = await createTestPublisher("Penerbit Prod Guard");
    const bookSlug = `prod-guard-book-${randomUUID().slice(0, 8)}`;
    const book = await createTestBook({
      slug: bookSlug,
      title: "Buku Dilindungi Mode Produksi",
      digitalPolicy: "single_purchase",
      publisherId: publisher.id,
      digitalPriceIdr: 49_000,
    });

    const previousMidtransEnv = env.MIDTRANS_ENV;
    env.MIDTRANS_ENV = "production";
    try {
      const res = await buyer
        .post(`/api/books/${bookSlug}/purchase`)
        .set(originHeader)
        .send({});
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("PAYMENT_UNAVAILABLE");
    } finally {
      env.MIDTRANS_ENV = previousMidtransEnv;
    }

    const recorded = await db
      .select({ id: bookPurchases.id })
      .from(bookPurchases)
      .where(
        and(
          eq(bookPurchases.bookId, book.id),
          eq(bookPurchases.userId, usr.id),
        ),
      );
    expect(recorded).toHaveLength(0);

    const ch2 = await buyer.get(
      `/api/books/${bookSlug}/read?chapter=2&mode=full`,
    );
    expect(ch2.status).toBe(403);
  });
});
