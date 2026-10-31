import { describe, expect, it } from "vitest";
import { calculatePrintEconomics } from "@starter/shared/print-economics";
import { createReadingSessionSchema } from "@starter/shared/validators/reading";

describe("AnzaBook Print Economics & Shared Validators", () => {
  it("calculates Edisi Rakyat (Newsprint 48.8gsm) at >45% lower retail price than traditional bookstore distribution", () => {
    const result = calculatePrintEconomics({
      pageCount: 240,
      printRun: 3000,
      authorRoyaltyPct: 12,
    });
    const rakyat = result.tiers.find((t) => t.editionTier === "rakyat_economy");
    const standard = result.tiers.find((t) => t.editionTier === "standard_trade");
    expect(rakyat).toBeDefined();
    expect(standard).toBeDefined();
    expect(rakyat!.recommendedPriceIdr).toBeGreaterThanOrEqual(25000);
    expect(rakyat!.recommendedPriceIdr).toBeLessThanOrEqual(49000);
    expect(rakyat!.recommendedPriceIdr).toBeLessThan(
      standard!.traditionalRetailPriceIdr * 0.55,
    );
  });

  it("rejects out-of-range WPM or injected userId on reading sessions", () => {
    expect(
      createReadingSessionSchema.safeParse({
        bookId: "550e8400-e29b-41d4-a716-446655440000",
        pagesRead: 12,
        durationSeconds: 900,
        avgWpm: 1850,
        mode: "full",
      }).success,
    ).toBe(false);

    expect(
      createReadingSessionSchema.safeParse({
        bookId: "550e8400-e29b-41d4-a716-446655440000",
        pagesRead: 12,
        durationSeconds: 900,
        avgWpm: 240,
        mode: "full",
        userId: "injected-owner",
      }).success,
    ).toBe(false);
  });
});
