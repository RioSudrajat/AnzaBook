import { and, asc, desc, eq, gt, isNotNull, isNull, ne } from "drizzle-orm";
import type {
  MembershipCheckoutInput,
  MembershipOrderDto,
  MembershipPlanDto,
  MembershipRecipientDto,
  MembershipSummaryDto,
} from "@starter/shared/validators/membership";
import { env } from "../config/env";
import { db } from "../db";
import {
  books,
  membershipOrders,
  membershipPaymentEvents,
  membershipReminders,
  memberships,
  user,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import { createMidtransGateway, type VerifiedPayment } from "./membership-payment";
import { getMembershipStatus, membershipExpiresAt, membershipPlans, membershipTaxBreakdown, nextOrderStatus } from "./membership-policy";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHECKOUT_WINDOW_MS = 10 * 60 * 1000;
const CHECKOUT_LIMIT = 6;
type Order = typeof membershipOrders.$inferSelect;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function listMembershipPlans(): MembershipPlanDto[] {
  const rate = env.membershipTaxRateBps;
  return membershipPlans.map(({ subtotalIdr, ...plan }) => {
    const tax = rate === null ? null : membershipTaxBreakdown(subtotalIdr, rate);
    return { ...plan, priceIdr: subtotalIdr + (tax?.taxIdr ?? 0), tax };
  });
}

function requireTaxRate() {
  const rate = env.membershipTaxRateBps;
  if (rate === null) {
    throw new HttpError(503, "PAYMENT_UNAVAILABLE", "Perhitungan pajak pembayaran belum tersedia.");
  }
  return rate;
}

function legacyTaxSnapshot(totalIdr: number) {
  // Orders created before tax snapshots already have a fixed gross amount.
  const taxRateBps = requireTaxRate();
  const taxIdr = Math.round(totalIdr * taxRateBps / (10_000 + taxRateBps));
  return { subtotalIdr: totalIdr - taxIdr, taxIdr, taxRateBps };
}

export function membershipGateway() {
  if (!env.MIDTRANS_SERVER_KEY) {
    throw new HttpError(503, "PAYMENT_UNAVAILABLE", "Pembayaran QRIS belum tersedia.");
  }
  return createMidtransGateway({
    key: env.MIDTRANS_SERVER_KEY,
    mode: env.MIDTRANS_ENV,
    webUrl: env.WEB_URL,
  });
}

function toOrder(order: Order): MembershipOrderDto {
  const awaitingPayment = order.status === "pending" || order.status === "failed";
  const linkExpired = awaitingPayment && Boolean(
    order.checkoutCreatedAt && Date.now() - order.checkoutCreatedAt.getTime() >= DAY_MS,
  );
  return {
    id: order.id,
    planId: order.planId,
    months: order.months,
    priceIdr: order.priceIdr,
    tax: order.subtotalIdr === null || order.taxIdr === null || order.taxRateBps === null
      ? null
      : { subtotalIdr: order.subtotalIdr, taxIdr: order.taxIdr, rateBps: order.taxRateBps },
    status: linkExpired ? "expired" : order.status,
    recipientUsername: order.recipientUsername,
    bookSlug: order.bookSlug,
    checkoutUrl: awaitingPayment && !linkExpired ? order.checkoutUrl : null,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
  };
}

export async function getActiveMembership(userId: string, now = new Date()) {
  const [membership] = await db
    .select({ expiresAt: memberships.expiresAt })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), gt(memberships.expiresAt, now)));
  return membership ?? null;
}

export async function getMembershipSummary(userId: string): Promise<MembershipSummaryDto> {
  const [account] = await db
    .select({
      username: user.username,
      expiresAt: memberships.expiresAt,
      reminderEmailsEnabled: user.membershipReminderEmails,
    })
    .from(user)
    .leftJoin(memberships, eq(memberships.userId, user.id))
    .where(eq(user.id, userId));
  const expiresAt = account?.expiresAt ?? null;
  return {
    username: account?.username ?? null,
    expiresAt: expiresAt?.toISOString() ?? null,
    status: getMembershipStatus(expiresAt, new Date()),
    checkoutAvailable: Boolean(env.MIDTRANS_SERVER_KEY),
    reminderEmailsEnabled: account?.reminderEmailsEnabled ?? true,
  };
}

export async function setMembershipReminderEmails(userId: string, enabled: boolean) {
  await db.update(user).set({ membershipReminderEmails: enabled }).where(eq(user.id, userId));
  return getMembershipSummary(userId);
}

