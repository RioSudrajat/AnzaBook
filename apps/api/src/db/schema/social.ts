import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AuthorStatus } from "@starter/shared/types";
import { user } from "./user";
import { books } from "./anzabook";

export const userFollows = pgTable(
  "user_follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerUserId: text("follower_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingUserId: text("following_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isSubscribedUpdates: boolean("is_subscribed_updates")
      .notNull()
      .default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_follows_follower_following_unique").on(
      table.followerUserId,
      table.followingUserId,
    ),
    index("user_follows_follower_idx").on(table.followerUserId),
    index("user_follows_following_idx").on(table.followingUserId),
  ],
);

export const authorApplications = pgTable(
  "author_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    penName: varchar("pen_name", { length: 160 }).notNull(),
    bio: text("bio").notNull(),
    portfolioUrl: text("portfolio_url"),
    claimedBookId: uuid("claimed_book_id").references(() => books.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 20 })
      .$type<AuthorStatus>()
      .notNull()
      .default("pending"),
    rejectionReason: text("rejection_reason"),
    verificationDocuments: jsonb("verification_documents").$type<
      Array<{ title: string; url: string; fileType?: string }>
    >(),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("author_applications_user_idx").on(table.userId),
    index("author_applications_status_idx").on(table.status),
  ],
);
