import { describe, expect, it } from "vitest";
import { agent, originHeader, signUp } from "./helpers";

describe("AnzaBook Core API", () => {
  it("returns continuous manuscript chapters only when the reader has full access", async () => {
    const client = agent();
    await signUp(client, "Pembaca Scroll");
    const full = await client.get(
      "/api/books/revolusi-cetak-kedaulatan-membaca/read?continuous=true",
    );
    expect(full.status).toBe(200);
    expect(
      full.body.data.chapters.map(
        (chapter: { chapterNumber: number }) => chapter.chapterNumber,
      ),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(full.body.data.chapters[1].contentId).toBeTruthy();

    const preview = await client.get(
      "/api/books/sains-logika-seni-hidup-bermutu/read?continuous=true",
    );
    expect(preview.status).toBe(200);
    expect(preview.body.data.hasFullAccess).toBe(false);
    expect(preview.body.data.chapters).toHaveLength(1);
    expect(preview.body.data.chapters[0].audioUrl).toBeNull();
  });

  it("provides public catalog, weekly bulletin, and book details", async () => {
    const client = agent();

    // 1. List books
    const listRes = await client.get("/api/books");
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(6);
    expect(listRes.body.bulletin).toBeDefined();
    expect(listRes.body.bulletin.isWeeklyBulletin).toBe(true);

    // 2. Search books
    const searchRes = await client.get("/api/books?search=madilog");
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.body.data[0].slug).toBe("madilog-tan-malaka");

    // 3. Book detail
    const detailRes = await client.get(
      "/api/books/revolusi-cetak-kedaulatan-membaca",
    );
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.title).toContain("Revolusi Cetak");
    expect(detailRes.body.data.editions.length).toBe(3);
    const rakyatEdition = detailRes.body.data.editions.find(
      (e: { tier: string }) => e.tier === "rakyat_economy",
    );
    expect(rakyatEdition).toBeDefined();
    expect(rakyatEdition.priceIdr).toBe(29000);
    expect(rakyatEdition.traditionalStorePriceIdr).toBe(79000);
    expect(rakyatEdition.savingsPercent).toBe(63);

    // 4. Live stock tracker by city
    const stockRes = await client.get(
      "/api/books/revolusi-cetak-kedaulatan-membaca/stock?city=Jakarta",
    );
    expect(stockRes.status).toBe(200);
    expect(stockRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(stockRes.body.data[0].city).toContain("Jakarta");
  });

  it("enforces digital access policies: allows sample/blueprint, blocks chapter 2 until claim code redeemed", async () => {
    const client = agent();
    await signUp(client, "Pembaca Rakyat");

    // Book with sample_only / print_claim policy: sains-logika-seni-hidup-bermutu
    const slug = "sains-logika-seni-hidup-bermutu";

    // Chapter 1 (sample) is permitted
    const chap1Res = await client.get(
      `/api/books/${slug}/read?chapter=1&mode=full`,
    );
    expect(chap1Res.status).toBe(200);
    expect(chap1Res.body.data.currentChapter.chapterNumber).toBe(1);
    expect(chap1Res.body.data.watermark).toBeDefined();

    // Blueprint mode is permitted
    const blueprintRes = await client.get(
      `/api/books/${slug}/read?chapter=1&mode=blueprint`,
    );
    expect(blueprintRes.status).toBe(200);
    expect(blueprintRes.body.data.mode).toBe("blueprint");

    expect(chap1Res.body.data.hasFullAccess).toBe(false);
    expect(chap1Res.body.data.currentChapter.audioUrl).toBeNull();
    expect(
      chap1Res.body.data.currentChapter.contentId.split(/\n\n+/).length,
    ).toBeLessThanOrEqual(3);

    for (const mode of ["full", "blueprint", "audio"]) {
      const locked = await client.get(
        `/api/books/${slug}/read?chapter=2&mode=${mode}`,
      );
      expect(locked.status).toBe(403);
      expect(locked.body.error.code).toBe("FORBIDDEN_DIGITAL_ACCESS");
    }

    // Invalid claim code returns 422 / 404
    const invalidClaim = await client
      .post(`/api/books/${slug}/claim-code`)
      .set(originHeader)
      .send({ code: "WRONG-CODE-999" });
    expect([404, 422]).toContain(invalidClaim.status);

    // Valid claim code unlocks full access
    const validClaim = await client
      .post(`/api/books/${slug}/claim-code`)
      .set(originHeader)
      .send({ code: "SAINS-MALAKA-01" });
    expect(validClaim.status).toBe(200);
    expect(validClaim.body.data.success).toBe(true);

    // Reusing the same code fails with 409
    const reusedClaim = await client
      .post(`/api/books/${slug}/claim-code`)
      .set(originHeader)
      .send({ code: "SAINS-MALAKA-01" });
    expect(reusedClaim.status).toBe(409);

    // Now Chapter 2 is accessible!
    const chap2Unlocked = await client.get(
      `/api/books/${slug}/read?chapter=2&mode=full`,
    );
    // Note: if book has only 1 chapter seeded, it responds with 200 or 404 if chapter doesn't exist,
    // but not 403 FORBIDDEN_DIGITAL_ACCESS.
    expect(chap2Unlocked.status).not.toBe(403);
  });

  it("scopes marginalia to the selected book and readable paragraphs", async () => {
    const slug = "sains-logika-seni-hidup-bermutu";
    const client = agent();
    const details = await client.get(`/api/books/${slug}`);
    const [first, second] = details.body.data.chapters;
    expect(
      (await client.get(`/api/books/${slug}/comments?chapterId=${first.id}`))
        .status,
    ).toBe(401);
    await signUp(client, "Pembaca Catatan");
    expect(
      (await client.get(`/api/books/${slug}/comments?chapterId=${second.id}`))
        .status,
    ).toBe(403);
    expect(
      (
        await client.get(
          `/api/books/madilog-tan-malaka/comments?chapterId=${first.id}`,
        )
      ).status,
    ).toBe(404);
    const outsidePreview = await client
      .post(`/api/books/${slug}/comments`)
      .set(originHeader)
      .send({
        chapterId: first.id,
        paragraphIndex: 4,
        content: "Catatan di luar cuplikan.",
      });
    expect(outsidePreview.status).toBe(422);
    const allowed = await client
      .post(`/api/books/${slug}/comments`)
      .set(originHeader)
      .send({
        chapterId: first.id,
        paragraphIndex: 0,
        content: "Catatan di cuplikan.",
      });
    expect(allowed.status).toBe(201);
    const comments = await client.get(
      `/api/books/${slug}/comments?chapterId=${first.id}`,
    );
    expect(
      comments.body.data.map((comment: { id: string }) => comment.id),
    ).toContain(allowed.body.data.id);
  });

  it("records reading sessions and calculates telemetry summary for Strava studio", async () => {
    const client = agent();
    await signUp(client, "Pelari Literasi");

    const detailRes = await client.get(
      "/api/books/revolusi-cetak-kedaulatan-membaca",
    );
    const bookId = detailRes.body.data.id;

    // Reject invalid WPM
    const invalidWpm = await client
      .post("/api/reading-sessions")
      .set(originHeader)
      .send({
        bookId,
        pagesRead: 10,
        durationSeconds: 600,
        avgWpm: 1800,
        mode: "full",
      });
    expect(invalidWpm.status).toBe(422);

    // Log valid reading session
    const validSession = await client
      .post("/api/reading-sessions")
      .set(originHeader)
      .send({
        bookId,
        pagesRead: 15,
        durationSeconds: 1200,
        avgWpm: 250,
        mode: "full",
      });
    expect(validSession.status).toBe(201);
    expect(validSession.body.data.pagesRead).toBe(15);

    // Telemetry summary
    const telemetryRes = await client.get("/api/reading-sessions");
    expect(telemetryRes.status).toBe(200);
    expect(telemetryRes.body.summary.totalPagesRead).toBeGreaterThanOrEqual(15);
    expect(telemetryRes.body.summary.totalMinutesRead).toBeGreaterThanOrEqual(
      20,
    );
    expect(telemetryRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("isolates user shelves across accounts and handles community reviews", async () => {
    const clientA = agent();
    const clientB = agent();
    await signUp(clientA, "User A");
    await signUp(clientB, "User B");

    const detailRes = await clientA.get(
      "/api/books/revolusi-cetak-kedaulatan-membaca",
    );
    const bookId = detailRes.body.data.id;

    // User A adds to shelf
    const addShelf = await clientA.post("/api/shelves").set(originHeader).send({
      bookId,
      shelfStatus: "reading",
      favorite: true,
    });
    expect([200, 201]).toContain(addShelf.status);

    // User A sees book in shelf
    const shelfARes = await clientA.get("/api/shelves");
    expect(shelfARes.status).toBe(200);
    expect(
      shelfARes.body.data.some((s: { bookId: string }) => s.bookId === bookId),
    ).toBe(true);

    // User B does NOT see User A's shelf
    const shelfBRes = await clientB.get("/api/shelves");
    expect(shelfBRes.status).toBe(200);
    expect(
      shelfBRes.body.data.some((s: { bookId: string }) => s.bookId === bookId),
    ).toBe(false);

    // User A writes a review
    const reviewRes = await clientA
      .post("/api/books/revolusi-cetak-kedaulatan-membaca/reviews")
      .set(originHeader)
      .send({
        bookId,
        rating: 4.5,
        content:
          "Kertas newsprint 48.8 gsm ini sangat nyaman di mata, tidak silau dan enteng dibawa!",
        editionTierReviewed: "rakyat_economy",
      });
    expect(reviewRes.status).toBe(201);

    // Reviews list contains User A's review
    const reviewsList = await clientA.get(
      "/api/books/revolusi-cetak-kedaulatan-membaca/reviews",
    );
    expect(reviewsList.status).toBe(200);
    expect(reviewsList.body.data.length).toBeGreaterThanOrEqual(1);
    expect(reviewsList.body.data[0].rating).toBe(4.5);
  });

  it("simulates print HPP economics for publishers and independent authors", async () => {
    const client = agent();

    const simRes = await client
      .post("/api/publisher/simulate")
      .set(originHeader)
      .send({
        pageCount: 240,
        printRun: 3000,
        authorRoyaltyPct: 12,
      });
    expect(simRes.status).toBe(200);
    expect(simRes.body.data.tiers.length).toBe(3);
    const rakyatTier = simRes.body.data.tiers.find(
      (t: { editionTier: string }) => t.editionTier === "rakyat_economy",
    );
    expect(rakyatTier.recommendedPriceIdr).toBeGreaterThanOrEqual(25000);
    expect(rakyatTier.recommendedPriceIdr).toBeLessThanOrEqual(49000);
  });
});
