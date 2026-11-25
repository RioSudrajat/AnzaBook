import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type {
  AdminListQueryInput,
  AdminReviewAuthorApplicationInput,
  AdminVerifyCalendarInput,
  AdminVerifyPublisherInput,
} from "@starter/shared/validators/admin";
import type {
  AdminDrmEventsQueryInput,
  AdminDrmSuspensionsQueryInput,
  AdminReviewDrmAppealInput,
} from "@starter/shared/validators/drm";
import type { ListNotesInput } from "@starter/shared/validators/notes";
import type { CreateClaimBatchInput } from "@starter/shared/validators/publisher";
import { booksKeys } from "@/features/books/queries";
import { notesKeys } from "@/features/notes/queries";
import {
  createClaimBatch,
  deleteAnyNote,
  reviewAdminDrmSuspension,
  reviewAuthorApplication,
  verifyCalendar,
  verifyPublisher,
} from "./api";
import {
  adminAuthorApplicationsQuery,
  adminCalendarsQuery,
  adminClaimBatchCodesQuery,
  adminDrmEventsQuery,
  adminDrmSuspensionsQuery,
  adminDrmTraceQuery,
  adminKeys,
  adminNotesQuery,
  adminOverviewQuery,
  adminPublishersQuery,
} from "./queries";

// ---------------- Admin Overview ---------------- //

export function useAdminOverview() {
  return useQuery(adminOverviewQuery());
}

// ---------------- Community Calendars ---------------- //

export function useAdminCalendars(params?: AdminListQueryInput) {
  return useQuery(adminCalendarsQuery(params));
}

export function useVerifyCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: AdminVerifyCalendarInput;
    }) => verifyCalendar(id, input),
    onSettled: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["community"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
      ]);
    },
  });
}

// ---------------- Author Applications ---------------- //

export function useAdminAuthorApplications(params?: AdminListQueryInput) {
  return useQuery(adminAuthorApplicationsQuery(params));
}

export function useReviewAuthorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: AdminReviewAuthorApplicationInput;
    }) => reviewAuthorApplication(id, input),
    onSettled: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["social"] }),
        queryClient.invalidateQueries({ queryKey: ["books"] }),
      ]);
    },
  });
}

// ---------------- Publishers ---------------- //

export function useAdminPublishers(params?: AdminListQueryInput) {
  return useQuery(adminPublishersQuery(params));
}

export function useVerifyPublisher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: AdminVerifyPublisherInput;
    }) => verifyPublisher(id, input),
    onSettled: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["publisher"] }),
      ]);
    },
  });
}

// ---------------- Claim Code Batches (Skema A Phygital) ---------------- //

export function useCreateClaimBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClaimBatchInput) => createClaimBatch(input),
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useClaimBatchCodes(batchId: string) {
  return useQuery(adminClaimBatchCodesQuery(batchId));
}

// ---------------- DRM Security Audit Monitoring ---------------- //

export function useAdminDrmEvents(params?: AdminDrmEventsQueryInput) {
  return useQuery(adminDrmEventsQuery(params));
}

export function useAdminDrmTrace(watermarkCode: string) {
  return useQuery(adminDrmTraceQuery(watermarkCode));
}

export function useAdminDrmSuspensions(params?: AdminDrmSuspensionsQueryInput) {
  return useQuery(adminDrmSuspensionsQuery(params));
}

export function useReviewAdminDrmSuspension() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: AdminReviewDrmAppealInput;
    }) => reviewAdminDrmSuspension(id, input),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        queryClient.invalidateQueries({ queryKey: booksKeys.drmStatus() }),
        queryClient.invalidateQueries({ queryKey: booksKeys.readers() }),
      ]),
  });
}

// ---------------- Notes Utility (starter base) ---------------- //

export function useAdminNotes(params?: ListNotesInput) {
  return useSuspenseQuery(adminNotesQuery(params));
}

export function useDeleteAnyNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAnyNote,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        queryClient.invalidateQueries({ queryKey: notesKeys.all }),
      ]),
  });
}
