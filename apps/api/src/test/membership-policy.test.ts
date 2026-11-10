import { describe, expect, it } from "vitest";
import {
  getMembershipStatus,
  membershipExpiresAt,
  membershipTaxBreakdown,
  nextOrderStatus,
} from "../services/membership-policy";

describe("membership policy", () => {
  it("calculates tax on the full package subtotal in whole rupiah", () => {
    expect(membershipTaxBreakdown(60_000, 1100)).toEqual({
      subtotalIdr: 60_000,
      taxIdr: 6_600,
      rateBps: 1100,
    });
    expect(membershipTaxBreakdown(60_000, 0)).toEqual({
      subtotalIdr: 60_000,
      taxIdr: 0,
      rateBps: 0,
    });
    expect(membershipTaxBreakdown(60_005, 1100).taxIdr).toBe(6_601);
  });
  it("extends active terms and restarts expired terms", () => {
    const expiresAt = membershipExpiresAt([
      { paidAt: new Date("2026-01-31T10:00:00Z"), months: 3 },
      { paidAt: new Date("2026-02-01T10:00:00Z"), months: 6 },
    ]);
    expect(expiresAt?.toISOString()).toBe("2026-10-30T10:00:00.000Z");
    expect(
      membershipExpiresAt([
        { paidAt: new Date("2026-01-31T10:00:00Z"), months: 3 },
        { paidAt: new Date("2026-06-01T10:00:00Z"), months: 3 },
      ])?.toISOString(),
    ).toBe("2026-09-01T10:00:00.000Z");
  });

  it("counts calendar months in Jakarta at the local month boundary", () => {
    expect(
      membershipExpiresAt([
        { paidAt: new Date("2026-01-31T00:30:00+07:00"), months: 3 },
      ])?.toISOString(),
    ).toBe("2026-04-29T17:30:00.000Z");
  });

  it("expires at the exact boundary and distinguishes no purchase", () => {
    const expiration = new Date("2026-05-01T00:00:00Z");
    expect(getMembershipStatus(null, expiration)).toBe("inactive");
    expect(
      getMembershipStatus(expiration, new Date(expiration.getTime() - 1)),
    ).toBe("active");
    expect(getMembershipStatus(expiration, expiration)).toBe("expired");
  });

  it("never regresses a verified payment and honors a full refund", () => {
    expect(nextOrderStatus("paid", "expired")).toBe("paid");
    expect(nextOrderStatus("paid", "pending")).toBe("paid");
    expect(nextOrderStatus("expired", "paid")).toBe("paid");
    expect(nextOrderStatus("paid", "refunded")).toBe("refunded");
    expect(nextOrderStatus("refunded", "paid")).toBe("refunded");
  });
});
