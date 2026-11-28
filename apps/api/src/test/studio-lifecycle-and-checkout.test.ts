import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  agent,
  originHeader,
  setAuthorStatus,
  setRole,
  signUp,
} from "./helpers";
import { env } from "../config/env";
import { db } from "../db";
import {
  bookChapters,
  bookClaimCodes,
  bookPurchases,
  books,
  communityCalendars,
  communityWalletLedgers,
  manuscriptSubmissions,
  memberships,
  user,
} from "../db/schema";

describe("Studio Lifecycle, Safe Deletion, Catalog Revision & Single Purchase Midtrans Checkout", () => {
  it("allows empty manuscript draft without fake placeholder text, enforces completeness on submit, and enforces safe delete rules", async () => {
    const author = agent();
    const authorEmail = await signUp(author, "Penulis Draf");
    await setAuthorStatus(authorEmail, "verified");

    const owner = agent();
    await signUp(owner, "Pemilik Penerbit");
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Uji");
    await setRole(adminEmail, "admin");

    const pubSlug = `penerbit-${randomUUID().slice(0, 6)}`;
    const pubRes = await owner
      .post("/api/publisher/apply")
      .set(originHeader)
      .send({ name: "Penerbit Uji Hapus", slug: pubSlug });
    expect(pubRes.status).toBe(201);
    const pubId = pubRes.body.data.id as string;

    await admin
      .patch(`/api/admin/publishers/${pubId}/verify`)
      .set(originHeader)
      .send({ verificationStatus: "verified" });

    // 1. Empty draft creation (no fake title/synopsis/chapter strings)
    const draftRes = await author
      .post("/api/publisher/manuscripts/drafts")
      .set(originHeader)
      .send({
        title: "",
        synopsis: "",
        proposedDigitalPolicy: "free_open",
      });
    expect(draftRes.status).toBe(201);
    expect(draftRes.body.data.title).toBe("");
    expect(draftRes.body.data.synopsis).toBe("");
    expect(draftRes.body.data.chapters?.[0]?.titleId).toBe("");

    const draftId = draftRes.body.data.id as string;

    // 1b. Template cover ("template") & explicit coverColor persist cleanly on empty draft
    const coverPatch = await author
      .patch(`/api/publisher/manuscripts/${draftId}`)
      .set(originHeader)
      .send({
        coverUrl: "template",
        coverColor: "#284B63",
        title: "Sementara",
      });
    expect(coverPatch.status).toBe(200);
    expect(coverPatch.body.data.coverUrl).toBe("template");
    expect(coverPatch.body.data.coverColor).toBe("#284B63");

    // 1c. Clearing title back to empty "" persists without reverting to old title
    const clearTitlePatch = await author
      .patch(`/api/publisher/manuscripts/${draftId}`)
      .set(originHeader)
      .send({
        title: "",
      });
    expect(clearTitlePatch.status).toBe(200);
    expect(clearTitlePatch.body.data.title).toBe("");
    expect(clearTitlePatch.body.data.coverUrl).toBe("template");

    const draftAfterReload = await author.get(
      `/api/publisher/manuscripts/${draftId}`,
    );
    expect(draftAfterReload.status).toBe(200);
    expect(draftAfterReload.body.data.title).toBe("");
    expect(draftAfterReload.body.data.coverUrl).toBe("template");
    expect(draftAfterReload.body.data.coverColor).toBe("#284B63");

    // 2. Submitting an incomplete empty draft must fail cleanly with 400 MANUSCRIPT_INCOMPLETE
    const badSubmit = await author
      .post(`/api/publisher/manuscripts/${draftId}/submit`)
      .set(originHeader)
      .send({ publisherId: pubId });
    expect(badSubmit.status).toBe(400);
    expect(badSubmit.body.error.code).toBe("MANUSCRIPT_INCOMPLETE");

    // 3. Author can delete their own draft
    const delDraft = await author
      .delete(`/api/publisher/manuscripts/${draftId}`)
      .set(originHeader);
    expect(delDraft.status).toBe(200);
    expect(delDraft.body.data.deleted).toBe(true);

    // 4. Create complete draft -> submit -> withdrawFirst delete -> works; in_editing blocks author delete
    const validDraft = await author
      .post("/api/publisher/manuscripts/drafts")
      .set(originHeader)
      .send({
        title: "Naskah Lengkap Uji Hapus",
        synopsis: "Sinopsis lengkap minimal sepuluh karakter untuk diuji.",
        proposedDigitalPolicy: "nakama_subscription",
        chapters: [
          {
            chapterNumber: 1,
            titleId: "Bab Pertama",
            contentId:
              "<p>Isi paragraf pertama yang memadai untuk diajukan.</p>",
          },
        ],
      });
    expect(validDraft.status).toBe(201);
    const msId = validDraft.body.data.id as string;

    const submitOk = await author
      .post(`/api/publisher/manuscripts/${msId}/submit`)
      .set(originHeader)
      .send({ publisherId: pubId });
    expect(submitOk.status).toBe(200);

    // Publisher moves to in_editing
    const editReview = await owner
      .post(`/api/publisher/${pubSlug}/manuscripts/${msId}/review`)
      .set(originHeader)
      .send({ action: "start_editing" });
    expect(editReview.status).toBe(200);

    // Author CANNOT delete when in_editing
    const lockedDel = await author
      .delete(`/api/publisher/manuscripts/${msId}`)
      .set(originHeader);
    expect(lockedDel.status).toBe(409);

    // Reject & publisher can dismiss/delete from inbox while author can delete their rejected copy
    const rejectRes = await owner
      .post(`/api/publisher/${pubSlug}/manuscripts/${msId}/review`)
      .set(originHeader)
      .send({ action: "reject", notes: "Kurang cocok" });
    expect(rejectRes.status).toBe(200);

    const pubDismiss = await owner
      .delete(`/api/publisher/${pubSlug}/manuscripts/${msId}`)
      .set(originHeader);
    expect(pubDismiss.status).toBe(200);

    const [afterDismiss] = await db
      .select()
      .from(manuscriptSubmissions)
      .where(eq(manuscriptSubmissions.id, msId));
    expect(afterDismiss).toBeDefined();
    expect(afterDismiss.publisherId).toBeNull();

    const authorDelRejected = await author
      .delete(`/api/publisher/manuscripts/${msId}`)
      .set(originHeader);
    expect(authorDelRejected.status).toBe(200);
  });

  it("supports catalog revision-draft & in-place republish, hard-delete without purchases, and soft-archive with paid purchases", async () => {
    const owner = agent();
    const ownerEmail = await signUp(owner, "Pemilik Katalog");
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Katalog");
    await setRole(adminEmail, "admin");

    const pubSlug = `pub-rev-${randomUUID().slice(0, 6)}`;
    const pubRes = await owner
      .post("/api/publisher/apply")
      .set(originHeader)
      .send({ name: "Penerbit Revisi", slug: pubSlug });
    const pubId = pubRes.body.data.id as string;
    await admin
      .patch(`/api/admin/publishers/${pubId}/verify`)
      .set(originHeader)
      .send({ verificationStatus: "verified" });

    // Create 2 manuscripts as owner and publish both
    const [ownerRow] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, ownerEmail));

    await setAuthorStatus(ownerEmail, "verified");

    const draft1 = await owner
      .post("/api/publisher/manuscripts/drafts")
      .set(originHeader)
      .send({
        publisherId: pubId,
        title: "Buku Tanpa Pembeli",
        synopsis: "Sinopsis buku yang belum dibeli siapapun sama sekali.",
        proposedDigitalPolicy: "free_open",
        chapters: [
          {
            chapterNumber: 1,
            titleId: "Bab 1",
            contentId: "Paragraf awal sebelum revisi editorial.",
          },
        ],
      });
    const ms1Id = draft1.body.data.id as string;
    await owner
      .post(`/api/publisher/manuscripts/${ms1Id}/submit`)
      .set(originHeader)
      .send({ publisherId: pubId });
    const pub1 = await owner
      .post(`/api/publisher/${pubSlug}/manuscripts/${ms1Id}/publish`)
      .set(originHeader)
      .send({ digitalPolicy: "free_open" });
    expect(pub1.status).toBe(200);
    const book1Id = pub1.body.data.publishedBookId as string;

    // 1. Create revision-draft from live book1
    const revRes = await owner
      .post(`/api/publisher/${pubSlug}/books/${book1Id}/revision-draft`)
      .set(originHeader);
    expect(revRes.status).toBe(200);
    expect(revRes.body.data.isCatalogRevision).toBe(true);
    expect(revRes.body.data.publishedBookId).toBe(book1Id);
    const revId = revRes.body.data.id as string;

    // Revision appears on Katalog Terbit (activeRevisionManuscriptId) and NOT in Kotak Masuk Naskah
    const catalogBeforeRepublish = await owner.get(
      `/api/publisher/${pubSlug}/books`,
    );
    expect(catalogBeforeRepublish.status).toBe(200);
    const foundCatalogBook = catalogBeforeRepublish.body.data.find(
      (b: { id: string }) => b.id === book1Id,
    );
    expect(foundCatalogBook.activeRevisionManuscriptId).toBe(revId);

    const inboxList = await owner.get(`/api/publisher/${pubSlug}/manuscripts`);
    expect(
      inboxList.body.data.some((m: { id: string }) => m.id === revId),
    ).toBe(false);

    // Edit revision draft & republish in-place
    await owner
      .patch(`/api/publisher/${pubSlug}/manuscripts/${revId}`)
      .set(originHeader)
      .send({ title: "Buku Revisi Final" });

    const republishRes = await owner
      .post(`/api/publisher/${pubSlug}/manuscripts/${revId}/publish`)
      .set(originHeader)
      .send({ digitalPolicy: "free_open" });
    expect(republishRes.status).toBe(200);
    expect(republishRes.body.data.publishedBookId).toBe(book1Id);
    expect(republishRes.body.data.book.title).toBe("Buku Revisi Final");

    // 2. Delete book1 with 0 paid purchases -> hard delete
    const hardDelRes = await owner
      .delete(`/api/publisher/${pubSlug}/books/${book1Id}`)
      .set(originHeader);
    expect(hardDelRes.status).toBe(200);
    expect(hardDelRes.body.data.deleted).toBe(true);
    expect(hardDelRes.body.data.archived).toBe(false);

    // 3. Create book2 with a paid purchase -> deleting must soft-archive and keep buyer reader access!
    const buyer = agent();
    const buyerEmail = await signUp(buyer, "Pembeli Setia");
    const [buyerRow] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, buyerEmail));

    const [book2] = await db
      .insert(books)
      .values({
        slug: `paid-book-${randomUUID().slice(0, 6)}`,
        title: "Buku Berbayar Terarsip",
        author: "Penulis",
        coverUrl: "/covers/default-book.jpg",
        synopsis: "Sinopsis buku berbayar yang sudah dibeli.",
        pageCount: 120,
        totalChapters: 1,
        digitalPolicy: "single_purchase",
        accessTier: "premium",
        digitalPriceIdr: 99_000,
        hasPhysical: false,
        publisherId: pubId,
        authorUserId: ownerRow.id,
      })
      .returning();

    await db.insert(bookPurchases).values({
      userId: buyerRow.id,
      bookId: book2.id,
      priceIdr: 99_000,
      publisherShareIdr: 74_250,
      affiliateCommissionIdr: 0,
      anzabookNetIdr: 24_750,
      status: "paid",
      paidAt: new Date(),
    });

    const softDelRes = await owner
      .delete(`/api/publisher/${pubSlug}/books/${book2.id}`)
      .set(originHeader);
    expect(softDelRes.status).toBe(200);
    expect(softDelRes.body.data.deleted).toBe(false);
    expect(softDelRes.body.data.archived).toBe(true);

    // Hidden from public catalog & studio list
    const publicList = await owner.get("/api/books");
    expect(
      publicList.body.data.some((b: { id: string }) => b.id === book2.id),
    ).toBe(false);
    const studioList = await owner.get(`/api/publisher/${pubSlug}/books`);
    expect(
      studioList.body.data.some((b: { id: string }) => b.id === book2.id),
    ).toBe(false);

    // Still readable by paid buyer, denied for non-buyer!
    const nonBuyer = agent();
    await signUp(nonBuyer, "Bukan Pembeli");
    const deniedDetail = await nonBuyer.get(`/api/books/${book2.slug}`);
    expect(deniedDetail.status).toBe(404);
    const buyerDetail = await buyer.get(`/api/books/${book2.slug}`);
    expect(buyerDetail.status).toBe(200);
  });

  it("runs Midtrans single book checkout, webhook settlement + 10% affiliate, keeps Nakama locked, and keeps ClaimCodeDialog working", async () => {
    const buyer = agent();
    const buyerEmail = await signUp(buyer, "Pembeli Satuan Midtrans");
    const [buyerRow] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, buyerEmail));

    // Buyer even has active Nakama membership, yet single_purchase MUST stay locked until bought or claimed
    await db.insert(memberships).values({
      userId: buyerRow.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const slug = `single-midtrans-${randomUUID().slice(0, 6)}`;
    const [book] = await db
      .insert(books)
      .values({
        slug,
        title: "Revolusi Digital Eksklusif",
        author: "AnzaBook",
        coverUrl: "/covers/revolusi-cetak.svg",
        synopsis: "Buku berbayar satuan via Midtrans Sandbox.",
        pageCount: 200,
        totalChapters: 2,
        digitalPolicy: "single_purchase",
        accessTier: "premium",
        digitalPriceIdr: 129_000,
        hasPhysical: false,
      })
      .returning();

    await db.insert(bookChapters).values({
      bookId: book.id,
      chapterNumber: 1,
      titleId: "Bab 1: Sampel",
      contentId:
        "Paragraf pembuka.\n\nParagraf kedua untuk pratinjau terkunci.",
    });

    const calSlug = `cal-aff-${randomUUID().slice(0, 6)}`;
    const [calendar] = await db
      .insert(communityCalendars)
      .values({
        slug: calSlug,
        name: "Komunitas Afiliasi Buku",
        type: "community",
        verificationStatus: "verified",
        createdByUserId: buyerRow.id,
      })
      .returning();

    const ch1Locked = await buyer.get(
      `/api/books/${slug}/read?chapter=1&mode=full`,
    );
    expect(ch1Locked.status).toBe(200);
    expect(ch1Locked.body.data.hasFullAccess).toBe(false);

    // Mock Midtrans fetch
    const origFetch = globalThis.fetch;
    const prevKey = env.MIDTRANS_SERVER_KEY;
    const prevTax = env.membershipTaxRateBps;
    env.MIDTRANS_SERVER_KEY = "SB-Mid-server-test-key";
    env.membershipTaxRateBps = 1100;
    let capturedOrderId = "";
    let grossAmountStr = "";

    globalThis.fetch = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/snap/v1/transactions")) {
        const body = JSON.parse(String(init?.body || "{}")) as {
          transaction_details: { order_id: string; gross_amount: number };
        };
        capturedOrderId = body.transaction_details.order_id;
        grossAmountStr = `${body.transaction_details.gross_amount}.00`;
        return new Response(
          JSON.stringify({
            redirect_url: `https://app.sandbox.midtrans.com/snap/v4/redirection/${capturedOrderId}`,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/v2/") && url.endsWith("/status")) {
        return new Response(
          JSON.stringify({
            order_id: capturedOrderId,
            transaction_id: `tx-${capturedOrderId.slice(0, 8)}`,
            gross_amount: grossAmountStr,
            currency: "IDR",
            payment_type: "qris",
            status_code: "200",
            transaction_status: "settlement",
            fraud_status: "accept",
            settlement_time: "2026-11-28 10:00:00",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return origFetch(input, init);
    }) as typeof fetch;

    try {
      const reqId = randomUUID();
      const checkoutRes = await buyer
        .post(`/api/books/${slug}/checkout`)
        .set(originHeader)
        .send({ requestId: reqId, affiliateCalendarSlug: calSlug });
      expect(checkoutRes.status).toBe(201);
      const purchaseId = checkoutRes.body.data.id as string;
      expect(checkoutRes.body.data.status).toBe("pending");
      expect(checkoutRes.body.data.checkoutUrl).toContain(
        "app.sandbox.midtrans.com",
      );

      // Idempotent retry returns same pending purchase
      const retryRes = await buyer
        .post(`/api/books/${slug}/checkout`)
        .set(originHeader)
        .send({ requestId: reqId, affiliateCalendarSlug: calSlug });
      expect(retryRes.status).toBe(201);
      expect(retryRes.body.data.id).toBe(purchaseId);

      // Before settlement: STILL locked
      const stillLocked = await buyer.get(
        `/api/books/${slug}/read?chapter=1&mode=full`,
      );
      expect(stillLocked.body.data.hasFullAccess).toBe(false);

      // Simulate Midtrans webhook settlement
      const signatureKey = createHash("sha512")
        .update(`${purchaseId}200${grossAmountStr}SB-Mid-server-test-key`)
        .digest("hex");
      const webhookRes = await agent()
        .post("/api/membership/webhooks/midtrans")
        .send({
          order_id: purchaseId,
          status_code: "200",
          gross_amount: grossAmountStr,
          signature_key: signatureKey,
        });
      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body.received).toBe(true);

      // After settlement: FULL access unlocked + 10% affiliate recorded!
      const unlocked = await buyer.get(
        `/api/books/${slug}/read?chapter=1&mode=full`,
      );
      expect(unlocked.body.data.hasFullAccess).toBe(true);

      const detailAfter = await buyer.get(`/api/books/${slug}`);
      expect(detailAfter.body.data.hasPurchasedDigital).toBe(true);

      const ledgers = await db
        .select()
        .from(communityWalletLedgers)
        .where(
          and(
            eq(communityWalletLedgers.calendarId, calendar.id),
            eq(communityWalletLedgers.entryType, "affiliate_book_purchase"),
            eq(communityWalletLedgers.sourceBookPurchaseId, purchaseId),
          ),
        );
      expect(ledgers).toHaveLength(1);
    } finally {
      globalThis.fetch = origFetch;
      env.MIDTRANS_SERVER_KEY = prevKey;
      env.membershipTaxRateBps = prevTax;
    }

    // 4. Print claim code STILL unlocks single_purchase book for a different user
    const codeUser = agent();
    await signUp(codeUser, "Pemilik Kode Cetak");
    const demoCode = `ANZA-SINGLE-${randomUUID().slice(0, 6).toUpperCase()}`;
    await db.insert(bookClaimCodes).values({
      bookId: book.id,
      code: demoCode,
      isDemo: false,
    });
    const claimRes = await codeUser
      .post(`/api/books/${slug}/claim-code`)
      .set(originHeader)
      .send({ code: demoCode });
    expect(claimRes.status).toBe(200);
    const codeAccess = await codeUser.get(
      `/api/books/${slug}/read?chapter=1&mode=full`,
    );
    expect(codeAccess.body.data.hasFullAccess).toBe(true);
  });
});