export async function setMembershipUsername(userId: string, username: string) {
  try {
    const [updated] = await db.update(user)
      .set({ username })
      .where(and(eq(user.id, userId), isNull(user.username)))
      .returning({ username: user.username });
    if (updated) return { username };
  } catch (error) {
    if (error instanceof Error && (error.cause as { code?: string } | undefined)?.code === "23505") {
      throw new HttpError(409, "USERNAME_TAKEN", "Username sudah digunakan.");
    }
    throw error;
  }
  const [account] = await db.select({ username: user.username }).from(user).where(eq(user.id, userId));
  if (account?.username === username) return { username };
  throw new HttpError(409, "USERNAME_ALREADY_SET", "Username akun ini sudah terdaftar.");
}

async function findRecipient(connection: typeof db | Transaction, payerId: string, username: string) {
  const [recipient] = await connection.select({ id: user.id, displayName: user.name })
    .from(user)
    .where(and(eq(user.username, username), ne(user.id, payerId)));
  if (!recipient) throw new HttpError(404, "RECIPIENT_NOT_FOUND", "Username penerima tidak ditemukan.");
  return recipient;
}

export async function getMembershipRecipient(
  userId: string,
  username: string,
): Promise<MembershipRecipientDto> {
  const recipient = await findRecipient(db, userId, username);
  return { username, displayName: recipient.displayName };
}

async function reserveOrder(buyerId: string, input: MembershipCheckoutInput) {
  return db.transaction(async (tx) => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, buyerId)).for("no key update");
    const [existing] = await tx.select().from(membershipOrders)
      .where(and(eq(membershipOrders.buyerId, buyerId), eq(membershipOrders.requestId, input.requestId)));
    if (existing) {
      if (existing.planId !== input.planId ||
        existing.recipientUsername !== (input.recipientUsername ?? null) ||
        existing.bookSlug !== (input.bookSlug ?? null)) {
        throw new HttpError(409, "CHECKOUT_CONFLICT", "Pilihan pesanan berubah. Buat pesanan baru.");
      }
      return existing.id;
    }

    const recent = await tx.select({ id: membershipOrders.id }).from(membershipOrders)
      .where(and(eq(membershipOrders.buyerId, buyerId), gt(membershipOrders.createdAt, new Date(Date.now() - CHECKOUT_WINDOW_MS))))
      .limit(CHECKOUT_LIMIT);
    if (recent.length >= CHECKOUT_LIMIT) {
      throw new HttpError(429, "CHECKOUT_RATE_LIMIT", "Terlalu banyak percobaan pembayaran. Coba lagi nanti.");
    }

    const plan = membershipPlans.find((entry) => entry.id === input.planId);
    if (!plan) throw new HttpError(404, "PLAN_NOT_FOUND", "Paket Nakama tidak ditemukan.");
    if (input.bookSlug) {
      const [book] = await tx.select({ id: books.id }).from(books).where(eq(books.slug, input.bookSlug));
      if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
    }
    const recipient = input.recipientUsername
      ? await findRecipient(tx, buyerId, input.recipientUsername)
      : null;
    const tax = membershipTaxBreakdown(plan.subtotalIdr, requireTaxRate());
    const [order] = await tx.insert(membershipOrders).values({
      buyerId,
      beneficiaryId: recipient?.id ?? buyerId,
      recipientUsername: input.recipientUsername,
      bookSlug: input.bookSlug,
      requestId: input.requestId,
      planId: plan.id,
      months: plan.months,
      priceIdr: tax.subtotalIdr + tax.taxIdr,
      subtotalIdr: tax.subtotalIdr,
      taxIdr: tax.taxIdr,
      taxRateBps: tax.rateBps,
    }).returning({ id: membershipOrders.id });
    return order.id;
  });
}

export async function startMembershipCheckout(buyerId: string, input: MembershipCheckoutInput) {
  const gateway = membershipGateway();
  const orderId = await reserveOrder(buyerId, input);
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(membershipOrders)
      .where(and(eq(membershipOrders.id, orderId), eq(membershipOrders.buyerId, buyerId)))
      .for("update");
    if (!order) throw new HttpError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan.");
    if (order.checkoutUrl || order.status !== "pending") return toOrder(order);

    // Recreating a Snap token invalidates the previous token for this order.
    const tax = order.subtotalIdr === null || order.taxIdr === null || order.taxRateBps === null
      ? legacyTaxSnapshot(order.priceIdr)
      : { subtotalIdr: order.subtotalIdr, taxIdr: order.taxIdr, taxRateBps: order.taxRateBps };
    const checkoutUrl = await gateway.createCheckout({ ...order, ...tax });
    const [updated] = await tx.update(membershipOrders).set({
      ...tax,
      checkoutUrl,
      checkoutCreatedAt: new Date(),
    }).where(eq(membershipOrders.id, orderId)).returning();
    return toOrder(updated);
  });
}

