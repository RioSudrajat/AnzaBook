import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DRM_HIGH_RISK_SUSPEND_THRESHOLD,
  getDrmEventRiskLevel,
  resolveReaderDrmPolicy,
} from "@starter/shared/validators/drm";
import {
  decodeZeroWidthFingerprint,
  encodeZeroWidthFingerprint,
  stripZeroWidthCharacters,
} from "@starter/shared/drm-steganography";
import { agent, originHeader, setRole, signUp } from "./helpers";

describe("DRM Policy, Opaque Session Watermarks, & Admin Audit Logging", () => {
  it("enforces production DRM ON without toggle, allows dev/staging toggle, and exempts author editing", () => {
    expect(
      resolveReaderDrmPolicy({
        toggleAvailable: false,
        requestedDrm: false,
        toggleState: false,
        isAuthorEditing: false,
      }),
    ).toEqual({ showToggle: false, isEnabled: true });

    expect(
      resolveReaderDrmPolicy({
        toggleAvailable: true,
        requestedDrm: false,
        isAuthorEditing: false,
      }),
    ).toEqual({ showToggle: true, isEnabled: false });

    expect(
      resolveReaderDrmPolicy({
        toggleAvailable: true,
        isAuthorEditing: false,
      }),
    ).toEqual({ showToggle: true, isEnabled: true });

    expect(
      resolveReaderDrmPolicy({
        toggleAvailable: false,
        isAuthorEditing: true,
      }),
    ).toEqual({ showToggle: false, isEnabled: false });
  });

  it("assigns authoritative risk tiers across DRM trigger types", () => {
    expect(getDrmEventRiskLevel("screenshot_shortcut")).toBe("high");
    expect(getDrmEventRiskLevel("clipboard_copy")).toBe("high");
    expect(getDrmEventRiskLevel("devtools_attempt")).toBe("high");
    expect(getDrmEventRiskLevel("dom_tampering")).toBe("high");
    expect(getDrmEventRiskLevel("print_save_attempt")).toBe("high");
    expect(getDrmEventRiskLevel("context_menu")).toBe("medium");
    expect(getDrmEventRiskLevel("drag_attempt")).toBe("medium");
    expect(getDrmEventRiskLevel("visibility_hidden")).toBe("low");
    expect(getDrmEventRiskLevel("window_blur")).toBe("low");
    expect(getDrmEventRiskLevel("multi_touch")).toBe("low");
  });

  it("issues an opaque traceable ANZ- session watermark without exposing email and logs DRM events by risk for admin review", async () => {
    const reader = agent();
    const readerEmail = await signUp(reader, "Rian Pembaca DRM");
    const readerHandle = `rian_${randomUUID().slice(0, 6)}`;
    const setHandleRes = await reader
      .post("/api/membership/username")
      .set(originHeader)
      .send({ username: readerHandle });
    expect(setHandleRes.status).toBe(200);

    const secondReader = agent();
    await signUp(secondReader, "Dina Pembaca Kedua");

    const slug = "revolusi-cetak-kedaulatan-membaca";

    // Unauthenticated telemetry fails with 401
    const unauthPost = await agent()
      .post("/api/reading/drm-events")
      .set(originHeader)
      .send({
        bookSlug: slug,
        eventType: "screenshot_shortcut",
        triggerDetail: "PrintScreen (keyup)",
        watermarkCode: "ANZ-000000000000",
      });
    expect(unauthPost.status).toBe(401);

    // 1. Reader fetches book payload -> gets opaque ANZ- watermark (no email/@)
    const readRes1 = await reader.get(`/api/books/${slug}/read?chapter=1`);
    expect(readRes1.status).toBe(200);
    const watermark1: string = readRes1.body.data.watermark;
    expect(watermark1).toMatch(/^ANZ-[A-F0-9]{12}$/);
    expect(watermark1).not.toContain("@");
    expect(watermark1).not.toContain(readerEmail);

    // Same session + same book reuses same watermarkCode (prevents focus refetch spam)
    const readRes2 = await reader.get(`/api/books/${slug}/read?chapter=1`);
    expect(readRes2.status).toBe(200);
    expect(readRes2.body.data.watermark).toBe(watermark1);

    // Different session gets a distinct watermarkCode
    const otherReadRes = await secondReader.get(
      `/api/books/${slug}/read?chapter=1`,
    );
    expect(otherReadRes.status).toBe(200);
    expect(otherReadRes.body.data.watermark).toMatch(/^ANZ-[A-F0-9]{12}$/);
    expect(otherReadRes.body.data.watermark).not.toBe(watermark1);

    // 2. Client cannot spoof riskLevel or missing Origin
    const noOriginRes = await reader.post("/api/reading/drm-events").send({
      bookSlug: slug,
      eventType: "screenshot_shortcut",
      triggerDetail: "PrintScreen",
      watermarkCode: watermark1,
    });
    expect(noOriginRes.status).toBe(403);

    const forgedFieldRes = await reader
      .post("/api/reading/drm-events")
      .set(originHeader)
      .send({
        bookSlug: slug,
        eventType: "screenshot_shortcut",
        triggerDetail: "PrintScreen",
        watermarkCode: watermark1,
        riskLevel: "low",
      });
    expect(forgedFieldRes.status).toBe(422);

    // 3. Reader triggers high-risk screenshot, high-risk copy, and low-risk tab switch
    const ssEvent = await reader
      .post("/api/reading/drm-events")
      .set(originHeader)
      .send({
        bookSlug: slug,
        chapterNumber: 1,
        eventType: "screenshot_shortcut",
        triggerDetail: "PrintScreen (keyup)",
        watermarkCode: watermark1,
        clientOs: "linux",
      });
    expect(ssEvent.status).toBe(201);
    expect(ssEvent.body.data.riskLevel).toBe("high");

    // Rapid duplicate within debounce window should reuse existing id without inflating count
    const ssDupEvent = await reader
      .post("/api/reading/drm-events")
      .set(originHeader)
      .send({
        bookSlug: slug,
        chapterNumber: 1,
        eventType: "screenshot_shortcut",
        triggerDetail: "PrintScreen (keyup)",
        watermarkCode: watermark1,
        clientOs: "linux",
      });
    expect(ssDupEvent.status).toBe(201);
    expect(ssDupEvent.body.data.id).toBe(ssEvent.body.data.id);

    const copyEvent = await reader
      .post("/api/reading/drm-events")
      .set(originHeader)
      .send({
        bookSlug: slug,
        chapterNumber: 1,
        eventType: "clipboard_copy",
        triggerDetail: "Percobaan menyalin naskah (copy)",
        watermarkCode: watermark1,
        clientOs: "windows",
      });
    expect(copyEvent.status).toBe(201);
    expect(copyEvent.body.data.riskLevel).toBe("high");

    const tabEvent = await reader
      .post("/api/reading/drm-events")
      .set(originHeader)
      .send({
        bookSlug: slug,
        chapterNumber: 1,
        eventType: "visibility_hidden",
        triggerDetail: "Pembaca berpindah tab",
        watermarkCode: watermark1,
        clientOs: "linux",
      });
    expect(tabEvent.status).toBe(201);
    expect(tabEvent.body.data.riskLevel).toBe("low");

    // 4. Non-admin cannot view /api/admin/drm-events or trace watermark
    const forbiddenList = await reader.get("/api/admin/drm-events");
    expect(forbiddenList.status).toBe(403);
    const forbiddenTrace = await reader.get(
      `/api/admin/drm-events/trace/${watermark1}`,
    );
    expect(forbiddenTrace.status).toBe(403);

    // 5. Admin inspects DRM monitoring logs, filters by riskLevel, and traces watermark ID
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Security Monitor");
    await setRole(adminEmail, "admin");

    const overviewRes = await admin.get("/api/admin/overview");
    expect(overviewRes.status).toBe(200);
    expect(
      overviewRes.body.data.highRiskDrmEvents24hCount,
    ).toBeGreaterThanOrEqual(2);

    const highRiskRes = await admin.get(
      `/api/admin/drm-events?riskLevel=high&search=${encodeURIComponent(watermark1)}`,
    );
    expect(highRiskRes.status).toBe(200);
    expect(highRiskRes.body.data).toHaveLength(2);
    expect(highRiskRes.body.data[0].userEmail).toBe(readerEmail);
    expect(highRiskRes.body.data[0].userName).toBe("Rian Pembaca DRM");
    expect(highRiskRes.body.data[0].username).toBe(readerHandle);
    expect(highRiskRes.body.data[0].riskLevel).toBe("high");
    expect(highRiskRes.body.summary.highRiskCount).toBeGreaterThanOrEqual(2);
    expect(highRiskRes.body.summary.lowRiskCount).toBeGreaterThanOrEqual(1);

    const traceRes = await admin.get(
      `/api/admin/drm-events/trace/${watermark1}`,
    );
    expect(traceRes.status).toBe(200);
    expect(traceRes.body.data.watermarkCode).toBe(watermark1);
    expect(traceRes.body.data.userEmail).toBe(readerEmail);
    expect(traceRes.body.data.bookSlug).toBe(slug);
    expect(traceRes.body.data.recentEvents.length).toBeGreaterThanOrEqual(3);

    const missingTraceRes = await admin.get(
      `/api/admin/drm-events/trace/ANZ-${randomUUID().slice(0, 12).toUpperCase().replace(/-/g, "0")}`,
    );
    expect(missingTraceRes.status).toBe(404);
  });

  it("enforces bounded chapter windows (max 2), ignores repeated refetches, and blocks rapid distinct-chapter scraping with 429 + high-risk log", async () => {
    expect(getDrmEventRiskLevel("api_scrape_anomaly")).toBe("high");

    const scraper = agent();
    const scraperEmail = await signUp(scraper, "Penyedot Naskah API");
    const slug = "madilog-tan-malaka";

    const invalidWindow = await scraper.get(
      `/api/books/${slug}/read?continuous=true&windowSize=5`,
    );
    expect(invalidWindow.status).toBe(422);

    // Repeating the same chapter window (e.g. tab refocus) must NOT trigger rate limiting.
    for (let i = 0; i < 8; i += 1) {
      const refetch = await scraper.get(
        `/api/books/${slug}/read?chapter=1&continuous=true`,
      );
      expect(refetch.status).toBe(200);
      expect(
        refetch.body.data.chapters.map(
          (ch: { chapterNumber: number }) => ch.chapterNumber,
        ),
      ).toEqual([1, 2]);
    }

    // Rapidly harvesting >6 distinct chapters in a short burst triggers 429 RATE_LIMITED
    // and records a high-risk api_scrape_anomaly event for admin audit.
    let blockedStatus = 0;
    let blockedCode = "";
    for (let ch = 3; ch <= 8; ch += 1) {
      const res = await scraper.get(
        `/api/books/${slug}/read?chapter=${ch}&continuous=false`,
      );
      if (res.status === 429) {
        blockedStatus = res.status;
        blockedCode = res.body?.error?.code ?? "";
        break;
      }
      expect(res.status).toBe(200);
    }

    expect(blockedStatus).toBe(429);
    expect(blockedCode).toBe("RATE_LIMITED");

    const admin = agent();
    const adminEmail = await signUp(admin, "Admin Scrape Auditor");
    await setRole(adminEmail, "admin");

    const eventsRes = await admin.get(
      `/api/admin/drm-events?eventType=api_scrape_anomaly&search=${encodeURIComponent(scraperEmail)}`,
    );
    expect(eventsRes.status).toBe(200);
    expect(eventsRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(eventsRes.body.data[0].eventType).toBe("api_scrape_anomaly");
    expect(eventsRes.body.data[0].riskLevel).toBe("high");
    expect(eventsRes.body.data[0].userEmail).toBe(scraperEmail);
  });

  it("encodes and extracts zero-width steganography fingerprints cleanly without corrupting plain prose", () => {
    const code = "ANZ-7F3A9C21B401";
    const zw = encodeZeroWidthFingerprint(code);
    expect(zw.length).toBeGreaterThan(10);

    const prose = "Membaca adalah tindakan merdeka yang berdaulat.";
    const watermarked = `${prose}${zw}`;

    expect(decodeZeroWidthFingerprint(watermarked)).toBe(code);
    expect(decodeZeroWidthFingerprint(prose)).toBeNull();
    expect(stripZeroWidthCharacters(watermarked)).toBe(prose);
  });

  it("auto-suspends E-Reader on 7th high-risk strike, allows user appeal and admin review/reinstatement, and re-bans on 7 subsequent high-risk strikes", async () => {
    expect(DRM_HIGH_RISK_SUSPEND_THRESHOLD).toBe(7);

    const reader = agent();
    const readerEmail = await signUp(reader, "Raka Striker 7");
    const slug = "revolusi-cetak-kedaulatan-membaca";

    const read1 = await reader.get(`/api/books/${slug}/read?chapter=1`);
    expect(read1.status).toBe(200);
    const wmCode: string = read1.body.data.watermark;

    // 1. Low & medium events NEVER count toward the 7 high-risk auto-suspend limit
    for (let i = 1; i <= 8; i += 1) {
      const lowRes = await reader
        .post("/api/reading/drm-events")
        .set(originHeader)
        .send({
          bookSlug: slug,
          chapterNumber: 1,
          eventType: i % 2 === 0 ? "visibility_hidden" : "context_menu",
          triggerDetail: `Non-high distraction #${i}`,
          watermarkCode: wmCode,
          clientOs: "linux",
        });
      expect(lowRes.status).toBe(201);
      expect(lowRes.body.data.suspensionTriggered).toBe(false);
    }

    // 2. Trigger high-risk strikes 1..6 (still allowed to read)
    for (let strike = 1; strike <= 6; strike += 1) {
      const res = await reader
        .post("/api/reading/drm-events")
        .set(originHeader)
        .send({
          bookSlug: slug,
          chapterNumber: 1,
          eventType: "screenshot_shortcut",
          triggerDetail: `High strike C1 #${strike}`,
          watermarkCode: wmCode,
          clientOs: "linux",
        });
      expect(res.status).toBe(201);
      expect(res.body.data.highRiskCount).toBe(strike);
      expect(res.body.data.strikeLimit).toBe(7);
      expect(res.body.data.suspensionTriggered).toBe(false);
      expect(res.body.data.readerStatus).toBe("active");
    }

    const stillAllowed = await reader.get(`/api/books/${slug}/read?chapter=1`);
    expect(stillAllowed.status).toBe(200);

    // 3. 7th high-risk strike triggers auto-suspend on E-Reader access
    const strike7 = await reader
      .post("/api/reading/drm-events")
      .set(originHeader)
      .send({
        bookSlug: slug,
        chapterNumber: 1,
        eventType: "devtools_attempt",
        triggerDetail: "High strike C1 #7 (F12)",
        watermarkCode: wmCode,
        clientOs: "linux",
      });
    expect(strike7.status).toBe(201);
    expect(strike7.body.data.highRiskCount).toBe(7);
    expect(strike7.body.data.suspensionTriggered).toBe(true);
    expect(strike7.body.data.readerStatus).toBe("suspended");

    const blockedRead = await reader.get(`/api/books/${slug}/read?chapter=1`);
    expect(blockedRead.status).toBe(403);
    expect(blockedRead.body.error.code).toBe("READER_SUSPENDED");

    const statusSuspended = await reader.get("/api/reading/drm-status");
    expect(statusSuspended.status).toBe(200);
    expect(statusSuspended.body.data.status).toBe("suspended");
    expect(statusSuspended.body.data.latestSuspension.cycleNumber).toBe(1);

    // 4. Reader submits appeal -> transitions to appeal_pending (still blocked until admin reviews)
    const appealRes = await reader
      .post("/api/reading/drm-appeal")
      .set(originHeader)
      .send({
        appealMessage:
          "Saya tidak bermaksud membajak, tombol shortcut kepencet saat berpindah workspace.",
      });
    expect(appealRes.status).toBe(200);
    expect(appealRes.body.data.status).toBe("appeal_pending");

    const stillBlockedDuringAppeal = await reader.get(
      `/api/books/${slug}/read?chapter=1`,
    );
    expect(stillBlockedDuringAppeal.status).toBe(403);
    expect(stillBlockedDuringAppeal.body.error.code).toBe("READER_SUSPENDED");

    // Non-admin forbidden from reviewing appeals
    const forbiddenReview = await reader.get("/api/admin/drm-suspensions");
    expect(forbiddenReview.status).toBe(403);

    // 5. Admin inspects suspension queue, rejects once, then reinstates after review
    const admin = agent();
    const adminEmail = await signUp(admin, "Admin DRM Reviewer");
    await setRole(adminEmail, "admin");

    const listRes = await admin.get(
      `/api/admin/drm-suspensions?status=appeal_pending&search=${encodeURIComponent(readerEmail)}`,
    );
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    const suspensionId: string = listRes.body.data[0].id;
    expect(listRes.body.data[0].cycleNumber).toBe(1);

    const rejectRes = await admin
      .patch(`/api/admin/drm-suspensions/${suspensionId}/review`)
      .set(originHeader)
      .send({
        action: "reject",
        reviewNote: "Mohon jelaskan lebih rinci komitmen Anda.",
      });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe("rejected");

    const stillRejectedRead = await reader.get(
      `/api/books/${slug}/read?chapter=1`,
    );
    expect(stillRejectedRead.status).toBe(403);

    const approveRes = await admin
      .patch(`/api/admin/drm-suspensions/${suspensionId}/review`)
      .set(originHeader)
      .send({
        action: "approve",
        reviewNote: "Akses baca dipulihkan setelah peninjauan.",
      });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe("reinstated");

    // 6. Reinstated reader can read again and cycle highRiskCount resets to 0
    const statusAfterReinstate = await reader.get("/api/reading/drm-status");
    expect(statusAfterReinstate.status).toBe(200);
    expect(statusAfterReinstate.body.data.status).toBe("active");
    expect(statusAfterReinstate.body.data.highRiskCount).toBe(0);

    const restoredRead = await reader.get(`/api/books/${slug}/read?chapter=1`);
    expect(restoredRead.status).toBe(200);

    // 7. Reinstated user commits 7 MORE high-risk violations -> auto-suspended AGAIN (Cycle 2)!
    for (let strike = 1; strike <= 6; strike += 1) {
      const c2Res = await reader
        .post("/api/reading/drm-events")
        .set(originHeader)
        .send({
          bookSlug: slug,
          chapterNumber: 1,
          eventType: "clipboard_copy",
          triggerDetail: `High strike C2 #${strike}`,
          watermarkCode: wmCode,
          clientOs: "linux",
        });
      expect(c2Res.status).toBe(201);
      expect(c2Res.body.data.highRiskCount).toBe(strike);
      expect(c2Res.body.data.suspensionTriggered).toBe(false);
    }

    const c2Strike7 = await reader
      .post("/api/reading/drm-events")
      .set(originHeader)
      .send({
        bookSlug: slug,
        chapterNumber: 1,
        eventType: "screenshot_shortcut",
        triggerDetail: "High strike C2 #7 (PrintScreen)",
        watermarkCode: wmCode,
        clientOs: "linux",
      });
    expect(c2Strike7.status).toBe(201);
    expect(c2Strike7.body.data.highRiskCount).toBe(7);
    expect(c2Strike7.body.data.suspensionTriggered).toBe(true);
    expect(c2Strike7.body.data.readerStatus).toBe("suspended");

    const reBannedRead = await reader.get(`/api/books/${slug}/read?chapter=1`);
    expect(reBannedRead.status).toBe(403);
    expect(reBannedRead.body.error.code).toBe("READER_SUSPENDED");

    const statusCycle2 = await reader.get("/api/reading/drm-status");
    expect(statusCycle2.status).toBe(200);
    expect(statusCycle2.body.data.status).toBe("suspended");
    expect(statusCycle2.body.data.latestSuspension.cycleNumber).toBe(2);
  });
});
