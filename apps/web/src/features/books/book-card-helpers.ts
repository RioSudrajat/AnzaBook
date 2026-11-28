import type { BookSummaryDto } from "@starter/shared/types";

export type BookAccessMeta = {
  isFree: boolean;
  label: "Gratis" | "Premium";
  isSinglePurchase: boolean;
  formattedPrice: string | null;
};

export type ReadingProgressMeta = {
  percent: number;
  label: string;
  ariaLabel: string;
};

function formatPriceIdr(amount: number): string {
  return `Rp${Math.round(amount).toLocaleString("id-ID")}`;
}

export function resolveBookAccessMeta(
  book: Pick<
    BookSummaryDto,
    "digitalPolicy" | "accessTier" | "digitalPriceIdr"
  >,
): BookAccessMeta {
  const isFree =
    book.digitalPolicy === "free_open" ||
    (!book.digitalPolicy && book.accessTier === "free");
  const isSinglePurchase = book.digitalPolicy === "single_purchase";
  const formattedPrice =
    isSinglePurchase &&
    typeof book.digitalPriceIdr === "number" &&
    book.digitalPriceIdr > 0
      ? formatPriceIdr(book.digitalPriceIdr)
      : null;

  return {
    isFree,
    label: isFree ? "Gratis" : "Premium",
    isSinglePurchase,
    formattedPrice,
  };
}

export function resolveBookPrimaryCategory(
  book: Pick<BookSummaryDto, "genres" | "categories">,
): string {
  return book.genres?.[0]?.trim() || book.categories?.[0]?.trim() || "Umum";
}

export function resolveReadingProgressMeta(input: {
  progressPercent: number;
  previewProgressPercent?: number | null;
  previewBookPercent?: number | null;
}): ReadingProgressMeta {
  const isPreview = input.previewProgressPercent != null;
  const rawPercent = isPreview
    ? (input.previewBookPercent ?? input.previewProgressPercent ?? 0)
    : input.progressPercent;
  const percent = Math.min(100, Math.max(0, Math.round(rawPercent || 0)));

  return {
    percent,
    label: isPreview ? `Cuplikan ${percent}%` : `${percent}%`,
    ariaLabel: isPreview
      ? `Progres cuplikan ${percent}%`
      : `Progres baca ${percent}%`,
  };
}

export function formatBookRatingText(
  ratingAvg: number,
  ratingCount: number,
): string | null {
  if (!Number.isFinite(ratingCount) || ratingCount <= 0) return null;
  const safeAvg = Number.isFinite(ratingAvg)
    ? Math.min(5, Math.max(0, ratingAvg))
    : 0;
  const rounded = Math.round(safeAvg);
  const scoreText =
    Math.abs(safeAvg - rounded) < 0.05 ? `${rounded}` : safeAvg.toFixed(1);
  return `${scoreText}/5 (${ratingCount} ulasan)`;
}
