import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type {
  AdminEditManuscriptInput,
  AdminListQueryInput,
  AdminPublishManuscriptInput,
  AdminReviewAuthorApplicationInput,
  AdminVerifyCalendarInput,
  AdminVerifyPublisherInput,
} from "@starter/shared/validators/admin";
import type { ListNotesInput } from "@starter/shared/validators/notes";
import type { CreateClaimBatchInput } from "@starter/shared/validators/publisher";
import { notesKeys } from "@/features/notes/queries";
import {
  createClaimBatch,
  deleteAnyNote,
  publishAdminManuscript,
  reviewAuthorApplication,
  updateAdminManuscript,
  verifyCalendar,
  verifyPublisher,
} from "./api";
import {
  adminAuthorApplicationsQuery,
  adminCalendarsQuery,
  adminClaimBatchCodesQuery,
  adminKeys,
  adminManuscriptDetailQuery,
  adminManuscriptsQuery,
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

// ---------------- Manuscripts & Curation Editor ---------------- //

export function useAdminManuscripts(params?: AdminListQueryInput) {
  return useQuery(adminManuscriptsQuery(params));
}

export function useAdminManuscriptDetail(id: string) {
  return useQuery(adminManuscriptDetailQuery(id));
}

export function useUpdateAdminManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: AdminEditManuscriptInput;
    }) => updateAdminManuscript(id, input),
    onSettled: (_data, _error, variables) => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        queryClient.invalidateQueries({
          queryKey: adminKeys.manuscriptDetail(variables.id),
        }),
      ]);
    },
  });
}

export function usePublishAdminManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      overrides,
    }: {
      id: string;
      overrides?: AdminPublishManuscriptInput;
    }) => publishAdminManuscript(id, overrides),
    onSettled: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["books"] }),
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
