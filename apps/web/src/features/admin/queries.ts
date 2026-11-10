import { queryOptions } from "@tanstack/react-query";
import type { AdminListQueryInput } from "@starter/shared/validators/admin";
import type { ListNotesInput } from "@starter/shared/validators/notes";
import {
  getAdminAuthorApplications,
  getAdminCalendars,
  getAdminManuscriptDetail,
  getAdminManuscripts,
  getAdminOverview,
  getAdminPublishers,
  getClaimBatchCodes,
  listAnyNotes,
} from "./api";

export const adminKeys = {
  all: ["admin"] as const,
  overview: () => [...adminKeys.all, "overview"] as const,
  calendars: (params?: AdminListQueryInput) =>
    [...adminKeys.all, "calendars", params ?? {}] as const,
  authorApplications: (params?: AdminListQueryInput) =>
    [...adminKeys.all, "author-applications", params ?? {}] as const,
  publishers: (params?: AdminListQueryInput) =>
    [...adminKeys.all, "publishers", params ?? {}] as const,
  manuscripts: (params?: AdminListQueryInput) =>
    [...adminKeys.all, "manuscripts", params ?? {}] as const,
  manuscriptDetail: (id: string) =>
    [...adminKeys.all, "manuscript-detail", id] as const,
  claimBatchCodes: (batchId: string) =>
    [...adminKeys.all, "claim-batch-codes", batchId] as const,
  notes: (params: ListNotesInput) =>
    [...adminKeys.all, "notes", params] as const,
};

export function adminOverviewQuery() {
  return queryOptions({
    queryKey: adminKeys.overview(),
    queryFn: ({ signal }) => getAdminOverview(signal),
  });
}

export function adminCalendarsQuery(params?: AdminListQueryInput) {
  return queryOptions({
    queryKey: adminKeys.calendars(params),
    queryFn: ({ signal }) => getAdminCalendars(params, signal),
  });
}

export function adminAuthorApplicationsQuery(params?: AdminListQueryInput) {
  return queryOptions({
    queryKey: adminKeys.authorApplications(params),
    queryFn: ({ signal }) => getAdminAuthorApplications(params, signal),
  });
}

export function adminPublishersQuery(params?: AdminListQueryInput) {
  return queryOptions({
    queryKey: adminKeys.publishers(params),
    queryFn: ({ signal }) => getAdminPublishers(params, signal),
  });
}

export function adminManuscriptsQuery(params?: AdminListQueryInput) {
  return queryOptions({
    queryKey: adminKeys.manuscripts(params),
    queryFn: ({ signal }) => getAdminManuscripts(params, signal),
  });
}

export function adminManuscriptDetailQuery(id: string) {
  return queryOptions({
    queryKey: adminKeys.manuscriptDetail(id),
    queryFn: ({ signal }) => getAdminManuscriptDetail(id, signal),
    enabled: Boolean(id),
  });
}

export function adminClaimBatchCodesQuery(batchId: string) {
  return queryOptions({
    queryKey: adminKeys.claimBatchCodes(batchId),
    queryFn: ({ signal }) => getClaimBatchCodes(batchId, signal),
    enabled: Boolean(batchId),
  });
}

export function adminNotesQuery(
  params: ListNotesInput = { limit: 50, offset: 0 },
) {
  return queryOptions({
    queryKey: adminKeys.notes(params),
    queryFn: ({ signal }) => listAnyNotes(params, signal),
  });
}
