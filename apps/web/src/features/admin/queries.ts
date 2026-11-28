import { queryOptions } from "@tanstack/react-query";
import type { AdminListQueryInput } from "@starter/shared/validators/admin";
import type {
  AdminDrmEventsQueryInput,
  AdminDrmSuspensionsQueryInput,
} from "@starter/shared/validators/drm";
import type { ListNotesInput } from "@starter/shared/validators/notes";
import type { ListAdminSpotsQueryInput } from "@starter/shared/validators/spots";
import {
  getAdminAuthorApplications,
  getAdminCalendars,
  getAdminDrmEvents,
  getAdminDrmSuspensions,
  getAdminOverview,
  getAdminPublishers,
  getAdminSpots,
  getClaimBatchCodes,
  listAnyNotes,
  traceAdminDrmWatermark,
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
  claimBatchCodes: (batchId: string) =>
    [...adminKeys.all, "claim-batch-codes", batchId] as const,
  drmEvents: (params?: AdminDrmEventsQueryInput) =>
    [...adminKeys.all, "drm-events", params ?? {}] as const,
  drmTrace: (watermarkCode: string) =>
    [...adminKeys.all, "drm-trace", watermarkCode] as const,
  drmSuspensions: (params?: AdminDrmSuspensionsQueryInput) =>
    [...adminKeys.all, "drm-suspensions", params ?? {}] as const,
  spots: (params?: ListAdminSpotsQueryInput) =>
    [...adminKeys.all, "spots", params ?? {}] as const,
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

export function adminDrmEventsQuery(params?: AdminDrmEventsQueryInput) {
  return queryOptions({
    queryKey: adminKeys.drmEvents(params),
    queryFn: ({ signal }) => getAdminDrmEvents(params, signal),
  });
}

export function adminDrmTraceQuery(watermarkCode: string) {
  return queryOptions({
    queryKey: adminKeys.drmTrace(watermarkCode),
    queryFn: ({ signal }) => traceAdminDrmWatermark(watermarkCode, signal),
    enabled: Boolean(watermarkCode.trim()),
    retry: false,
  });
}

export function adminDrmSuspensionsQuery(
  params?: AdminDrmSuspensionsQueryInput,
) {
  return queryOptions({
    queryKey: adminKeys.drmSuspensions(params),
    queryFn: ({ signal }) => getAdminDrmSuspensions(params, signal),
  });
}

export function adminSpotsQuery(params?: ListAdminSpotsQueryInput) {
  return queryOptions({
    queryKey: adminKeys.spots(params),
    queryFn: ({ signal }) => getAdminSpots(params, signal),
  });
}
