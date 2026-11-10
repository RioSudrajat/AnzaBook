import type {
  MembershipCancelInput,
  MembershipCheckoutInput,
  MembershipOrderDto,
  MembershipPlanDto,
  MembershipRecipientDto,
  MembershipSummaryDto,
} from "@starter/shared/validators/membership";
import { apiFetch } from "@/lib/api/client";

const path = "/api/membership";
type Data<T> = { data: T };

export async function listMembershipPlans(signal?: AbortSignal) {
  return (
    await apiFetch<Data<MembershipPlanDto[]>>(`${path}/plans`, { signal })
  ).data;
}

export async function getMembershipSummary(signal?: AbortSignal) {
  return (await apiFetch<Data<MembershipSummaryDto>>(path, { signal })).data;
}

export async function cancelMembership(input: MembershipCancelInput) {
  return (
    await apiFetch<Data<MembershipSummaryDto>>(`${path}/cancel`, {
      method: "POST",
      body: input,
    })
  ).data;
}

export async function saveMembershipUsername(username: string) {
  return (
    await apiFetch<Data<{ username: string }>>(`${path}/username`, {
      method: "POST",
      body: { username },
    })
  ).data;
}

export async function saveMembershipReminders(enabled: boolean) {
  return (
    await apiFetch<Data<MembershipSummaryDto>>(`${path}/reminders`, {
      method: "POST",
      body: { enabled },
    })
  ).data;
}

export async function checkMembershipRecipient(username: string) {
  return (
    await apiFetch<Data<MembershipRecipientDto>>(`${path}/recipient`, {
      method: "POST",
      body: { username },
    })
  ).data;
}

export async function startMembershipCheckout(input: MembershipCheckoutInput) {
  return (
    await apiFetch<Data<MembershipOrderDto>>(`${path}/checkout`, {
      method: "POST",
      body: input,
    })
  ).data;
}

export async function listMembershipOrders(signal?: AbortSignal) {
  return (
    await apiFetch<Data<MembershipOrderDto[]>>(`${path}/orders`, { signal })
  ).data;
}

export async function getMembershipOrder(
  orderId: string,
  signal?: AbortSignal,
) {
  return (
    await apiFetch<Data<MembershipOrderDto>>(
      `${path}/orders/${encodeURIComponent(orderId)}`,
      { signal },
    )
  ).data;
}

export async function refreshMembershipOrder(orderId: string) {
  return (
    await apiFetch<Data<MembershipOrderDto>>(
      `${path}/orders/${encodeURIComponent(orderId)}/refresh`,
      { method: "POST" },
    )
  ).data;
}
