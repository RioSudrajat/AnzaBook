import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { agent, originHeader, setRole, signUp } from "./helpers";
import { db } from "../db";
import {
  authorApplications,
  bookChapters,
  bookClaimBatches,
  bookClaimCodes,
  bookPurchases,
  books,
  communityCalendars,
  communityWalletLedgers,
  manuscriptChapters,
  manuscriptSubmissions,
  membershipOrders,
  publishers,
  user,
} from "../db/schema";

describe("Admin Internal CMS API (/api/admin/*)", () => {
  it("denies access to non-admin users (HTTP 403 FORBIDDEN)", async () => {
    const regularClient = agent();
    await signUp(regularClient, "Regular User");

    // GET /api/admin/overview
    const overviewRes = await regularClient.get("/api/admin/overview");
    expect(overviewRes.status).toBe(403);
    expect(overviewRes.body.error.code).toBe("FORBIDDEN");

    // GET /api/admin/calendars
    const calListRes = await regularClient.get("/api/admin/calendars");
    expect(calListRes.status).toBe(403);
    expect(calListRes.body.error.code).toBe("FORBIDDEN");

    // PATCH /api/admin/calendars/:id/verify
    const calVerifyRes = await regularClient
      .patch(`/api/admin/calendars/${randomUUID()}/verify`)
      .set(originHeader)
      .send({ verificationStatus: "verified" });
    expect(calVerifyRes.status).toBe(403);
    expect(calVerifyRes.body.error.code).toBe("FORBIDDEN");

    // GET /api/admin/author-applications
    const authorListRes = await regularClient.get(
      "/api/admin/author-applications",
    );
    expect(authorListRes.status).toBe(403);
    expect(authorListRes.body.error.code).toBe("FORBIDDEN");

    // PATCH /api/admin/author-applications/:id/review
    const authorReviewRes = await regularClient
      .patch(`/api/admin/author-applications/${randomUUID()}/review`)
      .set(originHeader)
      .send({ status: "verified" });
    expect(authorReviewRes.status).toBe(403);
    expect(authorReviewRes.body.error.code).toBe("FORBIDDEN");

    // GET /api/admin/publishers
    const pubListRes = await regularClient.get("/api/admin/publishers");
    expect(pubListRes.status).toBe(403);
    expect(pubListRes.body.error.code).toBe("FORBIDDEN");

    // PATCH /api/admin/publishers/:id/verify
    const pubVerifyRes = await regularClient
      .patch(`/api/admin/publishers/${randomUUID()}/verify`)
      .set(originHeader)
      .send({ verificationStatus: "verified" });
    expect(pubVerifyRes.status).toBe(403);
    expect(pubVerifyRes.body.error.code).toBe("FORBIDDEN");

    // GET /api/admin/manuscripts
    const manuListRes = await regularClient.get("/api/admin/manuscripts");
    expect(manuListRes.status).toBe(403);
    expect(manuListRes.body.error.code).toBe("FORBIDDEN");

    // POST /api/admin/claim-batches
    const claimBatchRes = await regularClient
      .post("/api/admin/claim-batches")
      .set(originHeader)
      .send({
        bookId: randomUUID(),
        publisherId: randomUUID(),
        batchName: "Test Batch",
        totalCodes: 10,
      });
    expect(claimBatchRes.status).toBe(403);
    expect(claimBatchRes.body.error.code).toBe("FORBIDDEN");
  });

  it("provides operational overview and financial summary to admins (GET /api/admin/overview)", async () => {
    const admin = agent();
    const adminEmail = await signUp(admin, "Super Admin");
    await setRole(adminEmail, "admin");

    const creator = agent();
    const creatorEmail = await signUp(creator, "Calendar Creator");
    const [dbCreator] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, creatorEmail));

    // Seed pending community calendar
    const calSlug = `pending-cal-${randomUUID().slice(0, 6)}`;
    const [seededCal] = await db
      .insert(communityCalendars)
      .values({
        slug: calSlug,
        name: "Klub Buku Senja",
        type: "community",
        description: "Komunitas pencinta buku",
        verificationStatus: "pending",
        createdByUserId: dbCreator.id,
      })
      .returning();

    // Seed pending author application
    await db.insert(authorApplications).values({
      userId: dbCreator.id,
      penName: "Awan Jingga",
      bio: "Penulis novel fiksi ilmiah dari Yogyakarta",
      status: "pending",
    });

    // Seed pending publisher
    const pubSlug = `pending-pub-${randomUUID().slice(0, 6)}`;
    const [seededPub] = await db
      .insert(publishers)
      .values({
        slug: pubSlug,
        name: "Penerbit Mandiri Perkasa",
        contactEmail: "info@mandiriperkasa.co.id",
        verificationStatus: "pending",
      })
      .returning();

    // Seed pending manuscript
    await db.insert(manuscriptSubmissions).values({
      authorUserId: dbCreator.id,
      publisherId: seededPub.id,
      title: "Jelajah Galaksi Timur",
      synopsis: "Petualangan penjelajah ruang angkasa di gugus bintang timur.",
      proposedDigitalPolicy: "hybrid_nakama_alacarte",
      status: "pending_review",
    });

    // Seed financial records: paid membership, ala carte purchase, community wallet
    await db.insert(membershipOrders).values({
      requestId: randomUUID(),
      buyerId: dbCreator.id,
      beneficiaryId: dbCreator.id,
      planId: "quarterly",
      months: 3,
      priceIdr: 100_000,
      currency: "IDR",
      status: "paid",
    });

    const [testBook] = await db
      .insert(books)
      .values({
        slug: `fin-book-${randomUUID().slice(0, 8)}`,
        title: "Buku Finansial",
        author: "Pakar Keuangan",
        synopsis: "Panduan keuangan sehat.",
        coverUrl: "/covers/fin.jpg",
        digitalPolicy: "alacarte_only",
        pageCount: 150,
      })
      .returning();

    await db.insert(bookPurchases).values({
      userId: dbCreator.id,
      bookId: testBook.id,
      priceIdr: 50_000,
      publisherShareIdr: 37_500,
      affiliateCalendarId: seededCal.id,
      affiliateCommissionIdr: 5_000,
      anzabookNetIdr: 7_500,
      status: "paid",
    });

    await db.insert(communityWalletLedgers).values({
      calendarId: seededCal.id,
      entryType: "affiliate_book_purchase",
      amountIdr: 5_000,
      description: "Komisi penjualan buku alacarte",
    });

    const res = await admin.get("/api/admin/overview");
    expect(res.status).toBe(200);
    expect(res.body.data.pendingCalendarsCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pendingAuthorsCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pendingPublishersCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pendingManuscriptsCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalAlacarteSalesIdr).toBeGreaterThanOrEqual(50_000);
    expect(res.body.data.totalPublisherShareIdr).toBeGreaterThanOrEqual(37_500);
    expect(res.body.data.totalAffiliateCommissionsIdr).toBeGreaterThanOrEqual(
      5_000,
    );
    expect(
      res.body.data.estimatedNakamaRoyaltyPoolIdr,
    ).toBeGreaterThanOrEqual(55_000); // 55% of 100,000 IDR
  });

  it("verifies community calendar (PATCH /api/admin/calendars/:id/verify)", async () => {
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Calendar Reviewer");
    await setRole(adminEmail, "admin");

    const userClient = agent();
    const userEmail = await signUp(userClient, "Komunitas Host");
    const [dbUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, userEmail));

    const slug = `cal-verify-${randomUUID().slice(0, 6)}`;
    const [cal] = await db
      .insert(communityCalendars)
      .values({
        slug,
        name: "Komunitas Pembaca Borobudur",
        type: "community",
        description: "Diskusi literatur sejarah dan arsitektur candi.",
        verificationStatus: "pending",
        createdByUserId: dbUser.id,
      })
      .returning();

    // Verify calendar
    const verifyRes = await admin
      .patch(`/api/admin/calendars/${cal.id}/verify`)
      .set(originHeader)
      .send({ verificationStatus: "verified" });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verificationStatus).toBe("verified");

    // List verified calendars
    const listRes = await admin.get("/api/admin/calendars?status=verified");
    expect(listRes.status).toBe(200);
    const found = listRes.body.data.find(
      (c: { id: string }) => c.id === cal.id,
    );
    expect(found).toBeDefined();
    expect(found.verificationStatus).toBe("verified");
  });

  it("reviews author application and links claimed book (PATCH /api/admin/author-applications/:id/review)", async () => {
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Author Reviewer");
    await setRole(adminEmail, "admin");

    const authorClient = agent();
    const authorEmail = await signUp(authorClient, "Penulis Berbakat");
    const [dbAuthor] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, authorEmail));

    // Create an existing book without authorUserId
    const [unclaimedBook] = await db
      .insert(books)
      .values({
        slug: `unclaimed-book-${randomUUID().slice(0, 8)}`,
        title: "Kembara Malam",
        author: "Arya Dwipangga",
        synopsis: "Kisah pengembara malam mencari jawaban teka-teki leluhur.",
        coverUrl: "/covers/kembara.jpg",
        pageCount: 220,
        digitalPolicy: "hybrid_nakama_alacarte",
      })
      .returning();

    // Submit author application with claimedBookId
    const [appRow] = await db
      .insert(authorApplications)
      .values({
        userId: dbAuthor.id,
        penName: "Arya Dwipangga",
        bio: "Penulis fiksi sejarah nusantara dengan 3 novel cetak.",
        portfolioUrl: "https://aryadwipangga.id",
        claimedBookId: unclaimedBook.id,
        status: "pending",
      })
      .returning();

    // Admin approves author application
    const reviewRes = await admin
      .patch(`/api/admin/author-applications/${appRow.id}/review`)
      .set(originHeader)
      .send({
        status: "verified",
        reviewNotes: "Dokumen KTP dan hak cipta buku terverifikasi valid.",
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.status).toBe("verified");
    expect(reviewRes.body.data.reviewNotes).toBe(
      "Dokumen KTP dan hak cipta buku terverifikasi valid.",
    );

    // Verify user table updated
    const [updatedUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, dbAuthor.id));
    expect(updatedUser.authorStatus).toBe("verified");
    expect(updatedUser.authorPenName).toBe("Arya Dwipangga");

    // Verify claimed book linked to author's user ID
    const [updatedBook] = await db
      .select()
      .from(books)
      .where(eq(books.id, unclaimedBook.id));
    expect(updatedBook.authorUserId).toBe(dbAuthor.id);
  });

  it("verifies publisher (PATCH /api/admin/publishers/:id/verify)", async () => {
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Publisher Verifier");
    await setRole(adminEmail, "admin");

    const pubSlug = `pub-verify-${randomUUID().slice(0, 6)}`;
    const [pub] = await db
      .insert(publishers)
      .values({
        slug: pubSlug,
        name: "Penerbit Cakrawala Ilmu",
        ikapiNumber: "IKAPI-CKR-2026",
        city: "Bandung",
        contactEmail: "redaksi@cakrawalailmu.com",
        verificationStatus: "pending",
      })
      .returning();

    // Verify publisher
    const verifyRes = await admin
      .patch(`/api/admin/publishers/${pub.id}/verify`)
      .set(originHeader)
      .send({ verificationStatus: "verified" });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verificationStatus).toBe("verified");
    expect(verifyRes.body.data.verifiedAt).not.toBeNull();

    // Check in GET /api/admin/publishers?status=verified
    const listRes = await admin.get("/api/admin/publishers?status=verified");
    expect(listRes.status).toBe(200);
    const found = listRes.body.data.find(
      (p: { id: string }) => p.id === pub.id,
    );
    expect(found).toBeDefined();
    expect(found.verificationStatus).toBe("verified");
  });

  it("edits manuscript and publishes it atomically to production catalog, generating 500 initial claim codes for print_claim_only", async () => {
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Chief Editor");
    await setRole(adminEmail, "admin");

    const authorClient = agent();
    const authorEmail = await signUp(authorClient, "Novelis Cetak");
    const [dbAuthor] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, authorEmail));

    const [pub] = await db
      .insert(publishers)
      .values({
        slug: `pub-manuscript-${randomUUID().slice(0, 6)}`,
        name: "Penerbit Lentera Kata",
        verificationStatus: "verified",
      })
      .returning();

    // Seed manuscript submission with 2 chapters
    const [manuscript] = await db
      .insert(manuscriptSubmissions)
      .values({
        authorUserId: dbAuthor.id,
        publisherId: pub.id,
        title: "Buku Phygital Nusantara",
        synopsis: "Buku edisi cetak eksklusif dengan kode klaim digital.",
        proposedDigitalPolicy: "print_claim_only",
        proposedAlacartePriceIdr: 0,
        status: "pending_review",
      })
      .returning();

    await db.insert(manuscriptChapters).values([
      {
        manuscriptId: manuscript.id,
        chapterNumber: 1,
        titleId: "Bab 1: Awal Mula Cetak",
        contentId: "Isi bab 1 pratinjau buku cetak...",
        estimatedMinutes: 6,
      },
      {
        manuscriptId: manuscript.id,
        chapterNumber: 2,
        titleId: "Bab 2: Kunci Digital Tersembunyi",
        contentId: "Isi bab 2 rahasia yang hanya terbuka dengan kode klaim...",
        estimatedMinutes: 8,
      },
    ]);

    // Admin views manuscript detail
    const detailRes = await admin.get(`/api/admin/manuscripts/${manuscript.id}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.title).toBe("Buku Phygital Nusantara");
    expect(detailRes.body.data.chapters).toHaveLength(2);

    // Admin edits manuscript metadata & chapter
    const patchRes = await admin
      .patch(`/api/admin/manuscripts/${manuscript.id}`)
      .set(originHeader)
      .send({
        synopsis:
          "Sinopsis hasil revisi editor redaksi: Buku edisi cetak phygital premium.",
        status: "in_editing",
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe("in_editing");

    // Admin publishes manuscript
    const publishRes = await admin
      .post(`/api/admin/manuscripts/${manuscript.id}/publish`)
      .set(originHeader)
      .send({
        coverUrl: "/covers/phygital-exclusive.jpg",
      });

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.publishedBookId).toBeDefined();

    const bookId = publishRes.body.data.publishedBookId;

    // Verify book created in `books`
    const [publishedBook] = await db
      .select()
      .from(books)
      .where(eq(books.id, bookId));
    expect(publishedBook).toBeDefined();
    expect(publishedBook.title).toBe("Buku Phygital Nusantara");
    expect(publishedBook.digitalPolicy).toBe("print_claim_only");
    expect(publishedBook.coverUrl).toBe("/covers/phygital-exclusive.jpg");
    expect(publishedBook.totalChapters).toBe(2);
    expect(publishedBook.authorUserId).toBe(dbAuthor.id);

    // Verify chapters copied to `bookChapters`
    const chapters = await db
      .select()
      .from(bookChapters)
      .where(eq(bookChapters.bookId, bookId));
    expect(chapters).toHaveLength(2);

    // Verify initial batch of 500 free claim codes generated
    const [initialBatch] = await db
      .select()
      .from(bookClaimBatches)
      .where(eq(bookClaimBatches.bookId, bookId));
    expect(initialBatch).toBeDefined();
    expect(initialBatch.billingStatus).toBe("free_tier");
    expect(initialBatch.unitFeeIdr).toBe(0);
    expect(initialBatch.totalCodes).toBe(500);

    const codes = await db
      .select()
      .from(bookClaimCodes)
      .where(eq(bookClaimCodes.batchId, initialBatch.id));
    expect(codes).toHaveLength(500);
    expect(codes[0].code.length).toBe(16);

    // Verify manuscript status updated to "published"
    const [updatedManuscript] = await db
      .select()
      .from(manuscriptSubmissions)
      .where(eq(manuscriptSubmissions.id, manuscript.id));
    expect(updatedManuscript.status).toBe("published");
    expect(updatedManuscript.publishedBookId).toBe(bookId);
  });

  it("generates subsequent claim batch (billed at Rp2.000/code) and exports codes (POST & GET /api/admin/claim-batches)", async () => {
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Batch Controller");
    await setRole(adminEmail, "admin");

    const [pub] = await db
      .insert(publishers)
      .values({
        slug: `pub-batch-${randomUUID().slice(0, 6)}`,
        name: "Penerbit Utama",
        verificationStatus: "verified",
        claimCodeFeeIdr: 2000,
      })
      .returning();

    const [book] = await db
      .insert(books)
      .values({
        slug: `claim-book-${randomUUID().slice(0, 8)}`,
        title: "Koleksi Puisi Kontemporer",
        author: "Penyair Muda",
        synopsis: "Antologi puisi pilihan nusantara.",
        coverUrl: "/covers/puisi.jpg",
        digitalPolicy: "print_claim_only",
        publisherId: pub.id,
        pageCount: 180,
      })
      .returning();

    // 1. Generate First Batch (free tier)
    const batch1Res = await admin
      .post("/api/admin/claim-batches")
      .set(originHeader)
      .send({
        bookId: book.id,
        publisherId: pub.id,
        batchName: "Cetakan Pertama 500 Eks",
        totalCodes: 50,
      });

    expect(batch1Res.status).toBe(201);
    expect(batch1Res.body.data.batch.billingStatus).toBe("free_tier");
    expect(batch1Res.body.data.batch.unitFeeIdr).toBe(0);
    expect(batch1Res.body.data.batch.totalCodes).toBe(50);
    expect(batch1Res.body.data.codes).toHaveLength(50);

    // 2. Generate Second Batch (subsequent -> unbilled, Rp2.000/code)
    const batch2Res = await admin
      .post("/api/admin/claim-batches")
      .set(originHeader)
      .send({
        bookId: book.id,
        publisherId: pub.id,
        batchName: "Cetakan Kedua Tambahan Gramedia",
        totalCodes: 100,
      });

    expect(batch2Res.status).toBe(201);
    expect(batch2Res.body.data.batch.billingStatus).toBe("unbilled");
    expect(batch2Res.body.data.batch.unitFeeIdr).toBe(2000);
    expect(batch2Res.body.data.batch.totalCodes).toBe(100);
    expect(batch2Res.body.data.codes).toHaveLength(100);

    const batch2Id = batch2Res.body.data.batch.id;

    // 3. Export codes for printing: GET /api/admin/claim-batches/:id/codes
    const exportRes = await admin.get(
      `/api/admin/claim-batches/${batch2Id}/codes`,
    );
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.data.batch.id).toBe(batch2Id);
    expect(exportRes.body.data.codes).toHaveLength(100);
    expect(exportRes.body.data.codes[0].code.length).toBe(16);
  });
});
