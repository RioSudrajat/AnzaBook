import { z } from "zod";
import { bookSlugSchema } from "./books";

export const membershipPlanId = z.enum(["quarterly", "semiannual", "yearly"]);
export const membershipOrderStatus = z.enum([
  "pending",
  "paid",
  "failed",
  "canceled",
  "expired",
  "refunded",
]);
export const membershipOrderId = z.uuid();
const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9_]{2,23}$/, {
    message: "Gunakan 3–24 huruf, angka, atau garis bawah.",
  });

export const membershipUsernameSchema = z.strictObject({ username });
export const membershipRemindersSchema = z.strictObject({ enabled: z.boolean() });

export const membershipCheckoutSchema = z.strictObject({
  planId: membershipPlanId,
  requestId: z.uuid(),
  recipientUsername: username.optional(),
  bookSlug: bookSlugSchema.shape.slug.optional(),
});

export type MembershipPlanId = z.infer<typeof membershipPlanId>;
export type MembershipOrderStatus = z.infer<typeof membershipOrderStatus>;
export type MembershipCheckoutInput = z.infer<typeof membershipCheckoutSchema>;

export type MembershipTaxDto = {
  subtotalIdr: number;
  taxIdr: number;
  rateBps: number;
};

export type MembershipPlanDto = {
  id: MembershipPlanId;
  months: 3 | 6 | 12;
  /** Total payable when tax is configured. */
  priceIdr: number;
  tax: MembershipTaxDto | null;
};

export type MembershipSummaryDto = {
  username: string | null;
  expiresAt: string | null;
  status: "inactive" | "active" | "expired";
  checkoutAvailable: boolean;
  reminderEmailsEnabled: boolean;
};

export type MembershipRecipientDto = {
  username: string;
  displayName: string;
};

export type MembershipOrderDto = {
  id: string;
  planId: MembershipPlanId;
  months: number;
  priceIdr: number;
  tax: MembershipTaxDto | null;
  status: MembershipOrderStatus;
  recipientUsername: string | null;
  bookSlug: string | null;
  checkoutUrl: string | null;
  createdAt: string;
  paidAt: string | null;
};
