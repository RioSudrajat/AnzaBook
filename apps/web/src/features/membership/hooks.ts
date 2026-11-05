import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  checkMembershipRecipient,
  refreshMembershipOrder,
  saveMembershipReminders,
  saveMembershipUsername,
  startMembershipCheckout,
} from "./api";
import {
  membershipKeys,
  membershipOrderQuery,
  membershipOrdersQuery,
  membershipPlansQuery,
  membershipSummaryQuery,
} from "./queries";

export function useMembershipPlans() {
  return useSuspenseQuery(membershipPlansQuery());
}

export function useMembershipSummary(enabled = true) {
  return useQuery({ ...membershipSummaryQuery(), enabled });
}

export function useMembershipOrders(enabled = true) {
  return useQuery({ ...membershipOrdersQuery(), enabled });
}

export function useMembershipOrder(orderId: string) {
  return useQuery({
    ...membershipOrderQuery(orderId),
    refetchInterval: (query) => query.state.data?.status === "pending" ? 5000 : false,
  });
}

export function useSaveMembershipUsername() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMembershipUsername,
    onSuccess: ({ username }) => {
      queryClient.setQueryData(membershipSummaryQuery().queryKey, (summary) =>
        summary && { ...summary, username },
      );
    },
  });
}

export function useSaveMembershipReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMembershipReminders,
    onSuccess: (summary) => {
      queryClient.setQueryData(membershipSummaryQuery().queryKey, summary);
    },
  });
}

export function useCheckMembershipRecipient() {
  return useMutation({ mutationFn: checkMembershipRecipient });
}

export function useStartMembershipCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startMembershipCheckout,
    onSuccess: (order) => {
      queryClient.setQueryData(membershipOrderQuery(order.id).queryKey, order);
      void queryClient.invalidateQueries({ queryKey: membershipKeys.orders, exact: true });
    },
  });
}

export function useRefreshMembershipOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => refreshMembershipOrder(orderId),
    onMutate: () => queryClient.cancelQueries({ queryKey: membershipKeys.order(orderId), exact: true }),
    onSuccess: (order) => {
      queryClient.setQueryData(membershipOrderQuery(orderId).queryKey, (current) =>
        current && current.status !== "pending" && order.status === "pending" ? current : order,
      );
      void queryClient.invalidateQueries({ queryKey: membershipKeys.orders, exact: true });
    },
  });
}
