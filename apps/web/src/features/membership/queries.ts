import { queryOptions } from "@tanstack/react-query";
import {
  getMembershipOrder,
  getMembershipSummary,
  listMembershipOrders,
  listMembershipPlans,
} from "./api";

export const membershipKeys = {
  plans: ["membership", "plans"] as const,
  summary: ["membership", "summary"] as const,
  orders: ["membership", "orders"] as const,
  order: (orderId: string) => ["membership", "orders", orderId] as const,
};

export function membershipPlansQuery() {
  return queryOptions({
    queryKey: membershipKeys.plans,
    queryFn: ({ signal }) => listMembershipPlans(signal),
    staleTime: 60_000,
  });
}

export function membershipSummaryQuery() {
  return queryOptions({
    queryKey: membershipKeys.summary,
    queryFn: ({ signal }) => getMembershipSummary(signal),
  });
}

export function membershipOrdersQuery() {
  return queryOptions({
    queryKey: membershipKeys.orders,
    queryFn: ({ signal }) => listMembershipOrders(signal),
  });
}

export function membershipOrderQuery(orderId: string) {
  return queryOptions({
    queryKey: membershipKeys.order(orderId),
    queryFn: ({ signal }) => getMembershipOrder(orderId, signal),
  });
}
