import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  getDrmEventRiskLevel,
  resolveReaderDrmPolicy,
} from "@starter/shared/validators/drm";
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
    const slug = "revolusi-cetak-kedaulatan-membaca";

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
});
