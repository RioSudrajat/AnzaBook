import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { googleMapsUrlSchema } from "@starter/shared/validators/spots";
import { safeUrl } from "../app";
import { errorHandler } from "../middleware/error-handler";
import {
  _resetSpotRateLimits,
  getGeocodeRateLimit,
  postReportRateLimit,
  postSpotRateLimit,
  putReviewRateLimit,
} from "../middleware/spot-rate-limit";

describe("Peta Sudut Baca Indonesia - Security & Privacy Guardrails (Issue #21)", () => {
  beforeEach(() => {
    _resetSpotRateLimits();
  });

  describe("1. UU PDP Location Privacy & URL Redaction", () => {
    it("redacts ephemeral GPS coordinates and bounding box parameters from access logs", () => {
      const url =
        "/api/spots?lat=-6.2088&lng=106.8456&minLat=-6.5&maxLat=-6.0&minLng=106.5&maxLng=107.0&category=book_cafe";
      const sanitized = safeUrl(url);

      expect(sanitized).not.toContain("-6.2088");
      expect(sanitized).not.toContain("106.8456");
      expect(sanitized).not.toContain("-6.5");
      expect(sanitized).not.toContain("-6.0");
      expect(sanitized).toContain("category=book_cafe");
      expect(sanitized).toContain("lat=%5Bredacted%5D");
      expect(sanitized).toContain("lng=%5Bredacted%5D");
    });

    it("redacts auth credentials and tokens while preserving benign query params", () => {
      const url =
        "/api/auth/callback?token=secret-token-123&code=oauth-code-456&state=active";
      const sanitized = safeUrl(url);

      expect(sanitized).not.toContain("secret-token-123");
      expect(sanitized).not.toContain("oauth-code-456");
      expect(sanitized).toContain("state=active");
      expect(sanitized).toContain("token=%5Bredacted%5D");
    });

    it("returns clean paths unmodified when no query parameters are present", () => {
      expect(safeUrl("/api/spots/tebet-literasi")).toBe(
        "/api/spots/tebet-literasi",
      );
    });
  });

  describe("2. Google Maps Universal Deep Link Validator (Anti-SSRF & Anti-Phishing)", () => {
    it("accepts valid HTTPS Google Maps canonical links and universal deep links", () => {
      const validUrls = [
        "https://maps.google.com/?q=loc:-6.2088,106.8456",
        "https://www.google.com/maps/dir/?api=1&destination=-6.2088,106.8456",
        "https://maps.app.goo.gl/abC123XyZ",
        "https://goo.gl/maps/deF456UvW",
      ];

      for (const url of validUrls) {
        const result = googleMapsUrlSchema.safeParse(url);
        expect(result.success, `Expected "${url}" to be valid`).toBe(true);
      }
    });

    it("strictly rejects non-HTTPS schemes", () => {
      const invalidScheme = "http://maps.google.com/?q=loc:-6.2088,106.8456";
      const result = googleMapsUrlSchema.safeParse(invalidScheme);
      expect(result.success).toBe(false);
    });

    it("strictly rejects protocol injection (XSS / SSRF / local file inclusion)", () => {
      const dangerousSchemes = [
        "javascript:alert(document.cookie)",
        "data:text/html,<script>alert(1)</script>",
        "file:///etc/passwd",
        "ftp://google.com/maps",
      ];

      for (const url of dangerousSchemes) {
        const result = googleMapsUrlSchema.safeParse(url);
        expect(result.success, `Expected "${url}" to be rejected`).toBe(false);
      }
    });

    it("strictly rejects non-Google domains and subdomain spoofing attempts", () => {
      const spoofedUrls = [
        "https://evil-maps.com/maps/dir",
        "https://google.com.attacker.com/maps",
        "https://phishing-anzabook.id/maps",
        "https://google.com/not-maps",
      ];

      for (const url of spoofedUrls) {
        const result = googleMapsUrlSchema.safeParse(url);
        expect(result.success, `Expected "${url}" to be rejected`).toBe(false);
      }
    });
  });

  describe("3. Abuse-Resistant Rate Limiting Middlewares", () => {
    function createTestApp(limiter: express.RequestHandler) {
      const app = express();
      app.use(express.json());
      app.use("/test", limiter, (_req, res) => {
        res.json({ ok: true });
      });
      app.use(errorHandler);
      return app;
    }

    it("enforces POST /api/spots limit (max 5 submissions / 24 hours / user)", async () => {
      const app = createTestApp(postSpotRateLimit);

      // 5 requests allowed
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post("/test")
          .set("x-test-rate-limit", "true");
        expect(res.status).toBe(200);
      }

      // 6th request rejected with 429 and Retry-After header
      const blocked = await request(app)
        .post("/test")
        .set("x-test-rate-limit", "true");
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(blocked.body.error.message).toContain(
        "Batas pengajuan sudut baca harian tercapai",
      );
      expect(blocked.headers["retry-after"]).toBeDefined();
    });

    it("enforces PUT /api/spots/:slug/reviews/me limit (max 10 requests / hour / user)", async () => {
      const app = createTestApp(putReviewRateLimit);

      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .put("/test")
          .set("x-test-rate-limit", "true");
        expect(res.status).toBe(200);
      }

      const blocked = await request(app)
        .put("/test")
        .set("x-test-rate-limit", "true");
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(blocked.body.error.message).toContain(
        "Terlalu banyak permintaan ulasan",
      );
      expect(blocked.headers["retry-after"]).toBeDefined();
    });

    it("enforces POST /api/spots/:slug/reports limit (max 10 reports / 24 hours / user)", async () => {
      const app = createTestApp(postReportRateLimit);

      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post("/test")
          .set("x-test-rate-limit", "true");
        expect(res.status).toBe(200);
      }

      const blocked = await request(app)
        .post("/test")
        .set("x-test-rate-limit", "true");
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(blocked.body.error.message).toContain(
        "Batas pengiriman laporan harian tercapai",
      );
      expect(blocked.headers["retry-after"]).toBeDefined();
    });

    it("enforces GET /api/spots/geocode limit (max 30 requests / minute / user)", async () => {
      const app = createTestApp(getGeocodeRateLimit);

      for (let i = 0; i < 30; i++) {
        const res = await request(app)
          .get("/test")
          .set("x-test-rate-limit", "true");
        expect(res.status).toBe(200);
      }

      const blocked = await request(app)
        .get("/test")
        .set("x-test-rate-limit", "true");
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(blocked.body.error.message).toContain(
        "Batas pencarian lokasi tercapai",
      );
      expect(blocked.headers["retry-after"]).toBeDefined();
    });

    it("cleanly bypasses rate limiting in test environment when x-test-rate-limit header is absent", async () => {
      const app = createTestApp(postSpotRateLimit);

      // Sending >5 requests without x-test-rate-limit header passes through cleanly
      for (let i = 0; i < 8; i++) {
        const res = await request(app).post("/test");
        expect(res.status).toBe(200);
      }
    });
  });
});
