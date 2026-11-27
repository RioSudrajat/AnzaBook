import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import type { ExplorePostItemDto } from "@starter/shared/types";
import { bookSlugSchema } from "@starter/shared/validators/books";
import { createEventSchema } from "@starter/shared/validators/community";
import { applyPublisherSchema } from "@starter/shared/validators/publisher";
import { isUsableAssetUrl } from "../../../web/src/lib/media-url";
import { buildPostPreviewSvg } from "../../../web/src/features/share/post-preview-svg";
import {
  _resetPreviewRateLimits,
  checkPreviewRateLimit,
} from "../../../web/src/lib/preview-rate-limit.server";
import {
  safeExternalHref,
  safeSocialHref,
} from "../../../web/src/lib/safe-url";
import { db } from "../db";
import {
  bookChapters,
  books,
  publisherMembers,
  publishers,
  user,
} from "../db/schema";
import {
  applyServerSecurityTimeouts,
  SERVER_SECURITY_TIMEOUTS,
} from "../lib/server-timeouts";
import { errorHandler } from "../middleware/error-handler";
import {
  _resetSpotRateLimits,
  postAuthorApplicationRateLimit,
  postClaimCodeRateLimit,
  postDrmAppealRateLimit,
  postMediaUploadRateLimit,
  postMemberLookupRateLimit,
  postReadingSessionRateLimit,
  postSocialPublishRateLimit,
  publicCatalogRateLimit,
  publicExploreRateLimit,
} from "../middleware/spot-rate-limit";
import { agent, originHeader, signUp } from "./helpers";

const freeSlug = "kecerdasan-sosial-homo-sapiens";
const secondFreeSlug = "madilog-tan-malaka";
const premiumSlug = "merobek-langit-dogma";

async function lookupBook(slug: string) {
  const [book] = await db
    .select()
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);
  if (!book) throw new Error(`Missing seeded book ${slug}`);
  return book;
}

