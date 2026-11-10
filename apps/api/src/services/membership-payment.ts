import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  parseMidtransCheckoutUrl,
  type MembershipOrderStatus,
} from "@starter/shared/validators/membership";
import { HttpError } from "../lib/http-error";

const amount = z.string().regex(/^\d{1,12}(?:\.00)?$/);
const notificationSchema = z.object({
  order_id: z.string().min(1).max(50),
  status_code: z.string().regex(/^\d{3}$/),
  gross_amount: amount,
  signature_key: z.string().regex(/^[a-f\d]{128}$/i),
});

const statusSchema = z.object({
  order_id: z.string(),
  transaction_id: z.string().min(1).max(128),
  gross_amount: amount,
  currency: z.literal("IDR"),
  payment_type: z.string(),
  status_code: z.string(),
  transaction_status: z.string(),
  fraud_status: z.string().optional(),
  settlement_time: z.string().optional(),
});

type MidtransConfig = {
  key: string;
  mode: "sandbox" | "production";
  webUrl: string;
};

export type VerifiedPayment = {
  orderId: string;
  transactionId: string;
  priceIdr: number;
  currency: "IDR";
  status: MembershipOrderStatus;
  paidAt: Date | null;
};

export function verifyMidtransNotification(input: unknown, key: string) {
  const result = notificationSchema.safeParse(input);
  if (!result.success) {
    throw new HttpError(
      401,
      "INVALID_PAYMENT_SIGNATURE",
      "Tanda tangan pembayaran tidak valid.",
    );
  }
  const { order_id, status_code, gross_amount, signature_key } = result.data;
  const expected = createHash("sha512")
    .update(order_id + status_code + gross_amount + key)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature_key, "hex"))) {
    throw new HttpError(
      401,
      "INVALID_PAYMENT_SIGNATURE",
      "Tanda tangan pembayaran tidak valid.",
    );
  }
  return order_id;
}

function midtransStatus(
  data: z.infer<typeof statusSchema>,
): MembershipOrderStatus {
  switch (data.transaction_status) {
    case "settlement":
    case "partial_refund":
      return data.status_code === "200" &&
        (!data.fraud_status || data.fraud_status === "accept")
        ? "paid"
        : "pending";
    case "refund":
    case "chargeback":
      return "refunded";
    case "deny":
    case "failure":
      return "failed";
    case "cancel":
      return "canceled";
    case "expire":
      return "expired";
    default:
      return "pending";
  }
}

function settlementTime(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))
    return null;
  const date = new Date(value.replace(" ", "T") + "+07:00");
  return Number.isNaN(date.getTime()) ? null : date;
}

export function createMidtransGateway(config: MidtransConfig, request = fetch) {
  const domain =
    config.mode === "sandbox" ? "sandbox.midtrans.com" : "midtrans.com";
  const snapOrigin = "https://app." + domain;
  const headers = {
    Accept: "application/json",
    Authorization: "Basic " + Buffer.from(config.key + ":").toString("base64"),
  };

  async function call(url: string, options?: RequestInit) {
    try {
      const response = await request(url, {
        ...options,
        headers: { ...headers, ...options?.headers },
        signal: AbortSignal.timeout(7000),
        redirect: "error",
      });
      return { ok: response.ok, body: (await response.json()) as unknown };
    } catch {
      throw new HttpError(
        502,
        "PAYMENT_UNAVAILABLE",
        "Midtrans belum bisa dihubungi. Coba lagi.",
      );
    }
  }

  return {
    async createCheckout(order: {
      id: string;
      months: number;
      priceIdr: number;
      subtotalIdr: number;
      taxIdr: number;
    }) {
      const finish = new URL("/membership/checkout/" + order.id, config.webUrl);
      const items = [
        {
          id: "nakama",
          name: `Nakama ${order.months} bulan`,
          price: order.subtotalIdr,
          quantity: 1,
        },
      ];
      if (order.taxIdr > 0)
        items.push({
          id: "tax",
          name: "Pajak",
          price: order.taxIdr,
          quantity: 1,
        });
      const response = await call(snapOrigin + "/snap/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_details: {
            order_id: order.id,
            gross_amount: order.priceIdr,
          },
          item_details: items,
          enabled_payments: ["other_qris"],
          page_expiry: { duration: 1, unit: "day" },
          callbacks: { finish: finish.href, error: finish.href },
        }),
      });
      const checkout = z
        .object({ redirect_url: z.string() })
        .safeParse(response.body);
      if (response.ok && checkout.success) {
        const url = parseMidtransCheckoutUrl(checkout.data.redirect_url);
        if (url?.origin === snapOrigin) return url.href;
      }
      throw new HttpError(
        502,
        "PAYMENT_CHECKOUT_FAILED",
        "Halaman pembayaran QRIS belum dapat dibuka.",
      );
    },

    async getPayment(orderId: string): Promise<VerifiedPayment | null> {
      const response = await call(
        "https://api." +
          domain +
          "/v2/" +
          encodeURIComponent(orderId) +
          "/status",
      );
      if (
        z.object({ status_code: z.literal("404") }).safeParse(response.body)
          .success
      )
        return null;

      const parsed = statusSchema.safeParse(response.body);
      if (!response.ok || !parsed.success || parsed.data.order_id !== orderId) {
        throw new HttpError(
          502,
          "PAYMENT_STATUS_INVALID",
          "Status pembayaran tidak dapat diverifikasi.",
        );
      }
      if (parsed.data.payment_type !== "qris") {
        throw new HttpError(
          409,
          "PAYMENT_METHOD_MISMATCH",
          "Pembayaran pesanan ini harus menggunakan QRIS.",
        );
      }
      return {
        orderId,
        transactionId: parsed.data.transaction_id,
        priceIdr: Number(parsed.data.gross_amount),
        currency: parsed.data.currency,
        status: midtransStatus(parsed.data),
        paidAt: settlementTime(parsed.data.settlement_time),
      };
    },
  };
}
