import {
  doublePrecision,
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
import type {
  SpotCategory,
  SpotFacilitiesDto,
  SpotNoiseLevel,
  SpotPriceRange,
  SpotReportReason,
  SpotReviewTag,
  SpotSource,
  SpotStatus,
  SpotVerifiedBadge,
} from "@starter/shared/types";
import { storeBranches } from "./anzabook";
import { communityCalendars } from "./events";
import { user } from "./user";

export const readingSpots = pgTable(
  "reading_spots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    name: varchar("name", { length: 180 }).notNull(),
    category: varchar("category", { length: 32 })
      .$type<SpotCategory>()
      .notNull(),
    description: text("description"),
    address: text("address").notNull(),
    district: varchar("district", { length: 120 }),
    city: varchar("city", { length: 100 }).notNull(),
    province: varchar("province", { length: 100 }).notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    googleMapsUrl: text("google_maps_url"),
    googlePlaceId: varchar("google_place_id", { length: 128 }),
    instagramHandle: varchar("instagram_handle", { length: 80 }),
    websiteUrl: text("website_url"),
    openingHoursText: varchar("opening_hours_text", { length: 160 }),
    priceRange: varchar("price_range", { length: 24 })
      .$type<SpotPriceRange>()
      .notNull()
      .default("budget"),
    noiseLevel: varchar("noise_level", { length: 24 })
      .$type<SpotNoiseLevel>()
      .notNull()
      .default("moderate"),
    facilities: jsonb("facilities")
      .$type<SpotFacilitiesDto>()
      .notNull()
      .default({}),
    coverUrl: text("cover_url"),
    source: varchar("source", { length: 32 })
      .$type<SpotSource>()
      .notNull()
      .default("curated"),
    externalSourceId: varchar("external_source_id", { length: 160 }),
    linkedBranchId: uuid("linked_branch_id").references(
      () => storeBranches.id,
      { onDelete: "set null" },
    ),
    linkedCalendarId: uuid("linked_calendar_id").references(
      () => communityCalendars.id,
      { onDelete: "set null" },
    ),
    submittedByUserId: text("submitted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 24 })
      .$type<SpotStatus>()
      .notNull()
      .default("published"),
    verifiedBadge: varchar("verified_badge", { length: 24 })
      .$type<SpotVerifiedBadge>()
      .notNull()
      .default("none"),
    rejectionReason: text("rejection_reason"),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    bookmarkCount: integer("bookmark_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("reading_spots_status_lat_lng_idx").on(
      table.status,
      table.latitude,
      table.longitude,
    ),
    index("reading_spots_status_city_idx").on(table.status, table.city),
    index("reading_spots_status_category_idx").on(table.status, table.category),
    index("reading_spots_branch_idx").on(table.linkedBranchId),
    uniqueIndex("reading_spots_source_ext_unique").on(
      table.source,
      table.externalSourceId,
    ),
  ],
);

export const readingSpotReviews = pgTable(
  "reading_spot_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spotId: uuid("spot_id")
      .notNull()
      .references(() => readingSpots.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    content: text("content").notNull(),
    tags: jsonb("tags").$type<SpotReviewTag[]>().notNull().default([]),
    helpfulCount: integer("helpful_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("reading_spot_reviews_spot_user_unique").on(
      table.spotId,
      table.userId,
    ),
    index("reading_spot_reviews_spot_created_idx").on(
      table.spotId,
      table.createdAt.desc(),
    ),
  ],
);

export const readingSpotBookmarks = pgTable(
  "reading_spot_bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spotId: uuid("spot_id")
      .notNull()
      .references(() => readingSpots.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("reading_spot_bookmarks_spot_user_unique").on(
      table.spotId,
      table.userId,
    ),
    index("reading_spot_bookmarks_user_idx").on(table.userId),
  ],
);

export const readingSpotReports = pgTable(
  "reading_spot_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spotId: uuid("spot_id")
      .notNull()
      .references(() => readingSpots.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id").references(() => readingSpotReviews.id, {
      onDelete: "set null",
    }),
    reporterUserId: text("reporter_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reasonType: varchar("reason_type", { length: 32 })
      .$type<SpotReportReason>()
      .notNull(),
    details: text("details").notNull(),
    status: varchar("status", { length: 24 })
      .$type<"open" | "resolved" | "dismissed">()
      .notNull()
      .default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("reading_spot_reports_spot_status_idx").on(
      table.spotId,
      table.status,
    ),
  ],
);