describe("Pre-Semifinal Security Audit & Regression Suite (PR #29-#33)", () => {
  beforeEach(() => {
    _resetSpotRateLimits();
    _resetPreviewRateLimits();
  });

  describe("1. Stored XSS, Unsafe URL Schemes & SVG Data URI Rejection", () => {
    it("rejects javascript:/data: schemes in author applications and verification documents", async () => {
      const author = agent();
      await signUp(author, "Penulis Audit");

      const badPortfolio = await author
        .post("/api/social/author-applications")
        .set(originHeader)
        .send({
          penName: "Penulis X",
          bio: "Bio kepenulisan yang cukup panjang untuk validasi.",
          portfolioUrl: "javascript:alert(document.cookie)",
        });
      expect(badPortfolio.status).toBe(422);

      const dataHtmlPortfolio = await author
        .post("/api/social/author-applications")
        .set(originHeader)
        .send({
          penName: "Penulis X",
          bio: "Bio kepenulisan yang cukup panjang untuk validasi.",
          portfolioUrl: "data:text/html,<script>alert(1)</script>",
        });
      expect(dataHtmlPortfolio.status).toBe(422);

      const badDocs = await author
        .post("/api/social/author-applications")
        .set(originHeader)
        .send({
          penName: "Penulis X",
          bio: "Bio kepenulisan yang cukup panjang untuk validasi.",
          portfolioUrl: "https://example.com/karya",
          verificationDocuments: [{ title: "KTP", url: "javascript:alert(1)" }],
        });
      expect(badDocs.status).toBe(422);
    });

    it("rejects SVG data URIs, dangerous schemes, and oversized images in PATCH /api/social/me", async () => {
      const reader = agent();
      await signUp(reader, "Pembaca Profil");

      const svgAvatar = await reader
        .patch("/api/social/me")
        .set(originHeader)
        .send({
          image: "data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj4=",
        });
      expect(svgAvatar.status).toBe(422);

      const svgHeader = await reader
        .patch("/api/social/me")
        .set(originHeader)
        .send({
          headerImage: "data:image/svg+xml;utf8,<svg onload='alert(1)'/>",
        });
      expect(svgHeader.status).toBe(422);

      const jsImage = await reader
        .patch("/api/social/me")
        .set(originHeader)
        .send({
          image: "javascript:alert(1)",
        });
      expect(jsImage.status).toBe(422);

      const oversizedAvatar = await reader
        .patch("/api/social/me")
        .set(originHeader)
        .send({
          image: `data:image/png;base64,${"A".repeat(95_000)}`,
        });
      expect(oversizedAvatar.status).toBe(422);

      const badWebsite = await reader
        .patch("/api/social/me")
        .set(originHeader)
        .send({
          socialLinks: { website: "javascript:alert(1)" },
        });
      expect(badWebsite.status).toBe(422);

      const badTwitter = await reader
        .patch("/api/social/me")
        .set(originHeader)
        .send({
          socialLinks: { twitter: "data:text/html,<script>alert(1)</script>" },
        });
      expect(badTwitter.status).toBe(422);

      const validRes = await reader
        .patch("/api/social/me")
        .set(originHeader)
        .send({
          image: "data:image/png;base64,iVBORw0KGgo=",
          socialLinks: {
            instagram: "@pembaca_aman",
            website: "https://anzabook.id",
          },
        });
      expect(validRes.status).toBe(200);
    });

    it("rejects unsafe links and verificationDocuments in calendar, event, and publisher schemas", async () => {
      const organizer = agent();
      await signUp(organizer, "Komunitas Audit");
      const slugBase = `klub-audit-${randomUUID().slice(0, 6)}`;

      const badCalSocial = await organizer
        .post("/api/events/calendars")
        .set(originHeader)
        .send({
          name: "Klub Audit",
          slug: slugBase,
          socialLinks: { website: "javascript:alert(1)" },
        });
      expect(badCalSocial.status).toBe(422);

      const badCalDoc = await organizer
        .post("/api/events/calendars")
        .set(originHeader)
        .send({
          name: "Klub Audit",
          slug: slugBase,
          verificationDocuments: [{ title: "Akta", url: "file:///etc/passwd" }],
        });
      expect(badCalDoc.status).toBe(422);

      const validCal = await organizer
        .post("/api/events/calendars")
        .set(originHeader)
        .send({
          name: "Klub Literasi Aman",
          slug: slugBase,
          socialLinks: {
            instagram: "@klub_aman",
            whatsapp: "+6281234567890",
            website: "anzabook.id",
          },
        });
      expect(validCal.status).toBe(201);

      expect(
        createEventSchema.safeParse({
          calendarId: randomUUID(),
          title: "Acara Tidak Aman",
          description: "Deskripsi acara untuk uji validasi tautan.",
          coverUrl: "data:image/svg+xml;base64,PHN2Zy8+",
          format: "online",
          onlineMeetingUrl: "https://meet.google.com/abc-defg-hij",
          startsAt: "2026-11-28T10:00:00.000Z",
          endsAt: "2026-11-28T12:00:00.000Z",
        }).success,
      ).toBe(false);

      expect(
        createEventSchema.safeParse({
          calendarId: randomUUID(),
          title: "Acara Link Rapat Buruk",
          description: "Deskripsi acara untuk uji validasi tautan.",
          coverUrl: "https://example.com/poster.png",
          format: "online",
          onlineMeetingUrl: "javascript:alert(1)",
          startsAt: "2026-11-28T10:00:00.000Z",
          endsAt: "2026-11-28T12:00:00.000Z",
        }).success,
      ).toBe(false);

      expect(
        applyPublisherSchema.safeParse({
          name: "Penerbit Test",
          slug: `penerbit-${randomUUID().slice(0, 6)}`,
          socialLinks: { website: "javascript:alert(1)" },
        }).success,
      ).toBe(false);

      expect(
        applyPublisherSchema.safeParse({
          name: "Penerbit Aman",
          slug: `penerbit-${randomUUID().slice(0, 6)}`,
          socialLinks: {
            whatsapp: "+628123456789",
            website: "https://penerbit.id",
          },
        }).success,
      ).toBe(true);
    });

    it("guards admin external href rendering via safeExternalHref", () => {
      expect(safeExternalHref("https://anzabook.id/docs.pdf")).toBe(
        "https://anzabook.id/docs.pdf",
      );
      expect(safeExternalHref("http://localhost:3000/test")).toBe(
        "http://localhost:3000/test",
      );
      expect(safeExternalHref("javascript:alert(1)")).toBeNull();
      expect(
        safeExternalHref("DATA:text/html,<script>alert(1)</script>"),
      ).toBeNull();
      expect(safeExternalHref("vbscript:msgbox(1)")).toBeNull();
      expect(safeExternalHref("//evil.example/phish")).toBeNull();
      expect(safeExternalHref("@handle")).toBeNull();
      expect(safeExternalHref("https://example.com\nX-Inject: 1")).toBeNull();
    });
  });

  describe("2. CSRF requireTrustedOrigin Enforcement Across Reading & Social Mutations", () => {
    it("blocks missing Origin, untrusted Origin, and Sec-Fetch-Site: cross-site with 403 FORBIDDEN_ORIGIN", async () => {
      const client = agent();
      await signUp(client, "Pengguna CSRF");

      const id = randomUUID();
      const mutations: Array<{
        method: "post" | "put" | "patch" | "delete";
        path: string;
        body?: Record<string, unknown>;
      }> = [
        { method: "post", path: "/api/reading", body: {} },
        { method: "put", path: `/api/reading/progress/${id}`, body: {} },
        { method: "post", path: "/api/reading/highlights", body: {} },
        { method: "delete", path: `/api/reading/highlights/${id}` },
        { method: "post", path: `/api/reading/restart/${id}`, body: {} },
        { method: "patch", path: "/api/social/me", body: {} },
        { method: "post", path: "/api/social/author-applications", body: {} },
        { method: "post", path: `/api/social/users/${id}/follow`, body: {} },
        { method: "delete", path: `/api/social/users/${id}/follow` },
        {
          method: "post",
          path: `/api/social/highlights/${id}/toggle-post`,
          body: {},
        },
        {
          method: "post",
          path: `/api/social/sessions/${id}/toggle-post`,
          body: {},
        },
      ];

      for (const m of mutations) {
        const missingOriginReq = client[m.method](m.path);
        const missingOriginRes = m.body
          ? await missingOriginReq.send(m.body)
          : await missingOriginReq;
        expect(
          missingOriginRes.status,
          `Missing Origin should return 403 on ${m.method.toUpperCase()} ${m.path}`,
        ).toBe(403);
        expect(missingOriginRes.body.error.code).toBe("FORBIDDEN_ORIGIN");

        const evilOriginReq = client[m.method](m.path).set(
          "Origin",
          "https://evil.example",
        );
        const evilOriginRes = m.body
          ? await evilOriginReq.send(m.body)
          : await evilOriginReq;
        expect(
          evilOriginRes.status,
          `Evil Origin should return 403 on ${m.method.toUpperCase()} ${m.path}`,
        ).toBe(403);
        expect(evilOriginRes.body.error.code).toBe("FORBIDDEN_ORIGIN");

        const crossSiteReq = client[m.method](m.path)
          .set(originHeader)
          .set("Sec-Fetch-Site", "cross-site");
        const crossSiteRes = m.body
          ? await crossSiteReq.send(m.body)
          : await crossSiteReq;
        expect(
          crossSiteRes.status,
          `Sec-Fetch-Site: cross-site should return 403 on ${m.method.toUpperCase()} ${m.path}`,
        ).toBe(403);
        expect(crossSiteRes.body.error.code).toBe("FORBIDDEN_ORIGIN");
      }
    });
  });

  describe("3. UUID Validation, IDOR & Digital Access Boundaries", () => {
    it("returns 422 (never 500) for invalid highlight UUID params", async () => {
      const reader = agent();
      await signUp(reader, "Pembaca UUID");

      const badGet = await reader.get("/api/reading/highlights/not-a-uuid");
      expect(badGet.status).toBe(422);

      const badDelete = await reader
        .delete("/api/reading/highlights/not-a-uuid")
        .set(originHeader);
      expect(badDelete.status).toBe(422);
    });

    it("enforces book existence, cross-book chapter integrity, and digital access boundaries on highlights & restart", async () => {
      const reader = agent();
      await signUp(reader, "Pembaca Akses Digital");

      const freeBook = await lookupBook(freeSlug);
      const otherFreeBook = await lookupBook(secondFreeSlug);
      const premiumBook = await lookupBook(premiumSlug);

      const [otherBookChapter] = await db
        .select()
        .from(bookChapters)
        .where(eq(bookChapters.bookId, otherFreeBook.id))
        .limit(1);
      expect(otherBookChapter).toBeDefined();

      const [premiumCh2] = await db
        .select()
        .from(bookChapters)
        .where(
          and(
            eq(bookChapters.bookId, premiumBook.id),
            eq(bookChapters.chapterNumber, 2),
          ),
        )
        .limit(1);

      // Unknown bookId -> 404 BOOK_NOT_FOUND
      const unknownRes = await reader
        .post("/api/reading/highlights")
        .set(originHeader)
        .send({
          bookId: randomUUID(),
          selectedText: "Kutipan untuk buku fiktif",
        });
      expect(unknownRes.status).toBe(404);
      expect(unknownRes.body.error.code).toBe("BOOK_NOT_FOUND");

      // Chapter ID belonging to another book -> 422 INVALID_CHAPTER_REFERENCE
      const crossChapterRes = await reader
        .post("/api/reading/highlights")
        .set(originHeader)
        .send({
          bookId: freeBook.id,
          chapterId: otherBookChapter.id,
          chapterNumber: 1,
          selectedText: "Kutipan lintas buku",
        });
      expect(crossChapterRes.status).toBe(422);
      expect(crossChapterRes.body.error.code).toBe("INVALID_CHAPTER_REFERENCE");

      // Premium book Chapter 2 without full access -> 403 FORBIDDEN_DIGITAL_ACCESS
      const forbiddenCh2Res = await reader
        .post("/api/reading/highlights")
        .set(originHeader)
        .send({
          bookId: premiumBook.id,
          chapterNumber: 2,
          selectedText: "Mencoba highlight bab terkunci",
        });
      expect(forbiddenCh2Res.status).toBe(403);
      expect(forbiddenCh2Res.body.error.code).toBe("FORBIDDEN_DIGITAL_ACCESS");

      if (premiumCh2) {
        const forbiddenByChapterIdRes = await reader
          .post("/api/reading/highlights")
          .set(originHeader)
          .send({
            bookId: premiumBook.id,
            chapterId: premiumCh2.id,
            chapterNumber: 1,
            selectedText: "Bypass via chapterId bab 2",
          });
        expect(forbiddenByChapterIdRes.status).toBe(403);
        expect(forbiddenByChapterIdRes.body.error.code).toBe(
          "FORBIDDEN_DIGITAL_ACCESS",
        );
      }

      // Premium book Chapter 1 preview highlight -> allowed (201)
      const previewCh1Res = await reader
        .post("/api/reading/highlights")
        .set(originHeader)
        .send({
          bookId: premiumBook.id,
          chapterNumber: 1,
          pageNumber: 1,
          selectedText: "Cuplikan bab pertama yang terbuka",
        });
      expect(previewCh1Res.status).toBe(201);

      // Restarting locked premium book without full access -> 403 FORBIDDEN_DIGITAL_ACCESS
      const forbiddenRestart = await reader
        .post(`/api/reading/restart/${premiumBook.id}`)
        .set(originHeader);
      expect(forbiddenRestart.status).toBe(403);
      expect(forbiddenRestart.body.error.code).toBe("FORBIDDEN_DIGITAL_ACCESS");

      // Restarting free book -> 200
      const freeRestart = await reader
        .post(`/api/reading/restart/${freeBook.id}`)
        .set(originHeader);
      expect(freeRestart.status).toBe(200);
    });

    it("blocks cross-user IDOR on highlight delete and social publish toggles, and enforces FLEX-03/DRM-05 privacy", async () => {
      const userA = agent();
      const userB = agent();
      await signUp(userA, "Pemilik Asli");
      await signUp(userB, "Penyerang IDOR");

      const freeBook = await lookupBook(freeSlug);

      const createdHighlight = await userA
        .post("/api/reading/highlights")
        .set(originHeader)
        .send({
          bookId: freeBook.id,
          chapterNumber: 1,
          selectedText: "Kutipan milik pengguna A",
          note: "Catatan rahasia pemilik",
        });
      expect(createdHighlight.status).toBe(201);
      const highlightId = createdHighlight.body.data.id as string;

      const createdSession = await userA
        .post("/api/reading")
        .set(originHeader)
        .send({
          bookId: freeBook.id,
          wordsRead: 500,
          durationSeconds: 180,
          avgWpm: 167,
        });
      expect(createdSession.status).toBe(201);
      const sessionId = createdSession.body.data.id as string;

      // Cross-user IDOR blocks
      const hijackDelete = await userB
        .delete(`/api/reading/highlights/${highlightId}`)
        .set(originHeader);
      expect(hijackDelete.status).toBe(404);

      const hijackToggleQuote = await userB
        .post(`/api/social/highlights/${highlightId}/toggle-post`)
        .set(originHeader)
        .send({ isPosted: true });
      expect(hijackToggleQuote.status).toBe(404);

      const hijackToggleSession = await userB
        .post(`/api/social/sessions/${sessionId}/toggle-post`)
        .set(originHeader)
        .send({ isPosted: true });
      expect(hijackToggleSession.status).toBe(404);

      // Private unposted resources must 404 publicly
      expect(
        (await userB.get(`/api/social/posts/quote/${highlightId}`)).status,
      ).toBe(404);
      expect(
        (await userB.get(`/api/social/posts/session/${sessionId}`)).status,
      ).toBe(404);

      // DRM-05: >400 chars cannot be published
      const longHighlight = await userA
        .post("/api/reading/highlights")
        .set(originHeader)
        .send({
          bookId: freeBook.id,
          chapterNumber: 1,
          selectedText: "K".repeat(401),
        });
      expect(longHighlight.status).toBe(201);
      const drmRejected = await userA
        .post(
          `/api/social/highlights/${longHighlight.body.data.id}/toggle-post`,
        )
        .set(originHeader)
        .send({ isPosted: true });
      expect(drmRejected.status).toBe(422);
      expect(drmRejected.body.error.code).toBe("EXCERPT_TOO_LONG");

      // FLEX-03 privacy toggles strip hidden fields on public endpoint
      await userA
        .post(`/api/social/highlights/${highlightId}/toggle-post`)
        .set(originHeader)
        .send({
          isPosted: true,
          postConfig: {
            template: "book_cover",
            aspect: "square",
            alignment: "left",
            includeNote: false,
          },
        });
      const publicQuote = await userB.get(
        `/api/social/posts/quote/${highlightId}`,
      );
      expect(publicQuote.status).toBe(200);
      expect(publicQuote.body.data.note).toBeNull();

      await userA
        .post(`/api/social/sessions/${sessionId}/toggle-post`)
        .set(originHeader)
        .send({
          isPosted: true,
          postConfig: {
            template: "cover_trail",
            aspect: "4:3",
            showWpm: false,
            showDuration: false,
            showPages: false,
          },
        });
      const publicSession = await userB.get(
        `/api/social/posts/session/${sessionId}`,
      );
      expect(publicSession.status).toBe(200);
      expect(publicSession.body.data.avgWpm).toBeNull();
      expect(publicSession.body.data.durationSeconds).toBeUndefined();
      expect(publicSession.body.data.pagesRead).toBeUndefined();
    });
  });

  describe("4. OG Preview SVG Hardening & Slug Path-Traversal Protection", () => {
    it("strips XML-illegal control characters and escapes markup in buildPostPreviewSvg", () => {
      const maliciousPost: ExplorePostItemDto = {
        id: randomUUID(),
        type: "quote",
        content: 'Uji\u0000\u0007\u001B <script>alert(1)</script> "onload="x"',
        note: "Catatan\u0008 <svg/>",
        postCaption: null,
        chapterNumber: 1,
        pageNumber: 1,
        createdAt: "2026-11-26T00:00:00.000Z",
        author: {
          id: "u1",
          name: "Nama\u007F <img src=x>",
          username: "uji_svg",
          image: null,
        },
        book: {
          id: "b1",
          slug: "madilog-tan-malaka",
          title: 'Buku\u0000 "XSS" & <Tag>',
          author: "Tan\u000B Malaka",
          coverColor: "#283618",
          coverUrl: null,
        },
        postConfig: {
          template: "furrow_paper",
          aspect: "square",
          alignment: "left",
          includeNote: true,
        },
      };

      const svg = buildPostPreviewSvg(maliciousPost);
      const hasIllegalXmlChar = Array.from(svg).some((ch) => {
        const code = ch.charCodeAt(0);
        return (
          (code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
          code === 0x7f
        );
      });
      expect(hasIllegalXmlChar).toBe(false);
      expect(svg).not.toContain("<script>");
      expect(svg).not.toContain("<img");
      expect(svg).toContain("&#60;script&#62;");
      expect(svg).toContain("&#60;svg/&#62;");
    });

    it("rejects path-traversal slugs in bookSlugSchema", () => {
      for (const badSlug of ["..", ".", "../admin", "foo/bar", "", "A..B"]) {
        expect(bookSlugSchema.safeParse({ slug: badSlug }).success).toBe(false);
      }
      expect(
        bookSlugSchema.safeParse({ slug: "madilog-tan-malaka" }).success,
      ).toBe(true);
    });
  });

  describe("5. Per-User Abuse Rate Limiters & Body Enforcement", () => {
    function createLimitedApp(limiter: express.RequestHandler) {
      const app = express();
      app.use(express.json());
      app.use("/test", limiter, (_req, res) => {
        res.json({ ok: true });
      });
      app.use(errorHandler);
      return app;
    }

    it("enforces rate limits when x-test-rate-limit: true is set and bypasses otherwise", async () => {
      const authorApp = createLimitedApp(postAuthorApplicationRateLimit);
      for (let i = 0; i < 5; i++) {
        expect(
          (
            await request(authorApp)
              .post("/test")
              .set("x-test-rate-limit", "true")
          ).status,
        ).toBe(200);
      }
      const blockedAuthor = await request(authorApp)
        .post("/test")
        .set("x-test-rate-limit", "true");
      expect(blockedAuthor.status).toBe(429);
      expect(blockedAuthor.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(blockedAuthor.headers["retry-after"]).toBeDefined();

      // Without x-test-rate-limit header in test env, cleanly bypasses
      expect((await request(authorApp).post("/test")).status).toBe(200);

      const appealApp = createLimitedApp(postDrmAppealRateLimit);
      for (let i = 0; i < 5; i++) {
        expect(
          (
            await request(appealApp)
              .post("/test")
              .set("x-test-rate-limit", "true")
          ).status,
        ).toBe(200);
      }
      expect(
        (
          await request(appealApp)
            .post("/test")
            .set("x-test-rate-limit", "true")
        ).status,
      ).toBe(429);

      const socialApp = createLimitedApp(postSocialPublishRateLimit);
      for (let i = 0; i < 30; i++) {
        expect(
          (
            await request(socialApp)
              .post("/test")
              .set("x-test-rate-limit", "true")
          ).status,
        ).toBe(200);
      }
      expect(
        (
          await request(socialApp)
            .post("/test")
            .set("x-test-rate-limit", "true")
        ).status,
      ).toBe(429);

      const readingApp = createLimitedApp(postReadingSessionRateLimit);
      for (let i = 0; i < 60; i++) {
        expect(
          (
            await request(readingApp)
              .post("/test")
              .set("x-test-rate-limit", "true")
          ).status,
        ).toBe(200);
      }
      expect(
        (
          await request(readingApp)
            .post("/test")
            .set("x-test-rate-limit", "true")
        ).status,
      ).toBe(429);
    });

    it("rejects oversized (>100 kB) JSON bodies and non-JSON media types on PATCH /api/social/me", async () => {
      const client = agent();
      await signUp(client, "Penguji Ukuran Body");

      const nonJson = await client
        .patch("/api/social/me")
        .set(originHeader)
        .set("Content-Type", "text/plain")
        .send("bio=hello");
      expect(nonJson.status).toBe(415);
      expect(nonJson.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");

      const oversizedBody = {
        bio: "x".repeat(110 * 1024),
      };
      const tooLarge = await client
        .patch("/api/social/me")
        .set(originHeader)
        .send(oversizedBody);
      expect(tooLarge.status).toBe(413);
      expect(tooLarge.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    });
  });

  describe("6. Anti-Slowloris Timeouts, Public/OG Flood Protection & Social Href Guards", () => {
    it("applies strict Slowloris HTTP server timeouts with keepAliveTimeout < headersTimeout < requestTimeout", () => {
      const mockServer = {
        keepAliveTimeout: 5000,
        headersTimeout: 60_000,
        requestTimeout: 300_000,
        maxHeadersCount: 2000,
      } as unknown as Server;

      applyServerSecurityTimeouts(mockServer);

      expect(mockServer.keepAliveTimeout).toBe(
        SERVER_SECURITY_TIMEOUTS.keepAliveTimeoutMs,
      );
      expect(mockServer.headersTimeout).toBe(
        SERVER_SECURITY_TIMEOUTS.headersTimeoutMs,
      );
      expect(mockServer.requestTimeout).toBe(
        SERVER_SECURITY_TIMEOUTS.requestTimeoutMs,
      );
      expect(mockServer.maxHeadersCount).toBe(
        SERVER_SECURITY_TIMEOUTS.maxHeadersCount,
      );
      expect(mockServer.keepAliveTimeout).toBe(5_000);
      expect(mockServer.headersTimeout).toBe(10_000);
      expect(mockServer.requestTimeout).toBe(30_000);
      expect(mockServer.maxHeadersCount).toBe(100);
      expect(mockServer.keepAliveTimeout).toBeLessThan(
        mockServer.headersTimeout,
      );
      expect(mockServer.headersTimeout).toBeLessThan(mockServer.requestTimeout);
    });

    it("enforces HTTP-flood rate limits on public Explore (60/min) and Catalog (120/min) endpoints", async () => {
      const exploreApp = express();
      exploreApp.get("/explore", publicExploreRateLimit, (_req, res) => {
        res.json({ ok: true });
      });
      exploreApp.use(errorHandler);

      for (let i = 0; i < 60; i++) {
        expect(
          (
            await request(exploreApp)
              .get("/explore")
              .set("x-test-rate-limit", "true")
          ).status,
        ).toBe(200);
      }
      const blockedExplore = await request(exploreApp)
        .get("/explore")
        .set("x-test-rate-limit", "true");
      expect(blockedExplore.status).toBe(429);
      expect(blockedExplore.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(blockedExplore.headers["retry-after"]).toBeDefined();

      const catalogApp = express();
      catalogApp.get("/books", publicCatalogRateLimit, (_req, res) => {
        res.json({ ok: true });
      });
      catalogApp.use(errorHandler);

      for (let i = 0; i < 120; i++) {
        expect(
          (
            await request(catalogApp)
              .get("/books")
              .set("x-test-rate-limit", "true")
          ).status,
        ).toBe(200);
      }
      const blockedCatalog = await request(catalogApp)
        .get("/books")
        .set("x-test-rate-limit", "true");
      expect(blockedCatalog.status).toBe(429);
      expect(blockedCatalog.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(blockedCatalog.headers["retry-after"]).toBeDefined();
    });

    it("enforces per-IP sliding window limit (30/min) on OG preview WASM routes and isolates IPs", () => {
      const makeReq = (ip: string, forceTestLimit = true) =>
        new Request("https://anzabook.id/post-preview/quote/123", {
          headers: {
            "cf-connecting-ip": ip,
            ...(forceTestLimit ? { "x-test-rate-limit": "true" } : {}),
          },
        });

      for (let i = 0; i < 30; i++) {
        expect(checkPreviewRateLimit(makeReq("203.0.113.10"))).toEqual({
          allowed: true,
        });
      }

      const blocked = checkPreviewRateLimit(makeReq("203.0.113.10"));
      expect(blocked.allowed).toBe(false);
      if (!blocked.allowed) {
        expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      }

      // Distinct client IP gets an independent quota
      expect(checkPreviewRateLimit(makeReq("203.0.113.11"))).toEqual({
        allowed: true,
      });

      // Without x-test-rate-limit header in NODE_ENV=test, bypasses cleanly
      expect(checkPreviewRateLimit(makeReq("203.0.113.10", false))).toEqual({
        allowed: true,
      });
    });

    it("normalizes safe handles/domains and blocks obfuscated schemes in safeSocialHref", () => {
      expect(safeSocialHref("@pembaca", "instagram")).toBe(
        "https://instagram.com/pembaca",
      );
      expect(safeSocialHref("@pembaca", "twitter")).toBe(
        "https://x.com/pembaca",
      );
      expect(safeSocialHref("pembaca-buku", "linkedin")).toBe(
        "https://linkedin.com/in/pembaca-buku",
      );
      expect(safeSocialHref("anzabook.id", "website")).toBe(
        "https://anzabook.id/",
      );
      expect(safeSocialHref("https://anzabook.id/profil", "website")).toBe(
        "https://anzabook.id/profil",
      );

      for (const malicious of [
        "http:alert(1)",
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "//evil.example/phish",
        "pembaca onclick=alert(1)",
        "pembaca\nalert(1)",
      ]) {
        expect(safeSocialHref(malicious, "instagram")).toBeNull();
        expect(safeSocialHref(malicious, "twitter")).toBeNull();
        expect(safeSocialHref(malicious, "linkedin")).toBeNull();
        expect(safeSocialHref(malicious, "whatsapp")).toBeNull();
        expect(safeSocialHref(malicious, "website")).toBeNull();
      }

      expect(safeSocialHref("+628123456789", "whatsapp")).toBe(
        "https://wa.me/628123456789",
      );
      expect(safeSocialHref("https://wa.me/62812", "whatsapp")).toBe(
        "https://wa.me/62812",
      );
    });
  });

  describe("7. Latest Main Gaps: Media Upload Security, Wildcard Enumeration, Claim-Code Rate Limits & Asset SVG Guards", () => {
    it("sets sandboxed CSP on served media images, rejects spoofed SVG uploads, and rate limits media/member/claim endpoints", async () => {
      const uploader = agent();
      await signUp(uploader, "Pengunggah Media Aman");

      // Spoofed SVG bytes sent with image/png header -> 415
      const spoofed = await uploader
        .post("/api/media/upload-image")
        .set(originHeader)
        .set("Content-Type", "image/png")
        .send(Buffer.from("<svg onload=alert(1)></svg>", "utf8"));
      expect(spoofed.status).toBe(415);

      // Valid PNG magic bytes -> 201 and served with CSP sandbox + nosniff
      const pngMagic = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const uploaded = await uploader
        .post("/api/media/upload-image")
        .set(originHeader)
        .set("Content-Type", "image/png")
        .send(pngMagic);
      expect(uploaded.status).toBe(201);
      const filename = String(uploaded.body.data.key).replace("images/", "");

      const served = await uploader.get(`/api/media/images/${filename}`);
      expect(served.status).toBe(200);
      expect(served.headers["content-security-policy"]).toBe(
        "default-src 'none'; sandbox",
      );
      expect(served.headers["x-content-type-options"]).toBe("nosniff");

      const makeTestApp = (limiter: express.RequestHandler) => {
        const app = express();
        app.post("/limit", limiter, (_req, res) => {
          res.json({ ok: true });
        });
        app.use(errorHandler);
        return app;
      };

      const mediaApp = makeTestApp(postMediaUploadRateLimit);
      for (let i = 0; i < 20; i++) {
        expect(
          (
            await request(mediaApp)
              .post("/limit")
              .set("x-test-rate-limit", "true")
          ).status,
        ).toBe(200);
      }
      const blockedMedia = await request(mediaApp)
        .post("/limit")
        .set("x-test-rate-limit", "true");
      expect(blockedMedia.status).toBe(429);
      expect(blockedMedia.headers["retry-after"]).toBeDefined();

      const lookupApp = makeTestApp(postMemberLookupRateLimit);
      for (let i = 0; i < 20; i++) {
        expect(
          (
            await request(lookupApp)
              .post("/limit")
              .set("x-test-rate-limit", "true")
          ).status,
        ).toBe(200);
      }
      expect(
        (
          await request(lookupApp)
            .post("/limit")
            .set("x-test-rate-limit", "true")
        ).status,
      ).toBe(429);

      const claimApp = makeTestApp(postClaimCodeRateLimit);
      for (let i = 0; i < 10; i++) {
        expect(
          (
            await request(claimApp)
              .post("/limit")
              .set("x-test-rate-limit", "true")
          ).status,
        ).toBe(200);
      }
      expect(
        (
          await request(claimApp)
            .post("/limit")
            .set("x-test-rate-limit", "true")
        ).status,
      ).toBe(429);
    });

    it("blocks SQL ILIKE wildcard enumeration on calendar member and publisher approved-writer lookups", async () => {
      const owner = agent();
      const target = agent();
      const ownerEmail = await signUp(owner, "Pemilik Audit Wildcard");
      const targetEmail = await signUp(target, "Target Eksak");

      const [ownerRow] = await db
        .select()
        .from(user)
        .where(eq(user.email, ownerEmail));
      expect(ownerRow).toBeDefined();

      const calSlug = `cal-wildcard-${randomUUID().slice(0, 6)}`;
      const calRes = await owner
        .post("/api/events/calendars")
        .set(originHeader)
        .send({ name: "Kalender Wildcard Audit", slug: calSlug });
      expect(calRes.status).toBe(201);

      // Multi-char wildcard patterns (>= min(2) Zod bound) reach DB lookup and must fail with 404
      for (const wildcard of ["%%", "%@example.com", "_____%"]) {
        const wildcardCal = await owner
          .post(`/api/events/calendars/${calSlug}/members`)
          .set(originHeader)
          .send({ identifier: wildcard, role: "checkin_staff" });
        expect(wildcardCal.status).toBe(404);
      }

      // Exact case-insensitive email match works
      const exactCal = await owner
        .post(`/api/events/calendars/${calSlug}/members`)
        .set(originHeader)
        .send({
          identifier: targetEmail.toUpperCase(),
          role: "checkin_staff",
        });
      expect(exactCal.status).toBe(201);

      // Seed publisher + owner membership to verify approved-writer wildcard blocking
      const pubSlug = `pub-wildcard-${randomUUID().slice(0, 6)}`;
      const [pubRow] = await db
        .insert(publishers)
        .values({
          name: "Penerbit Audit Wildcard",
          slug: pubSlug,
          verificationStatus: "verified",
        })
        .returning();
      await db.insert(publisherMembers).values({
        publisherId: pubRow.id,
        userId: ownerRow.id,
        role: "owner",
      });

      for (const wildcard of ["%%", "%@example.com"]) {
        const wildcardWriter = await owner
          .post(`/api/publisher/${pubSlug}/approved-writers`)
          .set(originHeader)
          .send({ identifier: wildcard, canFastTrack: false });
        expect(wildcardWriter.status).toBe(404);
      }

      const exactWriter = await owner
        .post(`/api/publisher/${pubSlug}/approved-writers`)
        .set(originHeader)
        .send({
          identifier: targetEmail.toUpperCase(),
          canFastTrack: false,
        });
      expect(exactWriter.status).toBe(201);
      expect(exactWriter.body.data.invitedEmail).toBe(targetEmail);
    });

    it("rejects active SVG data URIs in isUsableAssetUrl while allowing safe raster assets", () => {
      expect(isUsableAssetUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe(
        false,
      );
      expect(isUsableAssetUrl("data:image/svg+xml,<svg/>")).toBe(false);
      expect(isUsableAssetUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
      expect(isUsableAssetUrl("https://anzabook.id/cover.png")).toBe(true);
      expect(isUsableAssetUrl("/api/media/images/sample.webp")).toBe(true);
    });
  });
});
