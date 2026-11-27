import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { communityCalendars, user } from "../db/schema";
import { agent, originHeader, signUp } from "./helpers";

async function promoteToAdmin(email: string) {
  const [row] = await db.select().from(user).where(eq(user.email, email));
  expect(row).toBeDefined();
  await db.update(user).set({ role: "admin" }).where(eq(user.id, row.id));
  return row;
}

describe("Reading Spots API (/api/spots & /api/admin/spots)", () => {
  it("supports BBox filtering, nearby Haversine sorting, city/category/facility filters, and city metadata", async () => {
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Peta Ternate");
    await promoteToAdmin(adminEmail);

    const suffix = randomUUID().slice(0, 6);
    const city = `Ternate-${suffix}`;

    // Spot A: closer to reference point (0.7900, 127.3800)
    const spotARes = await admin
      .post("/api/spots")
      .set(originHeader)
      .send({
        name: `Kafe Baca Dekat ${suffix}`,
        category: "book_cafe",
        description: "Kafe buku nyaman dengan colokan melimpah.",
        address: "Jl. Pahlawan Revolusi No. 10, Ternate",
        district: "Ternate Tengah",
        city,
        province: "Maluku Utara",
        latitude: 0.7905,
        longitude: 127.3805,
        priceRange: "budget",
        noiseLevel: "quiet",
        facilities: {
          wifi: true,
          powerOutlets: true,
          airConditioned: true,
          hasBookCollection: true,
        },
      });
    expect(spotARes.status).toBe(201);
    expect(spotARes.body.data.status).toBe("published");
    const spotA = spotARes.body.data;

    // Spot B: ~2.2 km north of reference point
    const spotBRes = await admin
      .post("/api/spots")
      .set(originHeader)
      .send({
        name: `Perpus Tenang Jauh ${suffix}`,
        category: "library",
        description: "Perpustakaan umum tenang tanpa Wi-Fi.",
        address: "Jl. Ahmad Yani No. 88, Ternate",
        district: "Ternate Utara",
        city,
        province: "Maluku Utara",
        latitude: 0.81,
        longitude: 127.3805,
        priceRange: "free",
        noiseLevel: "quiet",
        facilities: {
          wifi: false,
          quietZone: true,
          hasBookCollection: true,
        },
      });
    expect(spotBRes.status).toBe(201);
    const spotB = spotBRes.body.data;

    const viewer = agent();

    // 1. BBox filter around Ternate test area
    const bboxRes = await viewer.get("/api/spots").query({
      minLat: 0.78,
      maxLat: 0.82,
      minLng: 127.37,
      maxLng: 127.39,
      city,
    });
    expect(bboxRes.status).toBe(200);
    expect(bboxRes.body.meta.total).toBe(2);
    expect(bboxRes.body.data.map((s: { id: string }) => s.id)).toContain(
      spotA.id,
    );
    expect(bboxRes.body.data.map((s: { id: string }) => s.id)).toContain(
      spotB.id,
    );

    // 2. Nearby Haversine sort (nearest first)
    const nearbyRes = await viewer.get("/api/spots").query({
      lat: 0.79,
      lng: 127.38,
      radiusKm: 5,
      city,
      sort: "nearest",
    });
    expect(nearbyRes.status).toBe(200);
    expect(nearbyRes.body.data).toHaveLength(2);
    expect(nearbyRes.body.data[0].id).toBe(spotA.id);
    expect(nearbyRes.body.data[1].id).toBe(spotB.id);
    expect(nearbyRes.body.data[0].distanceMeters).toBeLessThan(
      nearbyRes.body.data[1].distanceMeters,
    );

    // 3. Category & facility JSONB filters
    const facilityRes = await viewer.get("/api/spots").query({
      city,
      category: "book_cafe",
      facility: "wifi",
    });
    expect(facilityRes.status).toBe(200);
    expect(facilityRes.body.data).toHaveLength(1);
    expect(facilityRes.body.data[0].id).toBe(spotA.id);

    // 4. Cities metadata includes our test city with count 2
    const citiesRes = await viewer.get("/api/spots/meta/cities");
    expect(citiesRes.status).toBe(200);
    const citySummary = citiesRes.body.data.find(
      (c: { city: string }) => c.city === city,
    );
    expect(citySummary).toBeDefined();
    expect(citySummary.count).toBe(2);
  });

  it("handles review upsert, deletion, atomic ratingAvg/ratingCount recomputation, and bookmark toggling", async () => {
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Ulasan Spot");
    await promoteToAdmin(adminEmail);

    const suffix = randomUUID().slice(0, 6);
    const created = await admin
      .post("/api/spots")
      .set(originHeader)
      .send({
        name: `Ruang Baca Ulasan ${suffix}`,
        category: "reading_lounge",
        address: "Jl. Merdeka No. 12, Palu",
        city: `Palu-${suffix}`,
        province: "Sulawesi Tengah",
        latitude: -0.8917,
        longitude: 119.8707,
      });
    expect(created.status).toBe(201);
    const slug = created.body.data.slug as string;

    const userA = agent();
    await signUp(userA, "Pengulas A");
    const userB = agent();
    await signUp(userB, "Pengulas B");

    // User A creates review (rating 4)
    const revA1 = await userA
      .put(`/api/spots/${slug}/reviews/me`)
      .set(originHeader)
      .send({
        rating: 4,
        content: "Tempatnya nyaman dan tenang untuk membaca sore hari.",
        tags: ["tenang_fokus", "wifi_stabil"],
      });
    expect(revA1.status).toBe(200);
    expect(revA1.body.data.ratingAvg).toBe(4);
    expect(revA1.body.data.ratingCount).toBe(1);

    // User A edits own review (upsert -> rating 2, count stays 1)
    const revA2 = await userA
      .put(`/api/spots/${slug}/reviews/me`)
      .set(originHeader)
      .send({
        rating: 2,
        content: "Kunjungan kedua agak ramai saat akhir pekan tiba.",
        tags: ["kopi_enak"],
      });
    expect(revA2.status).toBe(200);
    expect(revA2.body.data.ratingAvg).toBe(2);
    expect(revA2.body.data.ratingCount).toBe(1);

    // User B adds review (rating 5 -> avg = (2 + 5) / 2 = 3.5, count = 2)
    const revB = await userB
      .put(`/api/spots/${slug}/reviews/me`)
      .set(originHeader)
      .send({
        rating: 5,
        content: "Koleksi bukunya lengkap dan stafnya sangat ramah.",
        tags: ["koleksi_bagus", "nyaman_lama"],
      });
    expect(revB.status).toBe(200);
    expect(revB.body.data.ratingAvg).toBe(3.5);
    expect(revB.body.data.ratingCount).toBe(2);

    // List reviews & check distribution
    const listRev = await userA.get(`/api/spots/${slug}/reviews`);
    expect(listRev.status).toBe(200);
    expect(listRev.body.data).toHaveLength(2);
    expect(listRev.body.summary.ratingAvg).toBe(3.5);
    expect(listRev.body.summary.ratingCount).toBe(2);
    expect(listRev.body.summary.distribution[2]).toBe(1);
    expect(listRev.body.summary.distribution[5]).toBe(1);

    // User C (who has no review) cannot delete User A/B's review
    const userC = agent();
    await signUp(userC, "Pengguna Lain Tanpa Ulasan");
    const delC = await userC
      .delete(`/api/spots/${slug}/reviews/me`)
      .set(originHeader);
    expect(delC.status).toBe(404);
    expect(delC.body.error.code).toBe("REVIEW_NOT_FOUND");

    // User A deletes own review -> avg becomes 5, count = 1
    const delA = await userA
      .delete(`/api/spots/${slug}/reviews/me`)
      .set(originHeader);
    expect(delA.status).toBe(200);
    expect(delA.body.data).toEqual({
      deleted: true,
      ratingAvg: 5,
      ratingCount: 1,
    });

    // Bookmark toggle on & off
    const bmOn = await userA
      .post(`/api/spots/${slug}/bookmark`)
      .set(originHeader);
    expect(bmOn.status).toBe(200);
    expect(bmOn.body.data).toEqual({ isBookmarked: true, bookmarkCount: 1 });

    const mineRes = await userA.get("/api/spots/mine");
    expect(mineRes.status).toBe(200);
    expect(
      mineRes.body.data.bookmarks.some(
        (b: { slug: string }) => b.slug === slug,
      ),
    ).toBe(true);

    const bmOff = await userA
      .post(`/api/spots/${slug}/bookmark`)
      .set(originHeader);
    expect(bmOff.status).toBe(200);
    expect(bmOff.body.data).toEqual({ isBookmarked: false, bookmarkCount: 0 });
  });

  it("detects nearby duplicates within 100m vs outside 100m", async () => {
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Duplikat Spot");
    await promoteToAdmin(adminEmail);

    const suffix = randomUUID().slice(0, 6);
    const created = await admin
      .post("/api/spots")
      .set(originHeader)
      .send({
        name: `TBM Cendrawasih ${suffix}`,
        category: "tbm",
        address: "Jl. Percetakan Negara No. 5, Jayapura",
        city: `Jayapura-${suffix}`,
        province: "Papua",
        latitude: -2.5337,
        longitude: 140.7181,
      });
    expect(created.status).toBe(201);

    const checker = agent();
    await signUp(checker, "Cek Duplikat");

    // ~33m away -> must match within default 100m radius
    const nearRes = await checker.get("/api/spots/nearby-check").query({
      lat: -2.5334,
      lng: 140.7181,
      name: `TBM Cendrawasih ${suffix}`,
    });
    expect(nearRes.status).toBe(200);
    expect(
      nearRes.body.data.some(
        (m: { id: string }) => m.id === created.body.data.id,
      ),
    ).toBe(true);

    // ~550m away -> must NOT match within 100m radius
    const farRes = await checker.get("/api/spots/nearby-check").query({
      lat: -2.5387,
      lng: 140.7181,
      radiusMeters: 100,
    });
    expect(farRes.status).toBe(200);
    expect(
      farRes.body.data.some(
        (m: { id: string }) => m.id === created.body.data.id,
      ),
    ).toBe(false);
  });

  it("enforces moderation state machine: regular user -> pending_review, trusted host -> auto-published, and admin moderation + reports", async () => {
    const regularUser = agent();
    await signUp(regularUser, "Kontributor Biasa");

    const otherUser = agent();
    await signUp(otherUser, "Pengunjung Publik");

    const trustedHost = agent();
    const hostEmail = await signUp(trustedHost, "Host Komunitas Verified");
    const [hostDb] = await db
      .select()
      .from(user)
      .where(eq(user.email, hostEmail));

    await db.insert(communityCalendars).values({
      name: "Komunitas Baca Terverifikasi",
      slug: `komunitas-spot-${randomUUID().slice(0, 6)}`,
      verificationStatus: "verified",
      createdByUserId: hostDb.id,
      city: "Kendari",
    });

    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Moderasi Spot");
    await promoteToAdmin(adminEmail);

    const suffix = randomUUID().slice(0, 6);

    // 1. Regular user submission -> pending_review
    const pendingRes = await regularUser
      .post("/api/spots")
      .set(originHeader)
      .send({
        name: `Sudut Baca Pending ${suffix}`,
        category: "indie_bookstore",
        address: "Jl. Sam Ratulangi No. 4, Kendari",
        city: `Kendari-${suffix}`,
        province: "Sulawesi Tenggara",
        latitude: -3.9985,
        longitude: 122.5129,
      });
    expect(pendingRes.status).toBe(201);
    expect(pendingRes.body.data.status).toBe("pending_review");
    const pendingSpot = pendingRes.body.data;

    // Invisible to other users in public list & detail
    const publicList = await otherUser
      .get("/api/spots")
      .query({ city: `Kendari-${suffix}` });
    expect(publicList.status).toBe(200);
    expect(publicList.body.data).toHaveLength(0);

    const otherDetail = await otherUser.get(`/api/spots/${pendingSpot.slug}`);
    expect(otherDetail.status).toBe(404);

    // Visible to submitter in /mine & detail
    const submitterDetail = await regularUser.get(
      `/api/spots/${pendingSpot.slug}`,
    );
    expect(submitterDetail.status).toBe(200);
    expect(submitterDetail.body.data.status).toBe("pending_review");

    const submitterMine = await regularUser.get("/api/spots/mine");
    expect(submitterMine.status).toBe(200);
    expect(
      submitterMine.body.data.submissions.some(
        (s: { id: string }) => s.id === pendingSpot.id,
      ),
    ).toBe(true);

    // 2. Trusted calendar host submission -> auto-published
    const trustedRes = await trustedHost
      .post("/api/spots")
      .set(originHeader)
      .send({
        name: `Sudut Baca Trusted ${suffix}`,
        category: "book_cafe",
        address: "Jl. Ahmad Yani No. 20, Kendari",
        city: `Kendari-${suffix}`,
        province: "Sulawesi Tenggara",
        latitude: -3.991,
        longitude: 122.519,
      });
    expect(trustedRes.status).toBe(201);
    expect(trustedRes.body.data.status).toBe("published");

    // 3. Admin sees pending spot in overview & list, then approves it
    const overviewBefore = await admin.get("/api/admin/overview");
    expect(overviewBefore.status).toBe(200);
    expect(overviewBefore.body.data.pendingSpotsCount).toBeGreaterThanOrEqual(
      1,
    );

    const adminList = await admin
      .get("/api/admin/spots")
      .query({ status: "pending_review", q: suffix });
    expect(adminList.status).toBe(200);
    expect(
      adminList.body.data.some((s: { id: string }) => s.id === pendingSpot.id),
    ).toBe(true);

    const approveRes = await admin
      .patch(`/api/admin/spots/${pendingSpot.id}/moderate`)
      .set(originHeader)
      .send({ action: "approve", verifiedBadge: "curated" });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe("published");
    expect(approveRes.body.data.verifiedBadge).toBe("curated");

    // Now visible to public
    const otherDetailAfter = await otherUser.get(
      `/api/spots/${pendingSpot.slug}`,
    );
    expect(otherDetailAfter.status).toBe(200);

    // 4. User reports spot; duplicate open report blocked with 409; admin moderation resolves report
    const reportRes = await otherUser
      .post(`/api/spots/${pendingSpot.slug}/reports`)
      .set(originHeader)
      .send({
        reasonType: "wrong_info",
        details: "Jam buka di hari Minggu sebenarnya tutup lebih awal.",
      });
    expect(reportRes.status).toBe(201);
    expect(reportRes.body.data.openUniqueReporterCount).toBe(1);

    const dupReportRes = await otherUser
      .post(`/api/spots/${pendingSpot.slug}/reports`)
      .set(originHeader)
      .send({
        reasonType: "wrong_info",
        details: "Laporan duplikat yang sama.",
      });
    expect(dupReportRes.status).toBe(409);
    expect(dupReportRes.body.error.code).toBe("DUPLICATE_OPEN_REPORT");

    const closeRes = await admin
      .patch(`/api/admin/spots/${pendingSpot.id}/moderate`)
      .set(originHeader)
      .send({ action: "mark_closed" });
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.status).toBe("closed");
    expect(closeRes.body.data.openReportsCount).toBe(0);
  });

  it("enforces security & RBAC boundaries (401, 403 origin/admin, Indonesia bbox, Google Maps URL allowlist)", async () => {
    const anon = agent();

    // Unauthenticated -> 401
    expect((await anon.get("/api/spots/mine")).status).toBe(401);
    expect(
      (
        await anon
          .get("/api/spots/nearby-check")
          .query({ lat: -6.2, lng: 106.8 })
      ).status,
    ).toBe(401);
    expect(
      (await anon.post("/api/spots").set(originHeader).send({})).status,
    ).toBe(401);

    const regularUser = agent();
    await signUp(regularUser, "Pengguna Security Check");

    // Missing Origin header on mutations -> 403
    const noOriginPost = await regularUser.post("/api/spots").send({
      name: "Tanpa Origin",
      category: "book_cafe",
      address: "Jl. Braga No. 1, Bandung",
      city: "Bandung",
      province: "Jawa Barat",
      latitude: -6.9175,
      longitude: 107.6191,
    });
    expect(noOriginPost.status).toBe(403);

    const noOriginDelete = await regularUser.delete(
      "/api/spots/some-slug/reviews/me",
    );
    expect(noOriginDelete.status).toBe(403);

    // Regular user hitting admin moderation endpoints -> 403
    expect((await regularUser.get("/api/admin/spots")).status).toBe(403);
    expect(
      (
        await regularUser
          .patch(`/api/admin/spots/${randomUUID()}/moderate`)
          .set(originHeader)
          .send({ action: "approve" })
      ).status,
    ).toBe(403);

    // Out-of-Indonesia coordinates -> 400
    const outOfBounds = await regularUser
      .post("/api/spots")
      .set(originHeader)
      .send({
        name: "Tokyo Book Cafe",
        category: "book_cafe",
        address: "Shibuya Crossing 1-1, Tokyo",
        city: "Tokyo",
        province: "Tokyo",
        latitude: 35.6595,
        longitude: 139.7004,
      });
    expect(outOfBounds.status).toBe(422);

    // Malicious googleMapsUrl (javascript: & phishing host) -> 400
    for (const badUrl of [
      "javascript:alert(1)",
      "https://evil-maps.example.com/maps",
      "https://goo.gl/not-maps",
    ]) {
      const badUrlRes = await regularUser
        .post("/api/spots")
        .set(originHeader)
        .send({
          name: "Spot URL Berbahaya",
          category: "book_cafe",
          address: "Jl. Asia Afrika No. 10, Bandung",
          city: "Bandung",
          province: "Jawa Barat",
          latitude: -6.9218,
          longitude: 107.607,
          googleMapsUrl: badUrl,
        });
      expect(badUrlRes.status).toBe(422);
    }
  });
});