export async function listMembershipOrders(buyerId: string) {
  const orders = await db.select().from(membershipOrders)
    .where(eq(membershipOrders.buyerId, buyerId))
    .orderBy(desc(membershipOrders.createdAt))
    .limit(50);
  return orders.map(toOrder);
}

export async function getMembershipOrder(buyerId: string, orderId: string) {
  const [order] = await db.select().from(membershipOrders)
    .where(and(eq(membershipOrders.id, orderId), eq(membershipOrders.buyerId, buyerId)));
  if (!order) throw new HttpError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan.");
  return toOrder(order);
}

export async function membershipOrderExists(orderId: string) {
  const [order] = await db.select({ id: membershipOrders.id }).from(membershipOrders)
    .where(eq(membershipOrders.id, orderId));
  return Boolean(order);
}

async function refreshEntitlement(tx: Transaction, userId: string) {
  const orders = await tx.select({ months: membershipOrders.months, paidAt: membershipOrders.paidAt })
    .from(membershipOrders)
    .where(and(eq(membershipOrders.beneficiaryId, userId), eq(membershipOrders.status, "paid"), isNotNull(membershipOrders.paidAt)))
    .orderBy(asc(membershipOrders.paidAt), asc(membershipOrders.id));
  const expiresAt = membershipExpiresAt(orders.flatMap(({ months, paidAt }) =>
    paidAt ? [{ months, paidAt }] : [],
  ));

  await tx.update(membershipReminders).set({ canceledAt: new Date() }).where(and(
    eq(membershipReminders.userId, userId),
    isNull(membershipReminders.sentAt),
    isNull(membershipReminders.canceledAt),
    expiresAt ? ne(membershipReminders.expiresAt, expiresAt) : undefined,
  ));
  if (!expiresAt) {
    await tx.delete(memberships).where(eq(memberships.userId, userId));
    return;
  }

  await tx.insert(memberships).values({ userId, expiresAt }).onConflictDoUpdate({
    target: memberships.userId,
    set: { expiresAt },
  });
  await tx.insert(membershipReminders).values([
    { userId, expiresAt, kind: "expiring", dueAt: new Date(expiresAt.getTime() - 7 * DAY_MS) },
    { userId, expiresAt, kind: "expired", dueAt: expiresAt },
  ]).onConflictDoUpdate({
    target: [membershipReminders.userId, membershipReminders.expiresAt, membershipReminders.kind],
    set: { canceledAt: null },
  });
}

export async function reconcileMembershipPayment(payment: VerifiedPayment) {
  await db.transaction(async (tx) => {
    const [reference] = await tx.select({ beneficiaryId: membershipOrders.beneficiaryId }).from(membershipOrders)
      .where(eq(membershipOrders.id, payment.orderId));
    if (!reference) return;

    // Serialize grants, refunds, and reminder checks for the same beneficiary.
    if (reference.beneficiaryId) {
      await tx.select({ id: user.id }).from(user).where(eq(user.id, reference.beneficiaryId)).for("no key update");
    }
    const [order] = await tx.select().from(membershipOrders)
      .where(eq(membershipOrders.id, payment.orderId)).for("update");
    if (!order) return;
    if (order.priceIdr !== payment.priceIdr || order.currency !== payment.currency) {
      throw new HttpError(409, "PAYMENT_AMOUNT_MISMATCH", "Nominal pembayaran tidak cocok dengan pesanan.");
    }
    if (order.paidTransactionId && order.paidTransactionId !== payment.transactionId) {
      return;
    }

    const [event] = await tx.insert(membershipPaymentEvents).values({
      orderId: order.id,
      transactionId: payment.transactionId,
      status: payment.status,
    }).onConflictDoNothing().returning({ orderId: membershipPaymentEvents.orderId });
    if (!event) return;

    const status = nextOrderStatus(order.status, payment.status);
    if (status === order.status) return;

    const changedToPaid = status === "paid";
    const paidAt = changedToPaid ? new Date(Math.max(
      order.createdAt.getTime(),
      Math.min(payment.paidAt?.getTime() ?? Date.now(), Date.now()),
    )) : order.paidAt;
    await tx.update(membershipOrders).set({
      status,
      paidAt,
      paidTransactionId: changedToPaid ? payment.transactionId : order.paidTransactionId,
    }).where(eq(membershipOrders.id, order.id));

    if (order.beneficiaryId && (changedToPaid || status === "refunded")) {
      await refreshEntitlement(tx, order.beneficiaryId);
    }
  });
}
