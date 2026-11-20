import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  DrmClientOs,
  DrmEventType,
  DrmRiskLevel,
} from "@starter/shared/validators/drm";
import { books } from "./anzabook";
import { session } from "./session";
import { user } from "./user";

export const drmWatermarkSessions = pgTable(
  "drm_watermark_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    watermarkCode: varchar("watermark_code", { length: 32 }).notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    authSessionId: text("auth_session_id").references(() => session.id, {
      onDelete: "set null",
    }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("drm_watermark_sessions_session_book_unique").on(
      table.authSessionId,
      table.bookId,
    ),
    index("drm_watermark_sessions_user_idx").on(table.userId),
    index("drm_watermark_sessions_book_idx").on(table.bookId),
  ],
);

export const drmSecurityEvents = pgTable(
  "drm_security_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    watermarkSessionId: uuid("watermark_session_id").references(
      () => drmWatermarkSessions.id,
      { onDelete: "set null" },
    ),
    watermarkCode: varchar("watermark_code", { length: 64 }).notNull(),
    bookId: uuid("book_id").references(() => books.id, {
      onDelete: "set null",
    }),
    bookSlug: varchar("book_slug", { length: 120 }).notNull(),
    chapterNumber: integer("chapter_number"),
    eventType: varchar("event_type", { length: 48 })
      .$type<DrmEventType>()
      .notNull(),
    riskLevel: varchar("risk_level", { length: 16 })
      .$type<DrmRiskLevel>()
      .notNull(),
    triggerDetail: varchar("trigger_detail", { length: 255 }).notNull(),
    clientOs: varchar("client_os", { length: 32 })
      .$type<DrmClientOs>()
      .notNull()
      .default("unknown"),
    userAgent: varchar("user_agent", { length: 512 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("drm_security_events_created_idx").on(table.createdAt.desc()),
    index("drm_security_events_risk_created_idx").on(
      table.riskLevel,
      table.createdAt.desc(),
    ),
    index("drm_security_events_user_created_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
    index("drm_security_events_watermark_idx").on(table.watermarkCode),
  ],
);
