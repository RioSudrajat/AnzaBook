import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { DigitalPolicy } from "@starter/shared/types";
import { user } from "./user";
import { publishers, bookClaimBatches } from "./publishers";

export const books = pgTable(
  "books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    originalTitle: varchar("original_title", { length: 255 }),
    author: varchar("author", { length: 255 }).notNull(),
    authorAvatar: text("author_avatar"),
    editor: varchar("editor", { length: 255 }),
    editorAvatar: text("editor_avatar"),
    translator: varchar("translator", { length: 255 }),
    coverUrl: text("cover_url").notNull(),
    coverColor: varchar("cover_color", { length: 32 })
      .notNull()
      .default("#13110F"),
    synopsis: text("synopsis").notNull(),
    bulletinExcerpt: text("bulletin_excerpt"),
    publishedYear: integer("published_year").notNull().default(2026),
    pageCount: integer("page_count").notNull(),
    totalChapters: integer("total_chapters").notNull().default(1),
    readingMinutes: integer("reading_minutes").notNull().default(20),
    audioDurationMinutes: integer("audio_duration_minutes")
      .notNull()
      .default(0),
    digitalPolicy: varchar("digital_policy", { length: 32 })
      .$type<DigitalPolicy>()
      .notNull()
      .default("sample_only"),
    publisherId: uuid("publisher_id").references(() => publishers.id, {
      onDelete: "set null",
    }),
    authorUserId: text("author_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    alacartePriceIdr: integer("alacarte_price_idr"),
    accessTier: varchar("access_tier", { length: 32 })
      .$type<"free" | "premium" | "premium_physical">()
      .notNull()
      .default("free"),
    hasPhysical: boolean("has_physical").notNull().default(true),
    securityLevel: varchar("security_level", { length: 32 })
      .notNull()
      .default("standard_blur"),
    isWeeklyBulletin: boolean("is_weekly_bulletin").notNull().default(false),
    rakyatPriceIdr: integer("rakyat_price_idr").notNull().default(35000),
    standardPriceIdr: integer("standard_price_idr").notNull().default(75000),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    availableLanguages: jsonb("available_languages")
      .$type<string[]>()
      .notNull()
      .default(["id"]),
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    collectionName: varchar("collection_name", { length: 120 }),
    genres: jsonb("genres").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("books_bulletin_idx").on(table.isWeeklyBulletin),
    index("books_publisher_idx").on(table.publisherId),
    index("books_author_user_idx").on(table.authorUserId),
  ],
);

export const bookChapters = pgTable(
  "book_chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    chapterNumber: integer("chapter_number").notNull(),
    isBlueprintSummary: boolean("is_blueprint_summary")
      .notNull()
      .default(false),
    titleId: varchar("title_id", { length: 255 }).notNull(),
    titleEn: varchar("title_en", { length: 255 }),
    contentId: text("content_id").notNull(),
    contentEn: text("content_en"),
    blueprintContent: text("blueprint_content").notNull().default(""),
    paragraphsJson: jsonb("paragraphs_json")
      .$type<
        {
          index: number;
          textId: string;
          textEn?: string;
          audioStartSec?: number;
          audioEndSec?: number;
        }[]
      >()
      .notNull()
      .default([]),
    audioUrl: text("audio_url"),
    audioDurationSec: integer("audio_duration_sec"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("book_chapters_book_num_unique").on(
      table.bookId,
      table.chapterNumber,
    ),
    index("book_chapters_book_idx").on(table.bookId),
  ],
);

export const bookPrintEditions = pgTable(
  "book_print_editions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    isbn: varchar("isbn", { length: 32 }).unique(),
    tier: varchar("tier", { length: 32 }).notNull(), // "rakyat_economy" | "standard_trade" | "kolektor_hardcover"
    tierName: varchar("tier_name", { length: 120 }).notNull(),
    paperType: varchar("paper_type", { length: 120 }).notNull(),
    paperGsm: real("paper_gsm").notNull(),
    coverType: varchar("cover_type", { length: 120 }).notNull(),
    bindingType: varchar("binding_type", { length: 120 })
      .notNull()
      .default("Lem Panas"),
    priceIdr: integer("price_idr").notNull(),
    traditionalPriceIdr: integer("traditional_price_idr").notNull(),
    savingsPercent: integer("savings_percent").notNull(),
    weightGrams: integer("weight_grams").notNull().default(220),
    inStock: boolean("in_stock").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("book_print_editions_book_tier_idx").on(table.bookId, table.tier),
  ],
);

