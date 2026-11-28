import { describe, expect, it } from "vitest";
import {
  formatBookRatingText,
  resolveBookAccessMeta,
  resolveBookPrimaryCategory,
  resolveReadingProgressMeta,
} from "../../../web/src/features/books/book-card-helpers";

describe("book-card-helpers", () => {
  it("resolves Gratis for free_open and hides digital price", () => {
    expect(
      resolveBookAccessMeta({
        digitalPolicy: "free_open",
        accessTier: "free",
        digitalPriceIdr: 99_000,
      }),
    ).toEqual({
      isFree: true,
      label: "Gratis",
      isSinglePurchase: false,
      formattedPrice: null,
    });
  });

  it("resolves Premium without price for nakama_subscription", () => {
    expect(
      resolveBookAccessMeta({
        digitalPolicy: "nakama_subscription",
        accessTier: "premium",
        digitalPriceIdr: null,
      }),
    ).toEqual({
      isFree: false,
      label: "Premium",
      isSinglePurchase: false,
      formattedPrice: null,
    });
  });

  it("resolves Premium with formatted IDR price for single_purchase", () => {
    const meta = resolveBookAccessMeta({
      digitalPolicy: "single_purchase",
      accessTier: "premium",
      digitalPriceIdr: 129_000,
    });
    expect(meta.isFree).toBe(false);
    expect(meta.label).toBe("Premium");
    expect(meta.isSinglePurchase).toBe(true);
    expect(meta.formattedPrice).toBe("Rp129.000");
  });

  it("clamps reading progress cleanly and labels preview vs full progress", () => {
    expect(
      resolveReadingProgressMeta({
        progressPercent: 140,
      }),
    ).toEqual({
      percent: 100,
      label: "100%",
      ariaLabel: "Progres baca 100%",
    });

    expect(
      resolveReadingProgressMeta({
        progressPercent: 80,
        previewProgressPercent: 50,
        previewBookPercent: 12,
      }),
    ).toEqual({
      percent: 12,
      label: "Cuplikan 12%",
      ariaLabel: "Progres cuplikan 12%",
    });
  });

  it("resolves primary category and formats rating cleanly", () => {
    expect(
      resolveBookPrimaryCategory({
        genres: ["Filsafat"],
        categories: ["Sejarah"],
      }),
    ).toBe("Filsafat");
    expect(resolveBookPrimaryCategory({ genres: [], categories: [] })).toBe(
      "Umum",
    );
    expect(formatBookRatingText(5, 3)).toBe("5/5 (3 ulasan)");
    expect(formatBookRatingText(4.6, 5)).toBe("4.6/5 (5 ulasan)");
    expect(formatBookRatingText(0, 0)).toBeNull();
  });
});
