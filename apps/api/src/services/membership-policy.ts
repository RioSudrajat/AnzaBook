import type {
  MembershipOrderStatus,
  MembershipPlanDto,
  MembershipSummaryDto,
  MembershipTaxDto,
} from "@starter/shared/validators/membership";

export const membershipPlans: ReadonlyArray<
  Pick<MembershipPlanDto, "id" | "months"> & { subtotalIdr: number }
> = [
  { id: "quarterly", months: 3, subtotalIdr: 60_000 },
  { id: "semiannual", months: 6, subtotalIdr: 108_000 },
  { id: "yearly", months: 12, subtotalIdr: 192_000 },
];
const jakartaOffsetMs = 7 * 60 * 60 * 1000;

export function membershipTaxBreakdown(
  subtotalIdr: number,
  rateBps: number,
): MembershipTaxDto {
  const taxIdr = Math.round((subtotalIdr * rateBps) / 10_000);
  return { subtotalIdr, taxIdr, rateBps };
}

export function getMembershipStatus(
  expiresAt: Date | null,
  now: Date,
): MembershipSummaryDto["status"] {
  if (!expiresAt) return "inactive";
  return expiresAt > now ? "active" : "expired";
}

export function membershipExpiresAt(
  orders: ReadonlyArray<{ paidAt: Date; months: number }>,
): Date | null {
  let expiresAt: Date | null = null;
  for (const { paidAt, months } of orders) {
    const start: Date = expiresAt && expiresAt > paidAt ? expiresAt : paidAt;
    const jakarta = new Date(start.getTime() + jakartaOffsetMs);
    const day = jakarta.getUTCDate();
    jakarta.setUTCDate(1);
    jakarta.setUTCMonth(jakarta.getUTCMonth() + months + 1, 0);
    jakarta.setUTCDate(Math.min(day, jakarta.getUTCDate()));
    expiresAt = new Date(jakarta.getTime() - jakartaOffsetMs);
  }
  return expiresAt;
}

export function nextOrderStatus(
  current: MembershipOrderStatus,
  verified: MembershipOrderStatus,
): MembershipOrderStatus {
  if (current === "refunded" || verified === "refunded") return "refunded";
  if (current === "paid" || verified === "paid") return "paid";
  if (current === "expired" || current === "canceled") return current;
  return verified;
}
