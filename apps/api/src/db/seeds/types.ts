export type ChapterSeed = {
  chapterNumber: number;
  titleId: string;
  titleEn: string;
  contentId: string;
  contentEn?: string | null;
  audioUrl?: string | null;
  audioDurationSec?: number | null;
};

export type PrintEditionSeed = {
  tier: "rakyat_economy" | "standard_trade" | "kolektor_hardcover";
  tierName: string;
  paperType: string;
  paperGsm: number;
  coverType: string;
  bindingType: string;
  priceIdr: number;
  traditionalPriceIdr: number;
  savingsPercent: number;
  weightGrams: number;
  inStock: boolean;
  isbn: string;
};

export type SeedAuthorUsername = "selembarawan" | "okesudrajat" | "anzabook";

export type BookSeed = {
  slug: string;
  title: string;
  author: string;
  authorUsername: SeedAuthorUsername;
  preserveDisplayAuthor?: boolean;
  authorAvatar?: string | null;
  editor?: string;
  editorAvatar?: string;
  coverUrl: string;
  coverColor: string;
  synopsis: string;
  bulletinExcerpt?: string | null;
  publishedYear: number;
  pageCount: number;
  totalChapters: number;
  readingMinutes: number;
  audioDurationMinutes: number;
  digitalPolicy: "free_open" | "nakama_subscription" | "single_purchase";
  accessTier: "free" | "premium";
  digitalPriceIdr?: number | null;
  hasPhysical: boolean;
  securityLevel: string;
  isWeeklyBulletin: boolean;
  rakyatPriceIdr: number;
  standardPriceIdr: number;
  ratingAvg: number;
  ratingCount: number;
  availableLanguages: string[];
  categories: string[];
  collectionName?: string;
  genres: string[];
  chapters: ChapterSeed[];
  editions: PrintEditionSeed[];
  claimCodes: string[];
};
