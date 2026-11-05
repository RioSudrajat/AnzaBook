import { createHash, randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";

vi.hoisted(() => {
  process.env.MIDTRANS_SERVER_KEY = "sandbox-integration-test-key";
  process.env.MIDTRANS_ENV = "sandbox";
  process.env.MEMBERSHIP_TAX_RATE_BPS = "1100";
});

import { agent, originHeader, signUp } from "./helpers";
import { db } from "../db";
import { membershipOrders, membershipReminders, memberships, user } from "../db/schema";
import { reconcileMembershipPayment } from "../services/membership.service";
import { processMembershipReminders } from "../services/membership-reminders";

afterEach(() => vi.unstubAllGlobals());

describe("membership checkout", () => {
  it("resumes legacy checkouts using their original payment total", async () => {
    const purchaser = agent();
    const email = await signUp(purchaser);
    const [buyer] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    const requestId = randomUUID();
    await db.insert(membershipOrders).values({
      buyerId: buyer.id,
      beneficiaryId: buyer.id,
      requestId,
      planId: "quarterly",
      months: 3,
      priceIdr: 60_000,
    });
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/test",
    }));
    vi.stubGlobal("fetch", request);

    const response = await purchaser.post("/api/membership/checkout").set(originHeader)
      .send({ planId: "quarterly", requestId });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      priceIdr: 60_000,
      tax: { subtotalIdr: 54_054, taxIdr: 5_946, rateBps: 1100 },
    });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body)).transaction_details.gross_amount).toBe(60_000);
  });

  it("classifies the public catalog fixture claim codes as demo codes", async () => {
    const claims = await db.execute(sql`
      SELECT code FROM book_claim_codes
      WHERE is_demo AND code IN ('SAINS-MALAKA-01', 'ZENIUS-SMART-26')
      ORDER BY code
    `);
    expect(claims.rows).toEqual([{ code: "SAINS-MALAKA-01" }, { code: "ZENIUS-SMART-26" }]);
  });

  it("binds a verified gift to its recipient and ignores duplicate payment events", async () => {
    const purchaser = agent();
    const recipient = agent();
    await signUp(purchaser, "Gift buyer");
    const recipientEmail = await signUp(recipient, "Gift recipient");
    const chapter = "/api/books/sains-logika-seni-hidup-bermutu/read?chapter=2&mode=full";
    expect((await recipient.get(chapter)).status).toBe(403);
    const username = "gift_" + randomUUID().slice(0, 8);
    expect((await recipient.post("/api/membership/username").set(originHeader).send({ username: username.toUpperCase() })).status).toBe(200);
    expect((await purchaser.post("/api/membership/username").set(originHeader).send({ username })).status).toBe(409);

    const lookup = await purchaser.post("/api/membership/recipient").set(originHeader).send({ username });
    expect(lookup.body.data).toEqual({ username, displayName: "Gift recipient" });

    const request = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({
      redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/test",
    }));
    vi.stubGlobal("fetch", request);

    const checkout = { planId: "quarterly", recipientUsername: username, requestId: randomUUID() };
    const plans = await purchaser.get("/api/membership/plans");
    expect(plans.body.data[0]).toMatchObject({
      id: "quarterly",
      priceIdr: 66_600,
      tax: { subtotalIdr: 60_000, taxIdr: 6_600, rateBps: 1100 },
    });
    expect((await purchaser.post("/api/membership/checkout").set(originHeader).send({ ...checkout, priceIdr: 1 })).status).toBe(422);
    const first = await purchaser.post("/api/membership/checkout").set(originHeader).send(checkout);
    expect(first.status).toBe(201);
    const orderId = first.body.data.id;
    expect(first.body.data).toMatchObject({
      status: "pending",
      priceIdr: 66_600,
      recipientUsername: username,
      tax: { subtotalIdr: 60_000, taxIdr: 6_600, rateBps: 1100 },
    });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toMatchObject({
      transaction_details: { order_id: orderId, gross_amount: 66_600 },
      item_details: [{ price: 60_000, quantity: 1 }, { price: 6_600, quantity: 1 }],
    });
    const retry = await purchaser.post("/api/membership/checkout").set(originHeader).send(checkout);
    expect(retry.body.data.id).toBe(orderId);
    expect(request).toHaveBeenCalledTimes(1);
    expect((await recipient.get("/api/membership/orders/" + orderId)).status).toBe(404);

    const invalid = await agent().post("/api/membership/webhooks/midtrans").send({ order_id: orderId });
    expect(invalid.status).toBe(401);
    expect((await purchaser.get("/api/membership/orders/" + orderId + "?status=paid")).body.data.status).toBe("pending");

    request.mockImplementation(async () => Response.json({
      order_id: orderId,
      transaction_id: "qr-" + orderId,
      gross_amount: "66600.00",
      currency: "IDR",
      payment_type: "qris",
      status_code: "200",
      transaction_status: "settlement",
    }));
    const signed = {
      order_id: orderId,
      gross_amount: "66600.00",
      status_code: "200",
      signature_key: createHash("sha512")
        .update(orderId + "20066600.00sandbox-integration-test-key")
        .digest("hex"),
    };
    expect((await agent().post("/api/membership/webhooks/midtrans").send(signed)).status).toBe(200);
    const summary = (await recipient.get("/api/membership")).body.data;
    expect(summary.status).toBe("active");
    expect((await purchaser.get("/api/membership")).body.data.status).toBe("inactive");
    const unlocked = await recipient.get(chapter);
    expect(unlocked.status).toBe(200);
    expect(unlocked.body.data.accessExpiresAt).toBe(summary.expiresAt);
    expect((await purchaser.get(chapter)).status).toBe(403);
    expect((await agent().post("/api/membership/webhooks/midtrans").send(signed)).status).toBe(200);
    expect((await recipient.get("/api/membership")).body.data.expiresAt).toBe(summary.expiresAt);

    await expect(reconcileMembershipPayment({
      orderId,
      transactionId: "qr-" + orderId,
      priceIdr: 1,
      currency: "IDR",
      status: "refunded",
      paidAt: null,
    })).rejects.toThrow("Nominal");
    expect((await purchaser.get("/api/membership/orders/" + orderId)).body.data.status).toBe("paid");

    const [account] = await db.select({ id: user.id }).from(user).where(eq(user.email, recipientEmail));
    await db.update(memberships).set({ expiresAt: new Date() }).where(eq(memberships.userId, account.id));
    expect((await recipient.get(chapter)).status).toBe(403);
  });

  it("retries reminders, deduplicates delivery and only emails verified accounts", async () => {
    const reader = agent();
    const email = await signUp(reader);
    const [account] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    const now = new Date();
    const expiresAt = new Date(now.getTime() - 1000);
    await db.insert(memberships).values({ userId: account.id, expiresAt });
    await db.insert(membershipReminders).values({
      userId: account.id,
      expiresAt,
      dueAt: expiresAt,
      kind: "expired",
    });

    const send = vi.fn().mockRejectedValueOnce(new Error("Temporary failure")).mockResolvedValue(undefined);
    await processMembershipReminders(send, now);
    expect(send).not.toHaveBeenCalled();

    await db.update(user).set({ emailVerified: true }).where(eq(user.id, account.id));
    await processMembershipReminders(send, now);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: email, kind: "expired", expiresAt }));
    await processMembershipReminders(send, now);
    expect(send).toHaveBeenCalledTimes(1);

    const afterRetry = new Date(now.getTime() + 10 * 60_000);
    await Promise.all([
      processMembershipReminders(send, afterRetry),
      processMembershipReminders(send, afterRetry),
    ]);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0]);
  });
});
