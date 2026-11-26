import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { agent, originHeader, setAuthorStatus, signUp } from "./helpers";
import { db } from "../db";
import {
  bookHighlights,
  books,
  communityCalendars,
  communityWalletLedgers,
  publishers,
  user,
} from "../db/schema";

describe("Social Profile, 4D Explore, Community Membership & Manuscript Studio API", () => {
  it("manages social profile (GET /me, PATCH /me, GET /users/:username)", async () => {
    const client = agent();
    const email = await signUp(client, "Raka Naratama");

    // Fetch me initially
    const meRes1 = await client.get("/api/social/me");
    expect(meRes1.status).toBe(200);
    expect(meRes1.body.data.name).toBe("Raka Naratama");
    expect(meRes1.body.data.bio).toBe("");
    expect(meRes1.body.data.followersCount).toBe(0);
    expect(meRes1.body.data.followingCount).toBe(0);

    // Update bio, pen name, city, social links
    const patchRes = await client
      .patch("/api/social/me")
      .set(originHeader)
      .send({
        bio: "Penikmat sastra realisme magis dan kopi tubruk.",
        locationCity: "Yogyakarta",
        authorPenName: "Raka N.",
        socialLinks: {
          instagram: "https://instagram.com/rakanaratama",
          twitter: "https://x.com/rakanaratama",
        },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.bio).toBe(
      "Penikmat sastra realisme magis dan kopi tubruk.",
    );
    expect(patchRes.body.data.locationCity).toBe("Yogyakarta");
    expect(patchRes.body.data.authorPenName).toBe("Raka N.");
    expect(patchRes.body.data.socialLinks.instagram).toBe(
      "https://instagram.com/rakanaratama",
    );

    // Verify via GET /api/social/users/:username (or userId fallback)
    const [dbUser] = await db.select().from(user).where(eq(user.email, email));
    expect(dbUser).toBeDefined();

    const usernameOrId = dbUser.username || dbUser.id;
    const userRes = await client.get(`/api/social/users/${usernameOrId}`);
    expect(userRes.status).toBe(200);
    expect(userRes.body.data.id).toBe(dbUser.id);
    expect(userRes.body.data.authorPenName).toBe("Raka N.");
    expect(userRes.body.data.locationCity).toBe("Yogyakarta");
  });

  it("handles follow and unfollow between users and blocks self-follow", async () => {
    const userA = agent();
    const emailA = await signUp(userA, "User Antares");

    const userB = agent();
    const emailB = await signUp(userB, "User Bintang");

    const [dbUserA] = await db
      .select()
      .from(user)
      .where(eq(user.email, emailA));
    const [dbUserB] = await db
      .select()
      .from(user)
      .where(eq(user.email, emailB));

    // Self follow should fail with 400 CANNOT_FOLLOW_SELF
    const selfFollowRes = await userA
      .post(`/api/social/users/${dbUserA.id}/follow`)
      .set(originHeader)
      .send({ isSubscribedUpdates: true });
    expect(selfFollowRes.status).toBe(400);
    expect(selfFollowRes.body.error.code).toBe("CANNOT_FOLLOW_SELF");

    // User A follows User B
    const followRes = await userA
      .post(`/api/social/users/${dbUserB.id}/follow`)
      .set(originHeader)
      .send({ isSubscribedUpdates: true });
    expect(followRes.status).toBe(200);
    expect(followRes.body.data.isFollowing).toBe(true);

    // Idempotent follow check
    const followAgainRes = await userA
      .post(`/api/social/users/${dbUserB.id}/follow`)
      .set(originHeader)
      .send({ isSubscribedUpdates: true });
    expect(followAgainRes.status).toBe(200);

    // Check User B's profile from User A's perspective
    const profileResA = await userA.get(`/api/social/users/${dbUserB.id}`);
    expect(profileResA.status).toBe(200);
    expect(profileResA.body.data.followersCount).toBe(1);
    expect(profileResA.body.data.isFollowing).toBe(true);

    // Check User A's own profile following count
    const myProfileRes = await userA.get("/api/social/me");
    expect(myProfileRes.body.data.followingCount).toBe(1);

    // Unfollow User B
    const unfollowRes = await userA
      .delete(`/api/social/users/${dbUserB.id}/follow`)
      .set(originHeader);
    expect(unfollowRes.status).toBe(200);
    expect(unfollowRes.body.data.isFollowing).toBe(false);

    // Check again
    const profileAfterRes = await userA.get(`/api/social/users/${dbUserB.id}`);
    expect(profileAfterRes.body.data.followersCount).toBe(0);
    expect(profileAfterRes.body.data.isFollowing).toBe(false);
  });

  it("submits official author application and updates authorStatus", async () => {
    const authorClient = agent();
    await signUp(authorClient, "Calon Penulis");

    const appRes = await authorClient
      .post("/api/social/author-applications")
      .set(originHeader)
      .send({
        penName: "Aksara Senja",
        bio: "Penulis prosa fiksi spekulatif dengan 3 karya antologi independen.",
        portfolioUrl: "https://aksarasenja.id/karya",
      });

    expect(appRes.status).toBe(201);
    expect(appRes.body.data.penName).toBe("Aksara Senja");
    expect(appRes.body.data.status).toBe("pending");

    // Profile authorStatus should now be pending
    const profileRes = await authorClient.get("/api/social/me");
    expect(profileRes.body.data.authorStatus).toBe("pending");
    expect(profileRes.body.data.authorPenName).toBe("Aksara Senja");

    // Resubmitting while pending should be rejected
    const dupRes = await authorClient
      .post("/api/social/author-applications")
      .set(originHeader)
      .send({
        penName: "Aksara Senja 2",
        bio: "Mencoba submit ulang saat masih pending.",
      });
    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error.code).toBe("AUTHOR_APPLICATION_ALREADY_EXISTS");
  });

  it("explores 4 dimensions: authors, readers, verified calendars, and verified publishers", async () => {
    const viewer = agent();
    await signUp(viewer, "Viewer Pengunjung");

    // Seed verified author
    const authorAgent = agent();
    const authorEmail = await signUp(authorAgent, "Pramoedya Muda");
    const [authorDb] = await db
      .select()
      .from(user)
      .where(eq(user.email, authorEmail));
    await db
      .update(user)
      .set({
        authorStatus: "verified",
        authorPenName: "Pramoedya M.",
        bio: "Penulis novel sejarah.",
      })
      .where(eq(user.id, authorDb.id));

    // Seed verified publisher
    const pubSlug = `penerbit-explore-${randomUUID().slice(0, 6)}`;
    await db.insert(publishers).values({
      name: "Penerbit Bentang Aksara",
      slug: pubSlug,
      city: "Bandung",
      topics: ["Arsitektur Nusantara", "Sastra"],
      verificationStatus: "verified",
    });

    // Seed unverified publisher
    const unverifiedPubSlug = `penerbit-draft-${randomUUID().slice(0, 6)}`;
    await db.insert(publishers).values({
      name: "Penerbit Belum Verifikasi",
      slug: unverifiedPubSlug,
      city: "Jakarta",
      verificationStatus: "pending",
    });

    // Seed calendars: verified vs pending
    const verifiedCalSlug = `komunitas-verified-${randomUUID().slice(0, 6)}`;
    await db.insert(communityCalendars).values({
      name: "Klab Literasi Merdeka",
      slug: verifiedCalSlug,
      verificationStatus: "verified",
      createdByUserId: authorDb.id,
      city: "Yogyakarta",
    });

    const pendingCalSlug = `komunitas-pending-${randomUUID().slice(0, 6)}`;
    await db.insert(communityCalendars).values({
      name: "Klab Masih Pending",
      slug: pendingCalSlug,
      verificationStatus: "pending",
      createdByUserId: authorDb.id,
      city: "Surabaya",
    });

    // 1. Explore authors
    const authorsRes = await viewer.get("/api/social/explore/authors");
    expect(authorsRes.status).toBe(200);
    const foundAuthor = authorsRes.body.data.find(
      (a: { id: string }) => a.id === authorDb.id,
    );
    expect(foundAuthor).toBeDefined();
    expect(foundAuthor.penName).toBe("Pramoedya M.");
    expect(foundAuthor.authorStatus).toBe("verified");

    // 2. Explore readers
    const readersRes = await viewer.get("/api/social/explore/readers");
    expect(readersRes.status).toBe(200);
    expect(Array.isArray(readersRes.body.data)).toBe(true);

    // 3. Explore public calendars: only verified/trusted
    const calsRes = await viewer.get("/api/events/calendars");
    expect(calsRes.status).toBe(200);
    const cals = calsRes.body.data;
    expect(cals.some((c: { slug: string }) => c.slug === verifiedCalSlug)).toBe(
      true,
    );
    expect(cals.some((c: { slug: string }) => c.slug === pendingCalSlug)).toBe(
      false,
    );

    // 4. Explore publishers list: only verified
    const pubListRes = await viewer.get("/api/publisher/list");
    expect(pubListRes.status).toBe(200);
    const pubs = pubListRes.body.data;
    expect(pubs.some((p: { slug: string }) => p.slug === pubSlug)).toBe(true);
    expect(
      pubs.some((p: { slug: string }) => p.slug === unverifiedPubSlug),
    ).toBe(false);

    // 4b. Unified explore matches publishers.topics, exposes topics, and sets role: null (never "editor")
    const explorePubRes = await viewer.get(
      "/api/social/explore?q=Arsitektur+Nusantara",
    );
    expect(explorePubRes.status).toBe(200);
    const matchedExplorePub = explorePubRes.body.data.publishers.find(
      (p: { slug: string }) => p.slug === pubSlug,
    );
    expect(matchedExplorePub).toBeDefined();
    expect(matchedExplorePub.topics).toEqual([
      "Arsitektur Nusantara",
      "Sastra",
    ]);
    expect(matchedExplorePub.role).toBeNull();

    // 5. Admin accounts must be excluded from explore endpoints
    const adminAgent = agent();
    const adminEmail = await signUp(adminAgent, "Admin Rahasia Explore");
    const [adminDb] = await db
      .select()
      .from(user)
      .where(eq(user.email, adminEmail));
    await db
      .update(user)
      .set({ role: "admin", authorStatus: "verified" })
      .where(eq(user.id, adminDb.id));

    const exploreAllRes = await viewer.get(
      "/api/social/explore?q=Admin+Rahasia+Explore",
    );
    expect(exploreAllRes.status).toBe(200);
    expect(
      exploreAllRes.body.data.users.some(
        (u: { id: string }) => u.id === adminDb.id,
      ),
    ).toBe(false);

    const readersAfterAdminRes = await viewer.get(
      "/api/social/explore/readers?q=Admin+Rahasia+Explore",
    );
    expect(readersAfterAdminRes.status).toBe(200);
    expect(
      readersAfterAdminRes.body.data.some(
        (u: { id: string }) => u.id === adminDb.id,
      ),
    ).toBe(false);

    const authorsAfterAdminRes = await viewer.get(
      "/api/social/explore/authors?q=Admin+Rahasia+Explore",
    );
    expect(authorsAfterAdminRes.status).toBe(200);
    expect(
      authorsAfterAdminRes.body.data.some(
        (u: { id: string }) => u.id === adminDb.id,
      ),
    ).toBe(false);
  });

  it("manages community membership (/join, /leave) and enforces wallet RBAC", async () => {
    const ownerClient = agent();
    await signUp(ownerClient, "Ketua Komunitas");

    const memberClient = agent();
    await signUp(memberClient, "Anggota Komunitas");

    const calSlug = `komunitas-baca-${randomUUID().slice(0, 6)}`;
    const calCreateRes = await ownerClient
      .post("/api/events/calendars")
      .set(originHeader)
      .send({
        name: "Lingkar Pembaca Senja",
        slug: calSlug,
        type: "community",
        description: "Komunitas pecinta buku senja dan diskusi filsafat.",
        city: "Jakarta",
      });
    expect(calCreateRes.status).toBe(201);
    const calendarId = calCreateRes.body.data.id;

    // Member joins calendar
    const joinRes = await memberClient
      .post(`/api/events/calendars/${calSlug}/join`)
      .set(originHeader);
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.data.role).toBe("member");

    // Joining again should fail with 400 ALREADY_A_MEMBER
    const joinAgainRes = await memberClient
      .post(`/api/events/calendars/${calSlug}/join`)
      .set(originHeader);
    expect(joinAgainRes.status).toBe(400);
    expect(joinAgainRes.body.error.code).toBe("ALREADY_A_MEMBER");

    // Seed some wallet ledger entries for this community
    await db.insert(communityWalletLedgers).values([
      {
        calendarId,
        entryType: "affiliate_nakama",
        amountIdr: 50_000,
        description: "Komisi Nakama 1 bulan",
      },
      {
        calendarId,
        entryType: "affiliate_book_purchase",
        amountIdr: 15_000,
        description: "Komisi penjualan buku satuan",
      },
    ]);

    // Member tries to access wallet -> FORBIDDEN (403)
    const memberWalletRes = await memberClient.get(
      `/api/events/calendars/${calSlug}/wallet`,
    );
    expect(memberWalletRes.status).toBe(403);
    expect(memberWalletRes.body.error.code).toBe("FORBIDDEN_CALENDAR_ADMIN");

    // Owner accesses wallet -> SUCCESS (200)
    const ownerWalletRes = await ownerClient.get(
      `/api/events/calendars/${calSlug}/wallet`,
    );
    expect(ownerWalletRes.status).toBe(200);
    expect(ownerWalletRes.body.data.balanceIdr).toBe(65_000);
    expect(ownerWalletRes.body.data.totalAffiliateNakamaIdr).toBe(50_000);
    expect(ownerWalletRes.body.data.totalAffiliateBookPurchasesIdr).toBe(
      15_000,
    );
    expect(ownerWalletRes.body.data.recentLedgers).toHaveLength(2);

    // Owner attempts to leave -> REJECTED (400 OWNER_CANNOT_LEAVE)
    const ownerLeaveRes = await ownerClient
      .delete(`/api/events/calendars/${calSlug}/leave`)
      .set(originHeader);
    expect(ownerLeaveRes.status).toBe(400);
    expect(ownerLeaveRes.body.error.code).toBe("OWNER_CANNOT_LEAVE");

    // Member leaves -> SUCCESS (200)
    const memberLeaveRes = await memberClient
      .delete(`/api/events/calendars/${calSlug}/leave`)
      .set(originHeader);
    expect(memberLeaveRes.status).toBe(200);
  });

  it("handles publisher application (/apply) and manuscript submission with chapters (/manuscripts)", async () => {
    const publisherUser = agent();
    await signUp(publisherUser, "Direktur Penerbit");

    const pubSlug = `penerbit-nusantara-${randomUUID().slice(0, 6)}`;
    const applyRes = await publisherUser
      .post("/api/publisher/apply")
      .set(originHeader)
      .send({
        name: "Penerbit Nusantara Kreatif",
        slug: pubSlug,
        city: "Jakarta Pusat",
        ikapiNumber: "IKAPI-JKT-2026-99",
        description:
          "Penerbit independen karya fiksi dan literatur kontemporer.",
        contactEmail: "redaksi@nusantarakreatif.id",
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.data.slug).toBe(pubSlug);
    expect(applyRes.body.data.verificationStatus).toBe("pending");
    expect(applyRes.body.data.currentUserRole).toBe("owner");

    // Duplicate slug application should fail with 409
    const dupApplyRes = await publisherUser
      .post("/api/publisher/apply")
      .set(originHeader)
      .send({
        name: "Penerbit Nusantara Duplikat",
        slug: pubSlug,
      });
    expect(dupApplyRes.status).toBe(409);
    expect(dupApplyRes.body.error.code).toBe("PUBLISHER_SLUG_TAKEN");

    const publisherId = applyRes.body.data.id;

    // Submit manuscript with multi-chapters
    const authorClient = agent();
    const authorEmail = await signUp(authorClient, "Penulis Fantasi");
    await setAuthorStatus(authorEmail, "verified");

    const submitRes = await authorClient
      .post("/api/publisher/manuscripts")
      .set(originHeader)
      .send({
        publisherId,
        title: "Kronik Menara Embun",
        synopsis:
          "Di dunia di mana kabut menyembunyikan masa lalu, seorang penenun waktu mencari kebenaran tentang kota yang hilang di atas awan.",
        proposedDigitalPolicy: "nakama_or_purchase",
        proposedDigitalPriceIdr: 45_000,
        chapters: [
          {
            chapterNumber: 1,
            titleId: "Bab 1: Penenun di Pagi Buta",
            contentId:
              "Kain perak itu berkilau di bawah temaram lentera minyak. Angin lembah berhembus dingin.",
            estimatedMinutes: 8,
          },
          {
            chapterNumber: 2,
            titleId: "Bab 2: Jejak di Batuan Lembab",
            contentId:
              "Langkah demi langkah menyusuri tebing curam. Bayangan menara mulai tampak samar di balik kabut tebal.",
            estimatedMinutes: 10,
          },
        ],
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.title).toBe("Kronik Menara Embun");
    expect(submitRes.body.data.status).toBe("pending_review");
    expect(submitRes.body.data.totalChapters).toBe(2);
    expect(submitRes.body.data.chapters).toHaveLength(2);
    expect(submitRes.body.data.chapters[0].titleId).toBe(
      "Bab 1: Penenun di Pagi Buta",
    );

    // Author checks submitted manuscripts
    const myManuscriptsRes = await authorClient.get(
      "/api/publisher/manuscripts/mine",
    );
    expect(myManuscriptsRes.status).toBe(200);
    expect(myManuscriptsRes.body.data).toHaveLength(1);
    expect(myManuscriptsRes.body.data[0].title).toBe("Kronik Menara Embun");
    expect(myManuscriptsRes.body.data[0].publisherName).toBe(
      "Penerbit Nusantara Kreatif",
    );
    expect(myManuscriptsRes.body.data[0].chapters).toHaveLength(2);
  });

  it("validates highlight & session post publishing, enforces DRM-05 400-char cap, and guards private notes", async () => {
    const reader = agent();
    const email = await signUp(reader, "Pembaca Kutipan");
    const [dbReader] = await db
      .select()
      .from(user)
      .where(eq(user.email, email));
    const [seededBook] = await db.select().from(books).limit(1);
    expect(seededBook).toBeDefined();

    // 1. Insert normal highlight (<= 400 chars) and overly long highlight (> 400 chars)
    const [shortHighlight] = await db
      .insert(bookHighlights)
      .values({
        userId: dbReader.id,
        bookId: seededBook.id,
        chapterNumber: 1,
        pageNumber: 1,
        selectedText: "Membaca adalah cara paling sunyi untuk menembus waktu.",
        color: "yellow",
        note: "Catatan pribadi rahasia pembaca",
      })
      .returning();

    const [longHighlight] = await db
      .insert(bookHighlights)
      .values({
        userId: dbReader.id,
        bookId: seededBook.id,
        chapterNumber: 1,
        pageNumber: 2,
        selectedText: "A".repeat(401),
        color: "green",
      })
      .returning();

    // DRM-05 guard: publishing highlight > 400 chars must fail with 422
    const drmFailRes = await reader
      .post(`/api/social/highlights/${longHighlight.id}/toggle-post`)
      .set(originHeader)
      .send({ isPosted: true });
    expect(drmFailRes.status).toBe(422);
    expect(drmFailRes.body.error.code).toBe("EXCERPT_TOO_LONG");

    // Publish valid highlight with postCaption & postConfig (includeNote: false)
    const postQuoteRes = await reader
      .post(`/api/social/highlights/${shortHighlight.id}/toggle-post`)
      .set(originHeader)
      .send({
        isPosted: true,
        postCaption: "Kutipan favorit malam ini",
        postConfig: {
          template: "furrow_paper",
          aspect: "square",
          alignment: "left",
          includeNote: false,
        },
      });
    expect(postQuoteRes.status).toBe(200);
    expect(postQuoteRes.body.data).toMatchObject({
      id: shortHighlight.id,
      isPosted: true,
      postCaption: "Kutipan favorit malam ini",
      postConfig: {
        template: "furrow_paper",
        aspect: "square",
        alignment: "left",
        includeNote: false,
      },
    });

    // Public explore must NOT leak private note when includeNote === false
    const exploreRes1 = await reader.get(
      "/api/social/explore?q=menembus+waktu",
    );
    expect(exploreRes1.status).toBe(200);
    const quoteItem1 = exploreRes1.body.data.posts.find(
      (p: { id: string }) => p.id === shortHighlight.id,
    );
    expect(quoteItem1).toBeDefined();
    expect(quoteItem1.note).toBeNull();
    expect(quoteItem1.postCaption).toBe("Kutipan favorit malam ini");

    // Update includeNote: true -> note is now intentionally shared
    const revealNoteRes = await reader
      .post(`/api/social/highlights/${shortHighlight.id}/toggle-post`)
      .set(originHeader)
      .send({
        isPosted: true,
        postConfig: {
          template: "night_stabilo",
          aspect: "story",
          alignment: "center",
          includeNote: true,
        },
      });
    expect(revealNoteRes.status).toBe(200);

    const exploreRes2 = await reader.get(
      "/api/social/explore?q=menembus+waktu",
    );
    const quoteItem2 = exploreRes2.body.data.posts.find(
      (p: { id: string }) => p.id === shortHighlight.id,
    );
    expect(quoteItem2.note).toBe("Catatan pribadi rahasia pembaca");

    // 2. Create and publish reading session with title & postConfig
    const sessionRes = await reader
      .post("/api/reading")
      .set(originHeader)
      .send({
        bookId: seededBook.id,
        wordsRead: 750,
        durationSeconds: 240,
        avgWpm: 188,
      });
    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.data.id as string;

    const postSessionRes = await reader
      .post(`/api/social/sessions/${sessionId}/toggle-post`)
      .set(originHeader)
      .send({
        isPosted: true,
        title: "Baca Malam Sebelum Tidur",
        note: "Bab pembukanya sangat memikat.",
        postConfig: {
          template: "cover_trail",
          aspect: "story",
          showWpm: true,
          showDuration: true,
          showPages: true,
        },
      });
    expect(postSessionRes.status).toBe(200);
    expect(postSessionRes.body.data).toMatchObject({
      id: sessionId,
      isPosted: true,
      title: "Baca Malam Sebelum Tidur",
      note: "Bab pembukanya sangat memikat.",
      postConfig: {
        template: "cover_trail",
        aspect: "story",
        showWpm: true,
        showDuration: true,
        showPages: true,
      },
    });
  });

  it("exposes public posts via GET /api/social/posts/:type/:id, enriches Explore/Profile feeds, enforces FLEX-03 privacy, and validates UUID params", async () => {
    const reader = agent();
    const anon = agent();
    const email = await signUp(reader, "Nadia Pustakawan");

    const [dbReader] = await db
      .select()
      .from(user)
      .where(eq(user.email, email));
    expect(dbReader).toBeDefined();

    const [seededBook] = await db.select().from(books).limit(1);
    expect(seededBook).toBeDefined();

    // 1. Private highlight must return 404 on public post endpoint
    const [highlight] = await db
      .insert(bookHighlights)
      .values({
        userId: dbReader.id,
        bookId: seededBook.id,
        chapterNumber: 3,
        pageNumber: 42,
        selectedText:
          "Membaca dengan tenang mengubah gagasan rumit menjadi kompas harian.",
        note: "CatatanRahasiaUnik9981",
        color: "yellow",
      })
      .returning();

    const privateQuoteRes = await anon.get(
      `/api/social/posts/quote/${highlight.id}`,
    );
    expect(privateQuoteRes.status).toBe(404);
    expect(privateQuoteRes.body.error.code).toBe("POST_NOT_FOUND");

    // Publish quote with caption and includeNote: false
    const pubQuoteRes = await reader
      .post(`/api/social/highlights/${highlight.id}/toggle-post`)
      .set(originHeader)
      .send({
        isPosted: true,
        postCaption: "RefleksiKopiSenja4412",
        postConfig: {
          template: "book_cover",
          aspect: "square",
          alignment: "left",
          includeNote: false,
        },
      });
    expect(pubQuoteRes.status).toBe(200);

    // Anonymous fetch succeeds with enriched metadata and zero private note/email leak
    const publicQuoteRes = await anon.get(
      `/api/social/posts/quote/${highlight.id}`,
    );
    expect(publicQuoteRes.status).toBe(200);
    expect(publicQuoteRes.body.data).toMatchObject({
      id: highlight.id,
      type: "quote",
      content: highlight.selectedText,
      note: null,
      postCaption: "RefleksiKopiSenja4412",
      chapterNumber: 3,
      pageNumber: 42,
      postConfig: {
        template: "book_cover",
        aspect: "square",
        alignment: "left",
        includeNote: false,
      },
      book: {
        id: seededBook.id,
        slug: seededBook.slug,
        coverUrl: seededBook.coverUrl,
      },
    });
    expect(JSON.stringify(publicQuoteRes.body.data)).not.toContain(email);

    // Explore finds quote via postCaption, but NOT via hidden private note
    const exploreByCaption = await anon.get(
      "/api/social/explore?q=RefleksiKopiSenja4412",
    );
    expect(exploreByCaption.status).toBe(200);
    const exploredQuote = exploreByCaption.body.data.posts.find(
      (p: { id: string }) => p.id === highlight.id,
    );
    expect(exploredQuote).toMatchObject({
      id: highlight.id,
      note: null,
      postCaption: "RefleksiKopiSenja4412",
      chapterNumber: 3,
      pageNumber: 42,
      book: { coverUrl: seededBook.coverUrl },
    });

    const exploreBySecretNote = await anon.get(
      "/api/social/explore?q=CatatanRahasiaUnik9981",
    );
    expect(exploreBySecretNote.status).toBe(200);
    expect(
      exploreBySecretNote.body.data.posts.find(
        (p: { id: string }) => p.id === highlight.id,
      ),
    ).toBeUndefined();

    // 2. Reading session privacy & telemetry enrichment
    const sessionRes = await reader
      .post("/api/reading")
      .set(originHeader)
      .send({
        bookId: seededBook.id,
        wordsRead: 1000,
        durationSeconds: 360,
        avgWpm: 167,
        startProgressPercent: 12,
        endProgressPercent: 34,
        startChapterNumber: 1,
        endChapterNumber: 2,
        highlightsCount: 3,
      });
    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.data.id as string;

    // Private session must return 404
    const privateSessionRes = await anon.get(
      `/api/social/posts/session/${sessionId}`,
    );
    expect(privateSessionRes.status).toBe(404);
    expect(privateSessionRes.body.error.code).toBe("POST_NOT_FOUND");

    // Publish session hiding WPM and duration (FLEX-03)
    const pubSessionRes = await reader
      .post(`/api/social/sessions/${sessionId}/toggle-post`)
      .set(originHeader)
      .send({
        isPosted: true,
        title: "SesiSubuhTenang7782",
        note: null,
        postConfig: {
          template: "literary_index",
          aspect: "story",
          showWpm: false,
          showDuration: false,
          showPages: true,
        },
      });
    expect(pubSessionRes.status).toBe(200);

    // Check public post, Explore search by title, and Public Profile consistently
    const publicSessionRes = await anon.get(
      `/api/social/posts/session/${sessionId}`,
    );
    expect(publicSessionRes.status).toBe(200);

    const exploreSessionRes = await anon.get(
      "/api/social/explore?q=SesiSubuhTenang7782",
    );
    expect(exploreSessionRes.status).toBe(200);
    const exploredSession = exploreSessionRes.body.data.posts.find(
      (p: { id: string }) => p.id === sessionId,
    );

    const usernameOrId = dbReader.username || dbReader.id;
    const profileRes = await anon.get(`/api/social/users/${usernameOrId}`);
    expect(profileRes.status).toBe(200);
    const profileQuote = profileRes.body.data.publicActivities.find(
      (p: { id: string }) => p.id === highlight.id,
    );
    const profileSession = profileRes.body.data.publicActivities.find(
      (p: { id: string }) => p.id === sessionId,
    );

    expect(profileQuote).toMatchObject({
      id: highlight.id,
      note: null,
      postCaption: "RefleksiKopiSenja4412",
      chapterNumber: 3,
      pageNumber: 42,
      book: { coverUrl: seededBook.coverUrl },
    });

    for (const sessionPost of [
      publicSessionRes.body.data,
      exploredSession,
      profileSession,
    ]) {
      expect(sessionPost).toBeDefined();
      expect(sessionPost).toMatchObject({
        id: sessionId,
        type: "session",
        title: "SesiSubuhTenang7782",
        avgWpm: null,
        startProgressPercent: 12,
        endProgressPercent: 34,
        startChapterNumber: 1,
        endChapterNumber: 2,
        highlightsCount: 3,
        postConfig: {
          template: "literary_index",
          aspect: "story",
          showWpm: false,
          showDuration: false,
          showPages: true,
        },
        book: {
          id: seededBook.id,
          coverUrl: seededBook.coverUrl,
        },
      });
      expect(sessionPost.durationSeconds).toBeUndefined();
      expect(sessionPost.pagesRead).toBeGreaterThan(0);
      expect(sessionPost.wordsRead).toBe(1000);
      expect(sessionPost.content).not.toMatch(/menit|detik|wpm/i);
    }

    // 3. Malformed params must return 422 VALIDATION_ERROR (never 500 from Postgres)
    const badTypeRes = await anon.get(
      `/api/social/posts/review/${highlight.id}`,
    );
    expect(badTypeRes.status).toBe(422);
    expect(badTypeRes.body.error.code).toBe("VALIDATION_ERROR");

    const badPublicIdRes = await anon.get("/api/social/posts/quote/not-a-uuid");
    expect(badPublicIdRes.status).toBe(422);
    expect(badPublicIdRes.body.error.code).toBe("VALIDATION_ERROR");

    const badHighlightToggleRes = await reader
      .post("/api/social/highlights/not-a-uuid/toggle-post")
      .set(originHeader)
      .send({ isPosted: true });
    expect(badHighlightToggleRes.status).toBe(422);
    expect(badHighlightToggleRes.body.error.code).toBe("VALIDATION_ERROR");

    const badSessionToggleRes = await reader
      .post("/api/social/sessions/not-a-uuid/toggle-post")
      .set(originHeader)
      .send({ isPosted: true });
    expect(badSessionToggleRes.status).toBe(422);
    expect(badSessionToggleRes.body.error.code).toBe("VALIDATION_ERROR");
  });
});
