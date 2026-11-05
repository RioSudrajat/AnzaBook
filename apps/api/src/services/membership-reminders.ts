import { createHash } from "node:crypto";
import { and, asc, eq, gt, isNull, lt, lte } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { membershipReminders, memberships, user } from "../db/schema";
import { logger } from "../lib/logger";
import { createMembershipMailer, type MembershipReminderEmail } from "./membership-mail";

const maxAttempts = 8;
const pollInterval = 60_000;
const expiredReminderWindow = 30 * 24 * 60 * 60 * 1000;
type SendReminder = (email: MembershipReminderEmail) => Promise<void>;

export async function processMembershipReminders(send: SendReminder, now = new Date()) {
  const candidates = await db.select({
    userId: membershipReminders.userId,
    expiresAt: membershipReminders.expiresAt,
    kind: membershipReminders.kind,
  }).from(membershipReminders)
    .innerJoin(user, eq(user.id, membershipReminders.userId))
    .where(and(
      lte(membershipReminders.dueAt, now),
      gt(membershipReminders.expiresAt, new Date(now.getTime() - expiredReminderWindow)),
      isNull(membershipReminders.sentAt),
      isNull(membershipReminders.canceledAt),
      lt(membershipReminders.attempts, maxAttempts),
      eq(user.emailVerified, true),
      eq(user.membershipReminderEmails, true),
    ))
    .orderBy(asc(membershipReminders.dueAt))
    .limit(20);

  for (const candidate of candidates) {
    await db.transaction(async (tx) => {
      // Payments and renewals take the same lock before changing entitlement.
      const [account] = await tx.select({
        email: user.email,
        verified: user.emailVerified,
        enabled: user.membershipReminderEmails,
      }).from(user).where(eq(user.id, candidate.userId)).for("no key update", { skipLocked: true });
      if (!account?.enabled || !account.verified) return;

      const identity = and(
        eq(membershipReminders.userId, candidate.userId),
        eq(membershipReminders.expiresAt, candidate.expiresAt),
        eq(membershipReminders.kind, candidate.kind),
      );
      const [reminder] = await tx.select({ attempts: membershipReminders.attempts })
        .from(membershipReminders)
        .where(and(
          identity,
          lte(membershipReminders.dueAt, now),
          isNull(membershipReminders.sentAt),
          isNull(membershipReminders.canceledAt),
          lt(membershipReminders.attempts, maxAttempts),
        ));
      if (!reminder) return;

      const [membership] = await tx.select({ expiresAt: memberships.expiresAt })
        .from(memberships).where(eq(memberships.userId, candidate.userId));
      const expired = candidate.expiresAt <= now;
      if (membership?.expiresAt.getTime() !== candidate.expiresAt.getTime() ||
          (candidate.kind === "expiring" && expired)) {
        await tx.update(membershipReminders).set({ canceledAt: now }).where(identity);
        return;
      }

      const deliveryKey = createHash("sha256")
        .update([candidate.userId, candidate.expiresAt.toISOString(), candidate.kind].join(":"))
        .digest("hex");
      try {
        await send({ to: account.email, kind: candidate.kind, expiresAt: candidate.expiresAt, deliveryKey });
      } catch {
        const delayMinutes = Math.min(5 * 2 ** reminder.attempts, 120);
        await tx.update(membershipReminders).set({
          attempts: reminder.attempts + 1,
          dueAt: new Date(now.getTime() + delayMinutes * 60_000),
        }).where(identity);
        logger.warn({ kind: candidate.kind, attempt: reminder.attempts + 1 }, "Membership email delivery failed");
        return;
      }
      await tx.update(membershipReminders).set({ sentAt: now }).where(identity);
    });
  }
}

export function startMembershipReminderWorker(): () => void {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_FROM } = env;
  if (env.isTest || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_FROM) {
    return () => {};
  }
  const send = createMembershipMailer({
    clientId: GMAIL_CLIENT_ID,
    clientSecret: GMAIL_CLIENT_SECRET,
    refreshToken: GMAIL_REFRESH_TOKEN,
    from: GMAIL_FROM,
    webUrl: env.WEB_URL,
  });
  let active = false;
  async function tick() {
    if (active) return;
    active = true;
    try {
      await processMembershipReminders(send);
    } catch {
      logger.warn("Membership reminder queue could not be processed");
    } finally {
      active = false;
    }
  }
  const timer = setInterval(() => void tick(), pollInterval);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
