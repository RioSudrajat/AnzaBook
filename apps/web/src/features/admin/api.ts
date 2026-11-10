import type {
  AdminAuthorApplicationDto,
  AdminCalendarDto,
  AdminClaimBatchCodesDto,
  AdminCreateClaimBatchResultDto,
  AdminNoteDto,
  AdminOverviewDto,
  AdminPublishManuscriptResultDto,
  DataResponse,
  ManuscriptSubmissionDto,
  Paginated,
  PublisherDto,
} from "@starter/shared/types";
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
import { apiFetch } from "@/lib/api/client";

// Cross-account & admin-only endpoints. The API answers 403 unless the caller's stored role
// grants admin access; the web app's role check only decides what to show.

export function listAnyNotes(params: ListNotesInput, signal?: AbortSignal) {
  return apiFetch<Paginated<AdminNoteDto>>("/api/admin/notes", {
    query: params,
    signal,
  });
}

export function deleteAnyNote(id: string) {
  return apiFetch<void>(`/api/admin/notes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ---------------- Admin Overview ---------------- //

export async function getAdminOverview(
  signal?: AbortSignal,
): Promise<AdminOverviewDto> {
  const { data } = await apiFetch<DataResponse<AdminOverviewDto>>(
    "/api/admin/overview",
    { signal },
  );
  return data;
}

// ---------------- Community Calendars ---------------- //

export async function getAdminCalendars(
  params?: AdminListQueryInput,
  signal?: AbortSignal,
): Promise<AdminCalendarDto[]> {
  const { data } = await apiFetch<DataResponse<AdminCalendarDto[]>>(
    "/api/admin/calendars",
    {
      query: params,
      signal,
    },
  );
  return data;
}

export async function verifyCalendar(
  id: string,
  input: AdminVerifyCalendarInput,
): Promise<AdminCalendarDto> {
  const { data } = await apiFetch<DataResponse<AdminCalendarDto>>(
    `/api/admin/calendars/${encodeURIComponent(id)}/verify`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

// ---------------- Author Applications ---------------- //

export async function getAdminAuthorApplications(
  params?: AdminListQueryInput,
  signal?: AbortSignal,
): Promise<AdminAuthorApplicationDto[]> {
  const { data } = await apiFetch<DataResponse<AdminAuthorApplicationDto[]>>(
    "/api/admin/author-applications",
    {
      query: params,
      signal,
    },
  );
  return data;
}

export async function reviewAuthorApplication(
  id: string,
  input: AdminReviewAuthorApplicationInput,
): Promise<AdminAuthorApplicationDto> {
  const { data } = await apiFetch<DataResponse<AdminAuthorApplicationDto>>(
    `/api/admin/author-applications/${encodeURIComponent(id)}/review`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

// ---------------- Publishers Verification ---------------- //

export async function getAdminPublishers(
  params?: AdminListQueryInput,
  signal?: AbortSignal,
): Promise<PublisherDto[]> {
  const { data } = await apiFetch<DataResponse<PublisherDto[]>>(
    "/api/admin/publishers",
    {
      query: params,
      signal,
    },
  );
  return data;
}

export async function verifyPublisher(
  id: string,
  input: AdminVerifyPublisherInput,
): Promise<PublisherDto> {
  const { data } = await apiFetch<DataResponse<PublisherDto>>(
    `/api/admin/publishers/${encodeURIComponent(id)}/verify`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

// ---------------- Manuscripts & Curation Editor ---------------- //

export async function getAdminManuscripts(
  params?: AdminListQueryInput,
  signal?: AbortSignal,
): Promise<ManuscriptSubmissionDto[]> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto[]>>(
    "/api/admin/manuscripts",
    {
      query: params,
      signal,
    },
  );
  return data;
}

export async function getAdminManuscriptDetail(
  id: string,
  signal?: AbortSignal,
): Promise<ManuscriptSubmissionDto> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
    `/api/admin/manuscripts/${encodeURIComponent(id)}`,
    { signal },
  );
  return data;
}

export async function updateAdminManuscript(
  id: string,
  input: AdminEditManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
    `/api/admin/manuscripts/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

export async function publishAdminManuscript(
  id: string,
  overrides?: AdminPublishManuscriptInput,
): Promise<AdminPublishManuscriptResultDto> {
  const { data } = await apiFetch<DataResponse<AdminPublishManuscriptResultDto>>(
    `/api/admin/manuscripts/${encodeURIComponent(id)}/publish`,
    {
      method: "POST",
      body: overrides ?? {},
    },
  );
  return data;
}

// ---------------- Claim Code Batches (Skema A Phygital) ---------------- //

export async function createClaimBatch(
  input: CreateClaimBatchInput,
): Promise<AdminCreateClaimBatchResultDto> {
  const { data } = await apiFetch<DataResponse<AdminCreateClaimBatchResultDto>>(
    "/api/admin/claim-batches",
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function getClaimBatchCodes(
  batchId: string,
  signal?: AbortSignal,
): Promise<AdminClaimBatchCodesDto> {
  const { data } = await apiFetch<DataResponse<AdminClaimBatchCodesDto>>(
    `/api/admin/claim-batches/${encodeURIComponent(batchId)}/codes`,
    { signal },
  );
  return data;
}
