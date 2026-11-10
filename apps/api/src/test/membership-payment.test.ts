import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createMidtransGateway,
  verifyMidtransNotification,
} from "../services/membership-payment";

const key = "sandbox-test-key";
const orderId = "ec5b213c-bfed-43d3-ab04-7626c27418b7";
const amount = "60000.00";
const statusCode = "200";
const signature = createHash("sha512")
  .update(orderId + statusCode + amount + key)
  .digest("hex");

describe("Midtrans membership payments", () => {
  it("authenticates the signed notification", () => {
    const body = {
      order_id: orderId,
      gross_amount: amount,
      status_code: statusCode,
      signature_key: signature,
    };
    expect(verifyMidtransNotification(body, key)).toBe(orderId);
    expect(() =>
      verifyMidtransNotification({ ...body, gross_amount: "1.00" }, key),
    ).toThrow("Tanda tangan");
  });

  it("creates only a QRIS checkout and uses an internal return path", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        redirect_url:
          "https://app.sandbox.midtrans.com/snap/v4/redirection/token",
      }),
    );
    const gateway = createMidtransGateway(
      { key, mode: "sandbox", webUrl: "https://anzabook.test" },
      request,
    );
    await expect(
      gateway.createCheckout({
        id: orderId,
        months: 3,
        priceIdr: 60_000,
        subtotalIdr: 54_054,
        taxIdr: 5_946,
      }),
    ).resolves.toContain("app.sandbox.midtrans.com");
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
    expect(JSON.parse(String(options?.body))).toMatchObject({
      transaction_details: { order_id: orderId, gross_amount: 60_000 },
      item_details: [
        { id: "nakama", name: "Nakama 3 bulan", price: 54_054, quantity: 1 },
        { id: "tax", name: "Pajak", price: 5_946, quantity: 1 },
      ],
      enabled_payments: ["other_qris"],
      callbacks: {
        finish: "https://anzabook.test/membership/checkout/" + orderId,
      },
    });
  });

  it("trusts only QRIS status from the authenticated status API", async () => {
    const payment = {
      order_id: orderId,
      transaction_id: "midtrans-payment-1",
      gross_amount: amount,
      currency: "IDR",
      payment_type: "qris",
      status_code: statusCode,
      transaction_status: "settlement",
      settlement_time: "2026-11-05 05:00:00",
      fraud_status: "accept",
    };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(payment))
      .mockResolvedValueOnce(
        Response.json({ ...payment, payment_type: "credit_card" }),
      );
    const gateway = createMidtransGateway(
      { key, mode: "sandbox", webUrl: "https://anzabook.test" },
      request,
    );
    await expect(gateway.getPayment(orderId)).resolves.toMatchObject({
      orderId,
      transactionId: payment.transaction_id,
      status: "paid",
      priceIdr: 60_000,
      paidAt: new Date("2026-11-04T22:00:00Z"),
    });
    await expect(gateway.getPayment(orderId)).rejects.toThrow("QRIS");
  });
});
