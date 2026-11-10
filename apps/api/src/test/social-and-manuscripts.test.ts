import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { agent, originHeader, signUp } from "./helpers";
import { db } from "../db";
import {
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

    const [dbUserA] = await db.select().from(user).where(eq(user.email, emailA));
    const [dbUserB] = await db.select().from(user).where(eq(user.email, emailB));

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
    expect(pubs.some((p: { slug: string }) => p.slug === unverifiedPubSlug)).toBe(
      false,
    );
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
        description: "Komisi penjualan buku alacarte",
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
    expect(ownerWalletRes.body.data.totalAffiliateBookPurchasesIdr).toBe(15_000);
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
        description: "Penerbit independen karya fiksi dan literatur kontemporer.",
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
    await signUp(authorClient, "Penulis Fantasi");

    const submitRes = await authorClient
      .post("/api/publisher/manuscripts")
      .set(originHeader)
      .send({
        publisherId,
        title: "Kronik Menara Embun",
        synopsis:
          "Di dunia di mana kabut menyembunyikan masa lalu, seorang penenun waktu mencari kebenaran tentang kota yang hilang di atas awan.",
        proposedDigitalPolicy: "hybrid_nakama_alacarte",
        proposedAlacartePriceIdr: 45_000,
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
});
