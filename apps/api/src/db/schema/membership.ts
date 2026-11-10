import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  MembershipOrderStatus,
  MembershipPlanId,
} from "@starter/shared/validators/membership";
import { user } from "./user";

export const membershipOrders = pgTable(
  "membership_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id").notNull(),
    buyerId: text("buyer_id").references(() => user.id, {
      onDelete: "set null",
    }),
    beneficiaryId: text("beneficiary_id").references(() => user.id, {
      onDelete: "set null",
    }),
    recipientUsername: text("recipient_username"),
    bookSlug: text("book_slug"),
    planId: text("plan_id").$type<MembershipPlanId>().notNull(),
    months: integer("months").notNull(),
    priceIdr: integer("price_idr").notNull(),
    subtotalIdr: integer("subtotal_idr"),
    taxIdr: integer("tax_idr"),
    taxRateBps: integer("tax_rate_bps"),
    currency: text("currency").notNull().default("IDR"),
    status: text("status")
      .$type<MembershipOrderStatus>()
      .notNull()
      .default("pending"),
    checkoutUrl: text("checkout_url"),
    checkoutCreatedAt: timestamp("checkout_created_at", { withTimezone: true }),
    paidTransactionId: text("paid_transaction_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    accessRevokedAt: timestamp("access_revoked_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "membership_orders_tax_breakdown_check",
      sql`
      (${table.subtotalIdr} IS NULL AND ${table.taxIdr} IS NULL AND ${table.taxRateBps} IS NULL)
      OR (${table.subtotalIdr} IS NOT NULL AND ${table.taxIdr} IS NOT NULL AND ${table.taxRateBps} IS NOT NULL
        AND ${table.subtotalIdr} >= 0 AND ${table.taxIdr} >= 0 AND ${table.taxRateBps} BETWEEN 0 AND 10000
        AND ${table.subtotalIdr} + ${table.taxIdr} = ${table.priceIdr})
    `,
    ),
    uniqueIndex("membership_orders_buyer_request_unique").on(
      table.buyerId,
      table.requestId,
    ),
    index("membership_orders_buyer_created_idx").on(
      table.buyerId,
      table.createdAt,
    ),
    index("membership_orders_beneficiary_paid_idx").on(
      table.beneficiaryId,
      table.paidAt,
    ),
  ],
);

export const memberships = pgTable("memberships", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
});

export const membershipPaymentEvents = pgTable(
  "membership_payment_events",
  {
    orderId: uuid("order_id")
      .notNull()
      .references(() => membershipOrders.id, { onDelete: "cascade" }),
    transactionId: text("transaction_id").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.orderId, table.transactionId, table.status] }),
  ],
);

export const membershipReminders = pgTable(
  "membership_reminders",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    kind: text("kind").$type<"expiring" | "expired">().notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.expiresAt, table.kind] }),
    index("membership_reminders_due_idx").on(table.dueAt),
  ],
);
