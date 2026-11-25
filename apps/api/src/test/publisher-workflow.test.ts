import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { agent, originHeader, setRole, signUp } from "./helpers";
import { db } from "../db";
import {
  bookChapters,
  bookClaimBatches,
  bookClaimCodes,
  books,
  manuscriptSubmissions,
  publisherMembers,
  publishers,
  storeBranches,
  user,
} from "../db/schema";
import { ensureSeededCatalog } from "../services/seed.service";

describe("Publisher Publishing Workflow, Topic-Ranked Targets & Team RBAC (Issue #9)", () => {
  it("ranks submission targets (anzabook pinned first -> topic match -> totalBooks -> name) and returns /mine for all statuses", async () => {
    await ensureSeededCatalog();

    const suffix = randomUUID().slice(0, 6);
    const ownerClient = agent();
    const ownerEmail = await signUp(ownerClient, "Pemilik Penerbit Topik");
    const [dbOwner] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, ownerEmail));

    const slugHighBooks = `pub-hist-high-${suffix}`;
    const slugLowBooks = `pub-hist-low-${suffix}`;
    const slugClosed = `pub-closed-${suffix}`;
    const slugRejected = `pub-rejected-${suffix}`;

    const [pubHigh] = await db
      .insert(publishers)
      .values({
        name: `Lentera Sejarah ${suffix}`,
        slug: slugHighBooks,
        city: "Yogyakarta",
        topics: [`Sejarah-${suffix}`, "Sastra"],
        verificationStatus: "verified",
        isAcceptingSubmissions: true,
      })
      .returning();

    await db.insert(publishers).values({
      name: `Bintang Sejarah ${suffix}`,
      slug: slugLowBooks,
      city: "Bandung",
      topics: [`Sejarah-${suffix}`, "Filsafat"],
      verificationStatus: "verified",
      isAcceptingSubmissions: true,
    });

    const [pubClosed] = await db
      .insert(publishers)
      .values({
        name: `Tutup Naskah ${suffix}`,
        slug: slugClosed,
        topics: [`Sejarah-${suffix}`],
        verificationStatus: "verified",
        isAcceptingSubmissions: false,
      })
      .returning();

    const [pubRejected] = await db
      .insert(publishers)
      .values({
        name: `Ditolak Verif ${suffix}`,
        slug: slugRejected,
        topics: [`Sejarah-${suffix}`],
        verificationStatus: "rejected",
        rejectionReason: "Dokumen IKAPI tidak terbaca.",
        isAcceptingSubmissions: true,
      })
      .returning();

    // Give pubHigh 2 books and pubLow 0 books to verify totalBooks tie-breaking
    await db.insert(books).values([
      {
        slug: `hist-book-1-${suffix}`,
        title: "Sejarah Satu",
        author: "Penulis",
        synopsis: "Sinopsis buku sejarah satu.",
        coverUrl: "/covers/default-book.jpg",
        pageCount: 120,
        publisherId: pubHigh.id,
      },
      {
        slug: `hist-book-2-${suffix}`,
        title: "Sejarah Dua",
        author: "Penulis",
        synopsis: "Sinopsis buku sejarah dua.",
        coverUrl: "/covers/default-book.jpg",
        pageCount: 140,
        publisherId: pubHigh.id,
      },
    ]);

    await db.insert(publisherMembers).values([
      { publisherId: pubHigh.id, userId: dbOwner.id, role: "owner" },
      { publisherId: pubClosed.id, userId: dbOwner.id, role: "editor" },
      { publisherId: pubRejected.id, userId: dbOwner.id, role: "owner" },
    ]);

    // 1. /api/publisher/submission-targets?topic=... pins anzabook at index 0, excludes closed/unverified, ranks by topic -> totalBooks
    const targetsRes = await ownerClient.get(
      `/api/publisher/submission-targets?topic=${encodeURIComponent(`Sejarah-${suffix}`)}`,
    );
    expect(targetsRes.status).toBe(200);
    const targets = targetsRes.body.data as Array<{
      slug: string;
      topicMatchScore?: number;
      matchedTopics?: string[];
      totalBooks?: number;
    }>;

    expect(targets[0].slug).toBe("anzabook");
    expect(targets.some((p) => p.slug === slugClosed)).toBe(false);
    expect(targets.some((p) => p.slug === slugRejected)).toBe(false);

    const idxHigh = targets.findIndex((p) => p.slug === slugHighBooks);
    const idxLow = targets.findIndex((p) => p.slug === slugLowBooks);
    expect(idxHigh).toBeGreaterThan(0);
    expect(idxLow).toBeGreaterThan(idxHigh);
    expect(targets[idxHigh].matchedTopics).toContain(`Sejarah-${suffix}`);
    expect(targets[idxHigh].topicMatchScore).toBeGreaterThan(0);
    expect(targets[idxHigh].totalBooks).toBe(2);

    // 2. When q filters out anzabook, only matching targets are returned
    const filteredRes = await ownerClient.get(
      `/api/publisher/submission-targets?q=${encodeURIComponent(slugLowBooks)}`,
    );
    expect(filteredRes.status).toBe(200);
    expect(filteredRes.body.data).toHaveLength(1);
    expect(filteredRes.body.data[0].slug).toBe(slugLowBooks);

    // 3. /api/publisher/mine returns ALL managed publishers regardless of verificationStatus
    const mineRes = await ownerClient.get("/api/publisher/mine");
    expect(mineRes.status).toBe(200);
    const mine = mineRes.body.data as Array<{
      slug: string;
      verificationStatus: string;
      role: string;
      topics?: string[];
    }>;
    expect(mine.find((p) => p.slug === slugHighBooks)?.role).toBe("owner");
    expect(mine.find((p) => p.slug === slugClosed)?.role).toBe("editor");
    expect(mine.find((p) => p.slug === slugRejected)).toMatchObject({
      verificationStatus: "rejected",
      role: "owner",
    });
  });

  it("enforces anzabook auto-assignment fallback, author edit lock, and blocks status escalation or foreign access", async () => {
    await ensureSeededCatalog();

    const author = agent();
    await signUp(author, "Penulis Draf");

    const outsider = agent();
    await signUp(outsider, "Pengguna Asing");

    const sysAdmin = agent();
    const sysAdminEmail = await signUp(sysAdmin, "Admin Bukan Penerbit");
    await setRole(sysAdminEmail, "admin");

    const [anzabookPub] = await db
      .select({ id: publishers.id })
      .from(publishers)
      .where(eq(publishers.slug, "anzabook"))
      .limit(1);
    expect(anzabookPub).toBeDefined();

    // Direct submission without publisherId falls back to official anzabook
    const directRes = await author
      .post("/api/publisher/manuscripts")
      .set(originHeader)
      .send({
        title: "Naskah Mandiri Langsung",
        synopsis: "Sinopsis lengkap minimal sepuluh karakter untuk validasi.",
        proposedDigitalPolicy: "free_open",
      });
    expect(directRes.status).toBe(201);
    expect(directRes.body.data.publisherId).toBe(anzabookPub.id);
    expect(directRes.body.data.status).toBe("pending_review");

    // Create draft without publisherId
    const draftRes = await author
      .post("/api/publisher/manuscripts/drafts")
      .set(originHeader)
      .send({
        title: "Draf Awal Penulis",
        synopsis: "Sinopsis draf awal yang masih disusun.",
      });
    expect(draftRes.status).toBe(201);
    const draftId = draftRes.body.data.id as string;

    // Author CANNOT escalate status or set editorialNotes via PATCH
    const escalateRes = await author
      .patch(`/api/publisher/manuscripts/${draftId}`)
      .set(originHeader)
      .send({
        title: "Draf Escalated",
        status: "published",
      });
    expect(escalateRes.status).toBe(422);

    // Author CAN edit draft fields while status is draft
    const validPatchRes = await author
      .patch(`/api/publisher/manuscripts/${draftId}`)
      .set(originHeader)
      .send({
        title: "Draf Revisi Penulis",
        synopsis: "Sinopsis yang diperbarui secara sah oleh penulis.",
      });
    expect(validPatchRes.status).toBe(200);
    expect(validPatchRes.body.data.title).toBe("Draf Revisi Penulis");

    // Non-author & non-member system admin cannot read or patch author draft (no isSysAdmin bypass!)
    const adminReadDraft = await sysAdmin.get(
      `/api/publisher/manuscripts/${draftId}`,
    );
    expect(adminReadDraft.status).toBe(403);

    const outsiderPatchDraft = await outsider
      .patch(`/api/publisher/manuscripts/${draftId}`)
      .set(originHeader)
      .send({ title: "Dibajak" });
    expect(outsiderPatchDraft.status).toBe(403);

    // Submit draft without publisherId -> auto-assigns anzabook and locks author edits
    const submitRes = await author
      .post(`/api/publisher/manuscripts/${draftId}/submit`)
      .set(originHeader)
      .send({});
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.publisherId).toBe(anzabookPub.id);
    expect(submitRes.body.data.status).toBe("pending_review");

    const lockedPatchRes = await author
      .patch(`/api/publisher/manuscripts/${draftId}`)
      .set(originHeader)
      .send({ title: "Ubah Setelah Submit" });
    expect(lockedPatchRes.status).toBe(409);
    expect(lockedPatchRes.body.error.code).toBe("MANUSCRIPT_LOCKED");
  });

  it("enforces strict RBAC boundaries across system admin, finance, editor, owner, unverified publishers & origin CSRF", async () => {
    const suffix = randomUUID().slice(0, 6);
    const pubSlug = `pub-rbac-${suffix}`;
    const pendingSlug = `pub-pending-${suffix}`;

    const owner = agent();
    await signUp(owner, "Owner RBAC");

    const editor = agent();
    const editorEmail = await signUp(editor, "Editor RBAC");

    const finance = agent();
    const financeEmail = await signUp(finance, "Finance RBAC");

    const sysAdmin = agent();
    const sysAdminEmail = await signUp(sysAdmin, "SysAdmin RBAC");
    await setRole(sysAdminEmail, "admin");

    const author = agent();
    await signUp(author, "Author RBAC");

    // Apply verified & pending publishers
    const applyVerified = await owner
      .post("/api/publisher/apply")
      .set(originHeader)
      .send({ name: `Penerbit RBAC ${suffix}`, slug: pubSlug });
    expect(applyVerified.status).toBe(201);
    const pubId = applyVerified.body.data.id as string;

    const applyPending = await owner
      .post("/api/publisher/apply")
      .set(originHeader)
      .send({ name: `Penerbit Pending ${suffix}`, slug: pendingSlug });
    expect(applyPending.status).toBe(201);
    const pendingPubId = applyPending.body.data.id as string;

    // Admin verifies pubId (governance only), leaves pendingPubId pending
    const verifyRes = await sysAdmin
      .patch(`/api/admin/publishers/${pubId}/verify`)
      .set(originHeader)
      .send({ verificationStatus: "verified" });
    expect(verifyRes.status).toBe(200);

    // Owner adds editor and finance team members
    const addEditorRes = await owner
      .post(`/api/publisher/${pubSlug}/members`)
      .set(originHeader)
      .send({ email: editorEmail, role: "editor" });
    expect(addEditorRes.status).toBe(201);

    const addFinanceRes = await owner
      .post(`/api/publisher/${pubSlug}/members`)
      .set(originHeader)
      .send({ email: financeEmail, role: "finance" });
    expect(addFinanceRes.status).toBe(201);

    // Author submits one manuscript to verified pubId and one to pendingPubId
    const manuVerifiedRes = await author
      .post("/api/publisher/manuscripts")
      .set(originHeader)
      .send({
        publisherId: pubId,
        title: `Naskah Verified ${suffix}`,
        synopsis: "Sinopsis lengkap untuk uji isolasi RBAC.",
        proposedDigitalPolicy: "nakama_or_purchase",
        chapters: [
          { chapterNumber: 1, titleId: "Bab 1", contentId: "Isi bab 1." },
        ],
      });
    expect(manuVerifiedRes.status).toBe(201);
    const manuId = manuVerifiedRes.body.data.id as string;

    const manuPendingRes = await author
      .post("/api/publisher/manuscripts")
      .set(originHeader)
      .send({
        publisherId: pendingPubId,
        title: `Naskah Pending ${suffix}`,
        synopsis: "Sinopsis untuk penerbit yang belum terverifikasi.",
        proposedDigitalPolicy: "free_open",
        chapters: [
          { chapterNumber: 1, titleId: "Bab 1", contentId: "Isi bab 1." },
        ],
      });
    expect(manuPendingRes.status).toBe(201);
    const pendingManuId = manuPendingRes.body.data.id as string;

    // 1. Unverified publisher owner CANNOT publish -> 403 PUBLISHER_NOT_VERIFIED
    const unverifiedPubRes = await owner
      .post(
        `/api/publisher/${pendingSlug}/manuscripts/${pendingManuId}/publish`,
      )
      .set(originHeader)
      .send({});
    expect(unverifiedPubRes.status).toBe(403);
    expect(unverifiedPubRes.body.error.code).toBe("PUBLISHER_NOT_VERIFIED");

    // 2. System Admin gets 403 across ALL publisher editorial/profile/team/book endpoints (zero isSysAdmin bypass!)
    expect(
      (await sysAdmin.get(`/api/publisher/${pubSlug}/manuscripts`)).status,
    ).toBe(403);
    expect(
      (
        await sysAdmin
          .patch(`/api/publisher/${pubSlug}/manuscripts/${manuId}`)
          .set(originHeader)
          .send({ editorialNotes: "Bypass admin" })
      ).status,
    ).toBe(403);
    expect(
      (
        await sysAdmin
          .post(`/api/publisher/${pubSlug}/manuscripts/${manuId}/review`)
          .set(originHeader)
          .send({ action: "start_editing" })
      ).status,
    ).toBe(403);
    expect(
      (
        await sysAdmin
          .post(`/api/publisher/${pubSlug}/manuscripts/${manuId}/publish`)
          .set(originHeader)
          .send({})
      ).status,
    ).toBe(403);
    expect((await sysAdmin.get(`/api/publisher/${pubSlug}/books`)).status).toBe(
      403,
    );
    expect(
      (await sysAdmin.get(`/api/publisher/${pubSlug}/members`)).status,
    ).toBe(403);
    expect(
      (
        await sysAdmin
          .patch(`/api/publisher/${pubSlug}`)
          .set(originHeader)
          .send({ description: "Admin edit" })
      ).status,
    ).toBe(403);

    // 3. Finance role gets 403 on editorial, books, profile & team management
    expect(
      (await finance.get(`/api/publisher/${pubSlug}/manuscripts`)).status,
    ).toBe(403);
    expect(
      (
        await finance
          .post(`/api/publisher/${pubSlug}/manuscripts/${manuId}/publish`)
          .set(originHeader)
          .send({})
      ).status,
    ).toBe(403);
    expect((await finance.get(`/api/publisher/${pubSlug}/books`)).status).toBe(
      403,
    );
    expect(
      (await finance.get(`/api/publisher/${pubSlug}/members`)).status,
    ).toBe(403);
    expect(
      (
        await finance
          .patch(`/api/publisher/${pubSlug}`)
          .set(originHeader)
          .send({ city: "Surabaya" })
      ).status,
    ).toBe(403);

    // 4. Editor cannot edit publisher profile or manage team members (owner only)
    expect(
      (
        await editor
          .patch(`/api/publisher/${pubSlug}`)
          .set(originHeader)
          .send({ city: "Malang" })
      ).status,
    ).toBe(403);
    expect((await editor.get(`/api/publisher/${pubSlug}/members`)).status).toBe(
      403,
    );

    // 5. Missing Origin header on state-changing mutations is rejected with 403
    expect(
      (
        await owner
          .post(`/api/publisher/${pubSlug}/manuscripts/${manuId}/publish`)
          .send({})
      ).status,
    ).toBe(403);
    expect(
      (
        await owner
          .patch(`/api/publisher/${pubSlug}`)
          .send({ description: "No origin" })
      ).status,
    ).toBe(403);
  });

  it("supports review transitions, atomic publishing with 500 claim codes, concurrent double-publish safety, book updates & cross-publisher isolation", async () => {
    const suffix = randomUUID().slice(0, 6);
    const pubASlug = `pub-a-${suffix}`;
    const pubBSlug = `pub-b-${suffix}`;

    const ownerA = agent();
    await signUp(ownerA, "Owner A");
    const editorA = agent();
    const editorAEmail = await signUp(editorA, "Editor A");

    const ownerB = agent();
    await signUp(ownerB, "Owner B");

    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Verifier");
    await setRole(adminEmail, "admin");

    const author = agent();
    await signUp(author, "Novelis Phygital");

    // Create & verify Publisher A and Publisher B
    const applyA = await ownerA
      .post("/api/publisher/apply")
      .set(originHeader)
      .send({
        name: `Penerbit Alpha ${suffix}`,
        slug: pubASlug,
        logoUrl: "/icon.svg",
        topics: ["Fiksi"],
      });
    const pubAId = applyA.body.data.id as string;

    const applyB = await ownerB
      .post("/api/publisher/apply")
      .set(originHeader)
      .send({
        name: `Penerbit Beta ${suffix}`,
        slug: pubBSlug,
      });
    const pubBId = applyB.body.data.id as string;

    await admin
      .patch(`/api/admin/publishers/${pubAId}/verify`)
      .set(originHeader)
      .send({ verificationStatus: "verified" });
    await admin
      .patch(`/api/admin/publishers/${pubBId}/verify`)
      .set(originHeader)
      .send({ verificationStatus: "verified" });

    await ownerA
      .post(`/api/publisher/${pubASlug}/members`)
      .set(originHeader)
      .send({ email: editorAEmail, role: "editor" });

    // Submit manuscript to Publisher A
    const subRes = await author
      .post("/api/publisher/manuscripts")
      .set(originHeader)
      .send({
        publisherId: pubAId,
        title: `Hikayat Nusantara ${suffix}`,
        category: "Sastra Sejarah",
        synopsis: "Kisah epik lintas pulau dari penulis muda Indonesia.",
        proposedDigitalPolicy: "print_code_only",
        chapters: [
          {
            chapterNumber: 1,
            titleId: "Bab 1: Pelabuhan",
            contentId: "Kapal berlayar menembus kabut pagi.",
            estimatedMinutes: 7,
          },
          {
            chapterNumber: 2,
            titleId: "Bab 2: Kompas",
            contentId: "Jarum kompas berputar ke arah selatan.",
            estimatedMinutes: 9,
          },
        ],
      });
    expect(subRes.status).toBe(201);
    const manuscriptId = subRes.body.data.id as string;

    // Cross-publisher isolation: Owner B cannot read, edit, review, or publish Pub A's manuscript
    expect(
      (
        await ownerB
          .post(
            `/api/publisher/${pubBSlug}/manuscripts/${manuscriptId}/publish`,
          )
          .set(originHeader)
          .send({})
      ).status,
    ).toBe(403);
    expect(
      (
        await ownerB
          .post(`/api/publisher/${pubBSlug}/manuscripts/${manuscriptId}/review`)
          .set(originHeader)
          .send({ action: "start_editing" })
      ).status,
    ).toBe(403);

    // Legacy unscoped review endpoint must be 404
    expect(
      (
        await ownerA
          .post(`/api/publisher/manuscripts/${manuscriptId}/review`)
          .set(originHeader)
          .send({ action: "approve" })
      ).status,
    ).toBe(404);

    // Legacy approve action rejected on scoped review endpoint
    expect(
      (
        await editorA
          .post(`/api/publisher/${pubASlug}/manuscripts/${manuscriptId}/review`)
          .set(originHeader)
          .send({ action: "approve" })
      ).status,
    ).toBe(422);

    // Review flow: start_editing -> request_revision -> author updates & resubmits -> publish
    const startEditRes = await editorA
      .post(`/api/publisher/${pubASlug}/manuscripts/${manuscriptId}/review`)
      .set(originHeader)
      .send({ action: "start_editing" });
    expect(startEditRes.status).toBe(200);
    expect(startEditRes.body.data.status).toBe("in_editing");

    const pubEditRes = await editorA
      .patch(`/api/publisher/${pubASlug}/manuscripts/${manuscriptId}`)
      .set(originHeader)
      .send({
        editorialNotes: "Mohon perhalus kalimat pembuka di bab 1.",
      });
    expect(pubEditRes.status).toBe(200);
    expect(pubEditRes.body.data.editorialNotes).toBe(
      "Mohon perhalus kalimat pembuka di bab 1.",
    );

    const revReqRes = await editorA
      .post(`/api/publisher/${pubASlug}/manuscripts/${manuscriptId}/review`)
      .set(originHeader)
      .send({
        action: "request_revision",
        notes: "Silakan perbaiki dialog di bab 1 lalu kirim ulang.",
      });
    expect(revReqRes.status).toBe(200);
    expect(revReqRes.body.data.status).toBe("revision_requested");

    // Author can now edit again while revision_requested
    const authorFixRes = await author
      .patch(`/api/publisher/manuscripts/${manuscriptId}`)
      .set(originHeader)
      .send({
        title: `Hikayat Nusantara Edisi Final ${suffix}`,
      });
    expect(authorFixRes.status).toBe(200);

    const resubmitRes = await author
      .post(`/api/publisher/manuscripts/${manuscriptId}/submit`)
      .set(originHeader)
      .send({});
    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.data.status).toBe("pending_review");

    // Concurrent double-publish via Promise.all -> SELECT ... FOR UPDATE guarantees 1 succeeds and 1 returns 409 ALREADY_PUBLISHED
    const [pubAttempt1, pubAttempt2] = await Promise.all([
      ownerA
        .post(`/api/publisher/${pubASlug}/manuscripts/${manuscriptId}/publish`)
        .set(originHeader)
        .send({ coverUrl: "/covers/hikayat.jpg" }),
      editorA
        .post(`/api/publisher/${pubASlug}/manuscripts/${manuscriptId}/publish`)
        .set(originHeader)
        .send({ coverUrl: "/covers/hikayat.jpg" }),
    ]);

    const statuses = [pubAttempt1.status, pubAttempt2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const winner = pubAttempt1.status === 200 ? pubAttempt1 : pubAttempt2;
    const loser = pubAttempt1.status === 409 ? pubAttempt1 : pubAttempt2;
    expect(loser.body.error.code).toBe("ALREADY_PUBLISHED");

    const publishedBookId = winner.body.data.publishedBookId as string;
    const bookSlug = winner.body.data.book.slug as string;

    // Verify 1 book row, 2 bookChapters, 500 claim codes created, and manuscript marked published
    const createdBooksForTitle = await db
      .select()
      .from(books)
      .where(eq(books.id, publishedBookId));
    expect(createdBooksForTitle).toHaveLength(1);
    expect(createdBooksForTitle[0].publisherId).toBe(pubAId);

    const createdChapters = await db
      .select()
      .from(bookChapters)
      .where(eq(bookChapters.bookId, publishedBookId));
    expect(createdChapters).toHaveLength(2);

    const [batch] = await db
      .select()
      .from(bookClaimBatches)
      .where(eq(bookClaimBatches.bookId, publishedBookId));
    expect(batch).toBeDefined();
    expect(batch.totalCodes).toBe(500);
    expect(batch.billingStatus).toBe("free_tier");

    const codes = await db
      .select({ id: bookClaimCodes.id })
      .from(bookClaimCodes)
      .where(eq(bookClaimCodes.batchId, batch.id));
    expect(codes).toHaveLength(500);

    const [manuscriptAfter] = await db
      .select()
      .from(manuscriptSubmissions)
      .where(eq(manuscriptSubmissions.id, manuscriptId));
    expect(manuscriptAfter.status).toBe("published");
    expect(manuscriptAfter.publishedBookId).toBe(publishedBookId);

    // Public catalog & book detail include joined publisherName, publisherSlug, publisherLogoUrl
    const bookDetailRes = await ownerB.get(`/api/books/${bookSlug}`);
    expect(bookDetailRes.status).toBe(200);
    expect(bookDetailRes.body.data.publisherName).toBe(
      `Penerbit Alpha ${suffix}`,
    );
    expect(bookDetailRes.body.data.publisherSlug).toBe(pubASlug);
    expect(bookDetailRes.body.data.publisherLogoUrl).toBe("/icon.svg");

    const booksListRes = await ownerB.get(
      `/api/books?publisher=${encodeURIComponent(pubASlug)}`,
    );
    expect(booksListRes.status).toBe(200);
    expect(booksListRes.body.data[0].publisherName).toBe(
      `Penerbit Alpha ${suffix}`,
    );
    expect(booksListRes.body.data[0].publisherSlug).toBe(pubASlug);
    expect(booksListRes.body.data[0].publisherLogoUrl).toBe("/icon.svg");

    // Publisher A lists and updates its book; Publisher B cannot mutate Publisher A's book
    const pubBooksRes = await editorA.get(`/api/publisher/${pubASlug}/books`);
    expect(pubBooksRes.status).toBe(200);
    expect(pubBooksRes.body.data).toHaveLength(1);

    const patchBookRes = await editorA
      .patch(`/api/publisher/${pubASlug}/books/${publishedBookId}`)
      .set(originHeader)
      .send({
        title: `Hikayat Nusantara Edisi Cetak ${suffix}`,
        categories: ["Sastra", "Sejarah"],
      });
    expect(patchBookRes.status).toBe(200);
    expect(patchBookRes.body.data.title).toBe(
      `Hikayat Nusantara Edisi Cetak ${suffix}`,
    );

    const crossBookPatchRes = await ownerB
      .patch(`/api/publisher/${pubBSlug}/books/${publishedBookId}`)
      .set(originHeader)
      .send({ title: "Dibajak Penerbit B" });
    expect(crossBookPatchRes.status).toBe(403);
  });

  it("blocks rejecting publish flow & protects the last remaining publisher owner during member management", async () => {
    const suffix = randomUUID().slice(0, 6);
    const pubSlug = `pub-members-${suffix}`;

    const owner = agent();
    await signUp(owner, "Pemilik Utama");
    const coOwner = agent();
    const coOwnerEmail = await signUp(coOwner, "Calon Rekan Pemilik");

    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Verifier Members");
    await setRole(adminEmail, "admin");

    const author = agent();
    await signUp(author, "Penulis Ditolak");

    const applyRes = await owner
      .post("/api/publisher/apply")
      .set(originHeader)
      .send({ name: `Penerbit Tim ${suffix}`, slug: pubSlug });
    const pubId = applyRes.body.data.id as string;

    await admin
      .patch(`/api/admin/publishers/${pubId}/verify`)
      .set(originHeader)
      .send({ verificationStatus: "verified" });

    // Owner lists members -> sees self as sole owner
    const listRes1 = await owner.get(`/api/publisher/${pubSlug}/members`);
    expect(listRes1.status).toBe(200);
    expect(listRes1.body.data).toHaveLength(1);
    const ownerMemberId = listRes1.body.data[0].id as string;

    // Cannot delete or demote the sole remaining owner
    const delLastOwnerRes = await owner
      .delete(`/api/publisher/${pubSlug}/members/${ownerMemberId}`)
      .set(originHeader);
    expect(delLastOwnerRes.status).toBe(400);
    expect(delLastOwnerRes.body.error.code).toBe("LAST_OWNER_REQUIRED");

    const demoteLastOwnerRes = await owner
      .patch(`/api/publisher/${pubSlug}/members/${ownerMemberId}`)
      .set(originHeader)
      .send({ role: "editor" });
    expect(demoteLastOwnerRes.status).toBe(400);
    expect(demoteLastOwnerRes.body.error.code).toBe("LAST_OWNER_REQUIRED");

    // Add second member as editor, fail duplicate, then promote to owner & delete original owner
    const addRes = await owner
      .post(`/api/publisher/${pubSlug}/members`)
      .set(originHeader)
      .send({ email: coOwnerEmail, role: "editor" });
    expect(addRes.status).toBe(201);
    const secondMemberId = addRes.body.data.id as string;

    const dupAddRes = await owner
      .post(`/api/publisher/${pubSlug}/members`)
      .set(originHeader)
      .send({ email: coOwnerEmail, role: "finance" });
    expect(dupAddRes.status).toBe(409);

    const promoteRes = await owner
      .patch(`/api/publisher/${pubSlug}/members/${secondMemberId}`)
      .set(originHeader)
      .send({ role: "owner" });
    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.data.role).toBe("owner");

    const removeOrigRes = await owner
      .delete(`/api/publisher/${pubSlug}/members/${ownerMemberId}`)
      .set(originHeader);
    expect(removeOrigRes.status).toBe(200);
    expect(removeOrigRes.body.data.removed).toBe(true);

    // Rejected manuscript cannot subsequently be published
    const subRes = await author
      .post("/api/publisher/manuscripts")
      .set(originHeader)
      .send({
        publisherId: pubId,
        title: `Naskah Ditolak ${suffix}`,
        synopsis: "Sinopsis lengkap naskah yang akan ditolak redaksi.",
        proposedDigitalPolicy: "free_open",
        chapters: [{ chapterNumber: 1, titleId: "Bab 1", contentId: "Isi." }],
      });
    const manuId = subRes.body.data.id as string;

    const rejectRes = await coOwner
      .post(`/api/publisher/${pubSlug}/manuscripts/${manuId}/review`)
      .set(originHeader)
      .send({
        action: "reject",
        notes: "Belum sesuai lini terbitan kami.",
      });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe("rejected");

    const publishRejectedRes = await coOwner
      .post(`/api/publisher/${pubSlug}/manuscripts/${manuId}/publish`)
      .set(originHeader)
      .send({});
    expect(publishRejectedRes.status).toBe(409);
    expect(publishRejectedRes.body.error.code).toBe(
      "INVALID_MANUSCRIPT_STATUS",
    );
  });

  it("supports Phase 1: approved writers fast-track, withdraw, full metadata publish, inventory CRUD, and media upload", async () => {
    const suffix = randomUUID().slice(0, 6);
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Phase 1");
    await setRole(adminEmail, "admin");

    const owner = agent();
    await signUp(owner, "Owner Phase 1");
    const approvedAuthor = agent();
    const approvedEmail = await signUp(approvedAuthor, "Penulis Rekanan");
    const outsiderAuthor = agent();
    await signUp(outsiderAuthor, "Penulis Luar");

    const pubSlug = `phase1-pub-${suffix}`;
    const applyRes = await owner
      .post("/api/publisher/apply")
      .set(originHeader)
      .send({
        name: `Penerbit Phase Satu ${suffix}`,
        slug: pubSlug,
        city: "Bandung",
        isAcceptingSubmissions: false,
      });
    expect(applyRes.status).toBe(201);
    const pubId = applyRes.body.data.id as string;

    await admin
      .patch(`/api/admin/publishers/${pubId}/verify`)
      .set(originHeader)
      .send({ verificationStatus: "verified" });

    // 1. Register Approved Writer -> visible on public detail & studio list
    const addWriterRes = await owner
      .post(`/api/publisher/${pubSlug}/approved-writers`)
      .set(originHeader)
      .send({ identifier: approvedEmail, canFastTrack: true });
    expect(addWriterRes.status).toBe(201);
    expect(addWriterRes.body.data.canFastTrack).toBe(true);

    const listWritersRes = await owner.get(
      `/api/publisher/${pubSlug}/approved-writers`,
    );
    expect(listWritersRes.status).toBe(200);
    expect(listWritersRes.body.data).toHaveLength(1);
    const writerRecordId = listWritersRes.body.data[0].id as string;

    // Approved author sees isCurrentUserApprovedWriter=true; outsider sees false
    const pubForApproved = await approvedAuthor.get(
      `/api/publisher/${pubSlug}`,
    );
    expect(pubForApproved.status).toBe(200);
    expect(pubForApproved.body.data.isCurrentUserApprovedWriter).toBe(true);
    expect(pubForApproved.body.data.approvedWriters).toHaveLength(1);

    const pubForOutsider = await outsiderAuthor.get(
      `/api/publisher/${pubSlug}`,
    );
    expect(pubForOutsider.status).toBe(200);
    expect(pubForOutsider.body.data.isCurrentUserApprovedWriter).toBe(false);

    // 2. Outsider cannot submit when publisher is closed -> 403
    const outsiderSubmitRes = await outsiderAuthor
      .post("/api/publisher/manuscripts")
      .set(originHeader)
      .send({
        publisherId: pubId,
        title: `Naskah Ditolak Tutup ${suffix}`,
        synopsis: "Sinopsis lengkap dari penulis luar.",
        proposedDigitalPolicy: "free_open",
        chapters: [{ chapterNumber: 1, titleId: "Bab 1", contentId: "Isi." }],
      });
    expect(outsiderSubmitRes.status).toBe(403);

    // 3. Approved writer CAN fast-track submit even when isAcceptingSubmissions=false
    const approvedSubmitRes = await approvedAuthor
      .post("/api/publisher/manuscripts")
      .set(originHeader)
      .send({
        publisherId: pubId,
        title: `Naskah Prioritas ${suffix}`,
        synopsis: "Sinopsis lengkap naskah jalur prioritas penulis rekanan.",
        sourceLanguage: "en",
        targetAudience: "mature_academic",
        authorNotes: "Mohon pertimbangan khusus untuk edisi dwibahasa.",
        isbn: `978-602-${suffix.slice(0, 4)}`,
        estimatedPages: 240,
        coverColor: "#1E3A5F",
        proposedDigitalPolicy: "single_purchase",
        chapters: [
          {
            chapterNumber: 1,
            titleId: "Bab 1: Metodologi",
            contentId: "Uraian lengkap bab pertama.",
            contentEn: "Complete first chapter.",
          },
        ],
      });
    expect(approvedSubmitRes.status).toBe(201);
    const manuscriptId = approvedSubmitRes.body.data.id as string;
    expect(approvedSubmitRes.body.data.sourceLanguage).toBe("en");
    expect(approvedSubmitRes.body.data.targetAudience).toBe("mature_academic");

    // 4. Author can withdraw pending_review -> draft, non-owner rejected, and re-submit
    const outsiderWithdrawRes = await outsiderAuthor
      .post(`/api/publisher/manuscripts/${manuscriptId}/withdraw`)
      .set(originHeader);
    expect(outsiderWithdrawRes.status).toBe(403);

    const withdrawRes = await approvedAuthor
      .post(`/api/publisher/manuscripts/${manuscriptId}/withdraw`)
      .set(originHeader);
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.status).toBe("draft");

    const resubmitRes = await approvedAuthor
      .post(`/api/publisher/manuscripts/${manuscriptId}/submit`)
      .set(originHeader)
      .send({ publisherId: pubId });
    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.data.status).toBe("pending_review");

    // Inbox displays isApprovedWriter: true
    const inboxRes = await owner.get(`/api/publisher/${pubSlug}/manuscripts`);
    expect(inboxRes.status).toBe(200);
    const matchedInbox = inboxRes.body.data.find(
      (m: { id: string }) => m.id === manuscriptId,
    );
    expect(matchedInbox?.isApprovedWriter).toBe(true);

    // 5. Upload validated PNG image via /api/media/upload-image & fetch it back
    // 1x1 transparent PNG
    const validPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const badUploadRes = await owner
      .post("/api/media/upload-image")
      .set(originHeader)
      .set("Content-Type", "image/png")
      .send(Buffer.from("not-an-image"));
    expect(badUploadRes.status).toBe(415);

    const uploadRes = await owner
      .post("/api/media/upload-image")
      .set(originHeader)
      .set("Content-Type", "image/png")
      .send(validPng);
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.url).toMatch(/\/api\/media\/images\/.+\.png$/);
    const uploadedUrl = uploadRes.body.data.url as string;
    const uploadedPath = new URL(uploadedUrl).pathname;

    const getImageRes = await approvedAuthor.get(uploadedPath);
    expect(getImageRes.status).toBe(200);
    expect(getImageRes.headers["content-type"]).toContain("image/png");

    // 6. Publish with full bibliography, physical edition, and default 45_000 digital price
    const publishRes = await owner
      .post(`/api/publisher/${pubSlug}/manuscripts/${manuscriptId}/publish`)
      .set(originHeader)
      .send({
        title: `Edisi Terbit Lengkap ${suffix}`,
        synopsis: "Sinopsis edisi terbit lengkap untuk katalog pembaca.",
        coverUrl: uploadedPath,
        coverColor: "#2C4A3E",
        digitalPolicy: "nakama_or_purchase",
        hasPhysical: true,
        rakyatPriceIdr: 49_000,
        standardPriceIdr: 89_000,
        publishedYear: 2026,
        originalTitle: "Original Discourse",
        translator: "Tim Penerjemah Anza",
        collectionName: "Seri Pemikiran",
        isbn: `978-602-99-${suffix.slice(0, 2)}`,
      });
    expect(publishRes.status).toBe(200);
    const bookId = publishRes.body.data.publishedBookId as string;
    const bookSlug = publishRes.body.data.book.slug as string;
    expect(publishRes.body.data.book.digitalPriceIdr).toBe(45_000);
    expect(publishRes.body.data.book.accessTier).toBe("premium_physical");

    const bookDetailRes = await approvedAuthor.get(`/api/books/${bookSlug}`);
    expect(bookDetailRes.status).toBe(200);
    expect(bookDetailRes.body.data.publishedYear).toBe(2026);
    expect(bookDetailRes.body.data.originalTitle).toBe("Original Discourse");
    expect(bookDetailRes.body.data.translator).toBe("Tim Penerjemah Anza");
    expect(bookDetailRes.body.data.collectionName).toBe("Seri Pemikiran");

    // 7. Store branches & inventory CRUD
    const [seededBranch] = await db
      .insert(storeBranches)
      .values({
        chainName: "gramedia",
        branchName: `Toko Mitra ${suffix}`,
        address: "Jl. Asia Afrika No. 10",
        city: "Bandung",
      })
      .returning();

    const branchesRes = await owner.get("/api/publisher/store-branches");
    expect(branchesRes.status).toBe(200);
    expect(branchesRes.body.data.length).toBeGreaterThanOrEqual(1);

    const putInvRes = await owner
      .put(`/api/publisher/${pubSlug}/books/${bookId}/inventory`)
      .set(originHeader)
      .send({
        items: [
          {
            branchId: seededBranch.id,
            rakyatStock: 12,
            standardStock: 8,
          },
        ],
      });
    expect(putInvRes.status).toBe(200);
    const updatedBranch = putInvRes.body.data.find(
      (i: { branchId: string }) => i.branchId === seededBranch.id,
    );
    expect(updatedBranch?.rakyatStock).toBe(12);
    expect(updatedBranch?.standardStock).toBe(8);
    expect(updatedBranch?.stockStatus).toBe("available");

    // Clean up approved writer record
    const delWriterRes = await owner
      .delete(`/api/publisher/${pubSlug}/approved-writers/${writerRecordId}`)
      .set(originHeader);
    expect(delWriterRes.status).toBe(200);
    expect(delWriterRes.body.data.removed).toBe(true);
  });
});