export const bookClaimCodes = pgTable(
  "book_claim_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").references(() => bookClaimBatches.id, {
      onDelete: "cascade",
    }),
    code: varchar("code", { length: 32 }).notNull().unique(),
    isDemo: boolean("is_demo").notNull().default(false),
    claimedByUserId: text("claimed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("book_claim_codes_user_idx").on(table.claimedByUserId),
    index("book_claim_codes_batch_idx").on(table.batchId),
  ],
);

export const storeBranches = pgTable(
  "store_branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chainName: varchar("chain_name", { length: 64 }).notNull(), // "gramedia" | "togamas" | "pos_indonesia" | "komunitas"
    branchName: varchar("branch_name", { length: 160 }).notNull(),
    city: varchar("city", { length: 80 }).notNull(),
    address: text("address").notNull(),
    mapUrl: text("map_url"),
    latitude: real("latitude").notNull().default(-6.2088),
    longitude: real("longitude").notNull().default(106.8456),
    distanceKm: real("distance_km").default(0),
    phone: varchar("phone", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("store_branches_city_idx").on(table.city),
    index("store_branches_chain_idx").on(table.chainName),
  ],
);

export const storeInventories = pgTable(
  "store_inventories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => storeBranches.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    rakyatStock: integer("rakyat_stock").notNull().default(0),
    standardStock: integer("standard_stock").notNull().default(0),
    stockStatus: varchar("stock_status", { length: 32 })
      .notNull()
      .default("available"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("store_inventories_branch_book_unique").on(
      table.branchId,
      table.bookId,
    ),
    index("store_inventories_book_idx").on(table.bookId),
  ],
);

export const readingSessions = pgTable(
  "reading_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    pagesRead: integer("pages_read").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    avgWpm: integer("avg_wpm").notNull(),
    mode: varchar("mode", { length: 32 }).notNull().default("full"),
    isValidForRoyalty: boolean("is_valid_for_royalty").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("reading_sessions_user_created_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
    index("reading_sessions_book_idx").on(table.bookId),
  ],
);

export const userShelves = pgTable(
  "user_shelves",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    shelfStatus: varchar("shelf_status", { length: 32 })
      .notNull()
      .default("want_to_read"),
    progressPercent: integer("progress_percent").notNull().default(0),
    lastChapter: integer("last_chapter").notNull().default(1),
    favorite: boolean("favorite").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_shelves_user_book_unique").on(table.userId, table.bookId),
    index("user_shelves_user_idx").on(table.userId),
  ],
);

export const bookReviews = pgTable(
  "book_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    ratingHalfSteps: integer("rating_half_steps").notNull(), // 1..10 representing 0.5..5.0
    content: text("content").notNull(),
    editionTierReviewed: varchar("edition_tier_reviewed", { length: 32 })
      .notNull()
      .default("rakyat_economy"),
    isVerifiedReader: boolean("is_verified_reader").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("book_reviews_book_created_idx").on(
      table.bookId,
      table.createdAt.desc(),
    ),
    index("book_reviews_user_idx").on(table.userId),
  ],
);

export const paragraphComments = pgTable(
  "paragraph_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => bookChapters.id, { onDelete: "cascade" }),
    paragraphIndex: integer("paragraph_index").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("paragraph_comments_chapter_para_idx").on(
      table.chapterId,
      table.paragraphIndex,
    ),
    index("paragraph_comments_user_idx").on(table.userId),
  ],
);

export const bookHighlights = pgTable(
  "book_highlights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").references(() => bookChapters.id, {
      onDelete: "cascade",
    }),
    chapterNumber: integer("chapter_number").notNull().default(1),
    pageNumber: integer("page_number").notNull().default(1),
    selectedText: text("selected_text").notNull(),
    color: varchar("color", { length: 32 })
      .$type<"yellow" | "green" | "coral" | "blue">()
      .notNull()
      .default("yellow"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("book_highlights_user_book_idx").on(table.userId, table.bookId),
    index("book_highlights_chapter_idx").on(table.chapterId),
  ],
);

export const readingProgress = pgTable(
  "reading_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    lastChapterId: uuid("last_chapter_id").references(() => bookChapters.id, {
      onDelete: "set null",
    }),
    lastChapterNumber: integer("last_chapter_number").notNull().default(1),
    lastPageNumber: integer("last_page_number").notNull().default(1),
    lastScrollPercent: integer("last_scroll_percent").notNull().default(0),
    lastParagraphIndex: integer("last_paragraph_index"),
    layout: varchar("layout", { length: 16 }).$type<"scroll" | "slide">(),
    scope: varchar("scope", { length: 16 })
      .$type<"full" | "preview">()
      .notNull()
      .default("full"),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("reading_progress_user_book_scope_unique").on(
      table.userId,
      table.bookId,
      table.scope,
    ),
    index("reading_progress_user_idx").on(table.userId),
  ],
);
