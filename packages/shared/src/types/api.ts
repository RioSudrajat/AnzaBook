// The JSON contract between the API and the web app. Timestamps cross the wire
// as ISO strings, so these are the shapes the browser actually receives.

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
};

export type PageMeta = { limit: number; offset: number; hasMore: boolean };

export type Paginated<T> = { data: T[]; meta: PageMeta };

export type DataResponse<T> = { data: T };

export type NoteDto = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminNoteDto = NoteDto & { ownerName: string; ownerEmail: string };

// ---------------- AnzaBook DTOs ---------------- //

export type DigitalPolicy = "free_open" | "sample_only" | "print_claim_only";
export type AccessTier = "free" | "premium" | "premium_physical";
export type EditionTier = "rakyat_economy" | "standard_trade" | "kolektor_hardcover";
export type PartnerType = "gramedia" | "togamas" | "pos_indonesia" | "komunitas";
export type ShelfStatus = "want_to_read" | "reading" | "finished" | "abandoned";
export type ReadingMode = "full" | "blueprint" | "audio";
export type HighlightColor = "yellow" | "green" | "coral" | "blue";

export type BookPrintEditionDto = {
  id: string;
  bookId: string;
  tier: EditionTier;
  tierName: string;
  paperType: string;
  coverType: string;
  bindingType: string;
  priceIdr: number;
  traditionalStorePriceIdr: number;
  savingsPercent: number;
  weightGrams: number;
  inStock: boolean;
};

export type StoreStockItemDto = {
  id: string;
  branchName: string;
  partnerType: PartnerType;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  rakyatStock: number;
  standardStock: number;
  lastStockCheck: string;
};

export type BookSummaryDto = {
  id: string;
  slug: string;
  title: string;
  originalTitle: string | null;
  author: string;
  authorAvatar: string | null;
  editor: string | null;
  editorAvatar: string | null;
  translator: string | null;
  coverUrl: string;
  coverColor: string;
  synopsis: string;
  bulletinExcerpt: string | null;
  publishedYear: number;
  pageCount: number;
  totalChapters: number;
  readingMinutes: number;
  audioDurationMinutes: number;
  digitalPolicy: DigitalPolicy;
  accessTier: AccessTier;
  hasPhysical: boolean;
  isWeeklyBulletin: boolean;
  rakyatPriceIdr: number;
  standardPriceIdr: number;
  ratingAvg: number;
  ratingCount: number;
  availableLanguages: string[];
  categories: string[];
  collectionName: string | null;
  genres: string[];
};

export type BookDetailDto = BookSummaryDto & {
  chapters: BookChapterSummaryDto[];
  editions: BookPrintEditionDto[];
  storeStocks: StoreStockItemDto[];
  hasClaimedDigital: boolean;
  totalShelved: number;
};

export type BookChapterSummaryDto = {
  id: string;
  chapterNumber: number;
  title: string;
  isSample: boolean;
};

export type BookReaderChapterDto = {
  id: string;
  chapterNumber: number;
  title: string;
  contentId: string;
  contentEn: string | null;
  blueprintContent: string;
  audioUrl: string | null;
  audioDurationSeconds: number | null;
};

export type BookReaderPayloadDto = {
  book: BookSummaryDto;
  mode: ReadingMode;
  currentChapter: BookReaderChapterDto;
  chapters?: BookReaderChapterDto[];
  allChapters: BookChapterSummaryDto[];
  hasFullAccess: boolean;
  accessExpiresAt: string | null;
};

export type ReadingSessionDto = {
  id: string;
  bookId: string;
  bookTitle: string;
  pagesRead: number;
  durationSeconds: number;
  avgWpm: number;
  mode: ReadingMode;
  createdAt: string;
};

export type ReadingTelemetrySummaryDto = {
  totalMinutesRead: number;
  totalPagesRead: number;
  currentStreakDays: number;
  booksCompleted: number;
  avgWpm: number;
};

export type ShelfItemDto = {
  id: string;
  bookId: string;
  book: BookSummaryDto;
  shelfStatus: ShelfStatus;
  favorite: boolean;
  progressPercent: number;
  previewProgressPercent?: number | null;
  updatedAt: string;
};

export type BookReviewDto = {
  id: string;
  bookId: string;
  userName: string;
  userRole: string;
  rating: number;
  content: string;
  editionTierReviewed: string;
  createdAt: string;
};

export type ParagraphCommentDto = {
  id: string;
  chapterId: string;
  paragraphIndex: number;
  userName: string;
  content: string;
  createdAt: string;
};

export type BookHighlightDto = {
  id: string;
  userId: string;
  bookId: string;
  chapterId: string | null;
  chapterNumber: number;
  pageNumber: number;
  selectedText: string;
  color: HighlightColor;
  note: string | null;
  createdAt: string;
};

export type ReadingProgressDto = {
  bookId: string;
  lastChapterId: string | null;
  lastChapterNumber: number;
  lastPageNumber: number;
  lastScrollPercent: number;
  lastParagraphIndex: number | null;
  layout: "scroll" | "slide" | null;
  capturedAt: number;
  updatedAt: string;
};

export type ReadingProgressScope = "full" | "preview";

export type AuthorSummaryDto = {
  name: string;
  avatarUrl: string | null;
  bookCount: number;
};

export type CollectionSummaryDto = {
  name: string;
  slug: string;
  bookCount: number;
  coverUrl?: string;
};

export type {
  PrintEconomicsResult,
  PrintTierResult,
  SimulatePrintInput,
} from "../print-economics.js";

