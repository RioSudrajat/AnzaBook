import { Router } from "express";
import {
  membershipCheckoutSchema,
  membershipOrderId,
  membershipRemindersSchema,
  membershipUsernameSchema,
} from "@starter/shared/validators/membership";
import { env } from "../config/env";
import { HttpError } from "../lib/http-error";
import { getAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import { verifyMidtransNotification } from "../services/membership-payment";
import {
  getMembershipOrder,
  getMembershipRecipient,
  getMembershipSummary,
  listMembershipPlans,
  listMembershipOrders,
  membershipGateway,
  membershipOrderExists,
  reconcileMembershipPayment,
  setMembershipReminderEmails,
  setMembershipUsername,
  startMembershipCheckout,
} from "../services/membership.service";

export const membershipRouter = Router();

membershipRouter.get("/plans", (_req, res) => {
  res.json({ data: listMembershipPlans() });
});

membershipRouter.post("/webhooks/midtrans", jsonBody, async (req, res) => {
  if (!env.MIDTRANS_SERVER_KEY) {
    throw new HttpError(503, "PAYMENT_UNAVAILABLE", "Pembayaran QRIS belum tersedia.");
  }
  const providerOrderId = verifyMidtransNotification(req.body, env.MIDTRANS_SERVER_KEY);
  const result = membershipOrderId.safeParse(providerOrderId);
  if (result.success && await membershipOrderExists(result.data)) {
    const payment = await membershipGateway().getPayment(result.data);
    if (payment) await reconcileMembershipPayment(payment);
  }
  res.json({ received: true });
});

membershipRouter.use(requireAuth, requireTrustedOrigin);

membershipRouter.get("/", async (req, res) => {
  res.json({ data: await getMembershipSummary(getAuth(req).user.id) });
});

membershipRouter.post("/username", jsonBody, async (req, res) => {
  const { username } = membershipUsernameSchema.parse(req.body);
  res.json({ data: await setMembershipUsername(getAuth(req).user.id, username) });
});

membershipRouter.post("/reminders", jsonBody, async (req, res) => {
  const { enabled } = membershipRemindersSchema.parse(req.body);
  res.json({ data: await setMembershipReminderEmails(getAuth(req).user.id, enabled) });
});

function membershipRequestLimiter(limit: number, code: string, message: string) {
  const requests = new Map<string, { count: number; until: number }>();
  return (userId: string) => {
    const now = Date.now();
    for (const [id, bucket] of requests) {
      if (bucket.until > now) break;
      requests.delete(id);
    }
    const current = requests.get(userId);
    if (current ? current.count >= limit : requests.size >= 10_000) {
      throw new HttpError(429, code, message);
    }
    if (current) current.count++;
    else requests.set(userId, { count: 1, until: now + 60_000 });
  };
}

const limitRecipientLookups = membershipRequestLimiter(20, "RECIPIENT_RATE_LIMIT", "Terlalu banyak pencarian penerima. Coba lagi nanti.");
const limitStatusRefresh = membershipRequestLimiter(20, "STATUS_RATE_LIMIT", "Terlalu banyak pemeriksaan pembayaran. Coba lagi nanti.");

membershipRouter.post("/recipient", jsonBody, async (req, res) => {
  const userId = getAuth(req).user.id;
  limitRecipientLookups(userId);
  const { username } = membershipUsernameSchema.parse(req.body);
  res.json({ data: await getMembershipRecipient(userId, username) });
});

membershipRouter.post("/checkout", jsonBody, async (req, res) => {
  const input = membershipCheckoutSchema.parse(req.body);
  const order = await startMembershipCheckout(getAuth(req).user.id, input);
  res.status(201).location("/api/membership/orders/" + order.id).json({ data: order });
});

membershipRouter.get("/orders", async (req, res) => {
  res.json({ data: await listMembershipOrders(getAuth(req).user.id) });
});

membershipRouter.get("/orders/:orderId", async (req, res) => {
  const orderId = membershipOrderId.parse(req.params.orderId);
  res.json({ data: await getMembershipOrder(getAuth(req).user.id, orderId) });
});

membershipRouter.post("/orders/:orderId/refresh", async (req, res) => {
  const buyerId = getAuth(req).user.id;
  const orderId = membershipOrderId.parse(req.params.orderId);
  const order = await getMembershipOrder(buyerId, orderId);
  if (order.status === "pending" || order.status === "failed" || order.status === "expired") {
    limitStatusRefresh(buyerId);
    const payment = await membershipGateway().getPayment(orderId);
    if (payment) await reconcileMembershipPayment(payment);
  }
  res.json({ data: await getMembershipOrder(buyerId, orderId) });
});
