import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  DigitalPolicy,
  PublisherMemberRole,
  PublisherVerificationStatus,
  ManuscriptSubmissionStatus,
} from "@starter/shared/types";
import { user } from "./user";
import { books } from "./anzabook";
import { communityCalendars } from "./events";

export const publishers = pgTable(
  "publishers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    ikapiNumber: varchar("ikapi_number", { length: 80 }),
    description: text("description"),
    logoUrl: text("logo_url"),
    city: varchar("city", { length: 80 }),
    address: text("address"),
    contactEmail: varchar("contact_email", { length: 255 }),
    verificationStatus: varchar("verification_status", { length: 20 })
      .$type<PublisherVerificationStatus>()
      .notNull()
      .default("pending"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    freeClaimCodeQuotaPerBook: integer("free_claim_code_quota_per_book")
      .notNull()
      .default(500),
    claimCodeFeeIdr: integer("claim_code_fee_idr").notNull().default(2000),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("publishers_slug_idx").on(table.slug),
    index("publishers_status_idx").on(table.verificationStatus),
  ],
);

export const publisherMembers = pgTable(
  "publisher_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publisherId: uuid("publisher_id")
      .notNull()
      .references(() => publishers.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 })
      .$type<PublisherMemberRole>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("publisher_members_pub_user_unique").on(
      table.publisherId,
      table.userId,
    ),
    index("publisher_members_user_idx").on(table.userId),
  ],
);

export const manuscriptSubmissions = pgTable(
  "manuscript_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    publisherId: uuid("publisher_id").references(() => publishers.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    synopsis: text("synopsis").notNull(),
    proposedDigitalPolicy: varchar("proposed_digital_policy", { length: 32 })
      .$type<DigitalPolicy>()
      .notNull(),
    proposedAlacartePriceIdr: integer("proposed_alacarte_price_idr"),
    printSimJson: jsonb("print_sim_json").$type<Record<string, unknown> | null>(),
    status: varchar("status", { length: 20 })
      .$type<ManuscriptSubmissionStatus>()
      .notNull()
      .default("pending_review"),
    rejectionReason: text("rejection_reason"),
    publishedBookId: uuid("published_book_id").references(() => books.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("manuscript_submissions_author_idx").on(table.authorUserId),
    index("manuscript_submissions_publisher_idx").on(table.publisherId),
    index("manuscript_submissions_status_idx").on(table.status),
  ],
);

export const manuscriptChapters = pgTable(
  "manuscript_chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    manuscriptId: uuid("manuscript_id")
      .notNull()
      .references(() => manuscriptSubmissions.id, { onDelete: "cascade" }),
    chapterNumber: integer("chapter_number").notNull(),
    titleId: varchar("title_id", { length: 255 }).notNull(),
    contentId: text("content_id").notNull(),
    contentEn: text("content_en"),
    blueprintContent: text("blueprint_content"),
    estimatedMinutes: integer("estimated_minutes").notNull().default(5),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("manuscript_chapters_manuscript_num_unique").on(
      table.manuscriptId,
      table.chapterNumber,
    ),
    index("manuscript_chapters_manuscript_idx").on(table.manuscriptId),
  ],
);

export const bookClaimBatches = pgTable(
  "book_claim_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    publisherId: uuid("publisher_id")
      .notNull()
      .references(() => publishers.id, { onDelete: "cascade" }),
    batchName: varchar("batch_name", { length: 160 }).notNull(),
    totalCodes: integer("total_codes").notNull(),
    unitFeeIdr: integer("unit_fee_idr").notNull().default(0),
    billingStatus: varchar("billing_status", { length: 20 })
      .$type<"free_tier" | "unbilled" | "paid">()
      .notNull()
      .default("free_tier"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("book_claim_batches_book_idx").on(table.bookId),
    index("book_claim_batches_publisher_idx").on(table.publisherId),
  ],
);

export const bookPurchases = pgTable(
  "book_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    priceIdr: integer("price_idr").notNull(),
    publisherShareIdr: integer("publisher_share_idr").notNull(),
    affiliateCalendarId: uuid("affiliate_calendar_id").references(
      () => communityCalendars.id,
      { onDelete: "set null" },
    ),
    affiliateCommissionIdr: integer("affiliate_commission_idr")
      .notNull()
      .default(0),
    anzabookNetIdr: integer("anzabook_net_idr").notNull(),
    status: varchar("status", { length: 20 })
      .$type<"pending" | "paid" | "failed">()
      .notNull()
      .default("paid"),
    paymentMethod: varchar("payment_method", { length: 50 })
      .notNull()
      .default("manual_or_midtrans"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("book_purchases_user_idx").on(table.userId),
    index("book_purchases_book_idx").on(table.bookId),
    index("book_purchases_affiliate_cal_idx").on(table.affiliateCalendarId),
  ],
);

export const communityWalletLedgers = pgTable(
  "community_wallet_ledgers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => communityCalendars.id, { onDelete: "cascade" }),
    entryType: varchar("entry_type", { length: 40 })
      .$type<
        | "affiliate_nakama"
        | "affiliate_book_purchase"
        | "paid_event_ticket"
        | "payout_withdrawal"
      >()
      .notNull(),
    amountIdr: integer("amount_idr").notNull(),
    sourceOrderId: text("source_order_id"),
    sourceEventId: text("source_event_id"),
    sourceBookPurchaseId: text("source_book_purchase_id"),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("community_wallet_ledgers_cal_idx").on(table.calendarId),
    index("community_wallet_ledgers_created_idx").on(table.createdAt.desc()),
  ],
);
