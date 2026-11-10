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
import { user } from "./user";
import { books } from "./anzabook";
import type {
  CalendarType,
  EventFormat,
  EventTheme,
  EventType,
  EventVisibility,
  RsvpStatus,
} from "@starter/shared/validators/community";
import type {
  EventCoHostDto,
  FeaturedWorkDto,
} from "@starter/shared/types";

export const communityCalendars = pgTable(
  "community_calendars",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    type: varchar("type", { length: 32 })
      .$type<CalendarType>()
      .notNull()
      .default("community"),
    description: text("description").notNull().default(""),
    avatarUrl: text("avatar_url"),
    coverUrl: text("cover_url"),
    city: varchar("city", { length: 80 }),
    contactEmail: varchar("contact_email", { length: 160 }),
    socialLinks: jsonb("social_links").$type<{
      instagram?: string;
      twitter?: string;
      website?: string;
    }>(),
    verificationStatus: varchar("verification_status", { length: 32 })
      .$type<"pending" | "verified" | "trusted" | "rejected">()
      .notNull()
      .default("pending"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("community_calendars_slug_idx").on(table.slug),
    index("community_calendars_status_idx").on(table.verificationStatus),
    index("community_calendars_creator_idx").on(table.createdByUserId),
  ],
);

export const communityCalendarMembers = pgTable(
  "community_calendar_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => communityCalendars.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 })
      .$type<"owner" | "admin" | "checkin_staff" | "member">()
      .notNull()
      .default("admin"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("community_calendar_members_cal_user_unique").on(
      table.calendarId,
      table.userId,
    ),
    index("community_calendar_members_user_idx").on(table.userId),
  ],
);

export const communityCalendarFollowers = pgTable(
  "community_calendar_followers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => communityCalendars.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("community_calendar_followers_cal_user_unique").on(
      table.calendarId,
      table.userId,
    ),
    index("community_calendar_followers_user_idx").on(table.userId),
  ],
);

export const communityEvents = pgTable(
  "community_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => communityCalendars.id, { onDelete: "cascade" }),
    bookId: uuid("book_id").references(() => books.id, {
      onDelete: "set null",
    }),
    featuredWork: jsonb("featured_work").$type<FeaturedWorkDto | null>(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    logisticsNotes: text("logistics_notes"),
    coverUrl: text("cover_url").notNull(),
    themePreset: varchar("theme_preset", { length: 32 })
      .$type<EventTheme>()
      .notNull()
      .default("minimal"),
    visibility: varchar("visibility", { length: 32 })
      .$type<EventVisibility>()
      .notNull()
      .default("public"),
    eventType: varchar("event_type", { length: 40 })
      .$type<EventType>()
      .notNull()
      .default("book_club"),
    categoryTag: varchar("category_tag", { length: 64 })
      .notNull()
      .default("Literasi"),
    coHosts: jsonb("co_hosts").$type<EventCoHostDto[]>().notNull().default([]),
    format: varchar("format", { length: 32 })
      .$type<EventFormat>()
      .notNull()
      .default("offline"),
    district: varchar("district", { length: 120 }),
    city: varchar("city", { length: 80 }),
    venueName: varchar("venue_name", { length: 200 }),
    venueAddress: text("venue_address"),
    hideAddressUntilApproved: boolean("hide_address_until_approved")
      .notNull()
      .default(false),
    latitude: real("latitude"),
    longitude: real("longitude"),
    placeSourceLat: real("place_source_lat"),
    placeSourceLng: real("place_source_lng"),
    onlineMeetingUrl: text("online_meeting_url"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    timezone: varchar("timezone", { length: 64 })
      .notNull()
      .default("Asia/Jakarta"),
    capacity: integer("capacity"),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    allowWaitlist: boolean("allow_waitlist").notNull().default(true),
    status: varchar("status", { length: 32 })
      .$type<"draft" | "pending_review" | "published" | "canceled" | "completed">()
      .notNull()
      .default("published"),
    parentEventId: uuid("parent_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("community_events_cal_idx").on(table.calendarId),
    index("community_events_book_idx").on(table.bookId),
    index("community_events_starts_idx").on(table.startsAt),
    index("community_events_status_idx").on(table.status),
  ],
);

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => communityEvents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 })
      .$type<RsvpStatus>()
      .notNull()
      .default("going"),
    note: text("note"),
    checkinCode: varchar("checkin_code", { length: 32 }).notNull(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInByUserId: text("checked_in_by_user_id").references(() => user.id, {
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
    uniqueIndex("event_rsvps_event_user_unique").on(
      table.eventId,
      table.userId,
    ),
    index("event_rsvps_event_checkin_idx").on(
      table.eventId,
      table.checkinCode,
    ),
    index("event_rsvps_user_created_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
  ],
);

export const eventReports = pgTable(
  "event_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => communityEvents.id, { onDelete: "cascade" }),
    reporterUserId: text("reporter_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("event_reports_event_idx").on(table.eventId)],
);
