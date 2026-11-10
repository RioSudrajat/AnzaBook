import type {
  AuthorDirectoryItemDto,
  DataResponse,
  ManuscriptSubmissionDto,
  PublisherDto,
  ReaderDirectoryItemDto,
  SocialProfileDto,
} from "@starter/shared/types";
import type {
  ApplyPublisherInput,
  SubmitManuscriptInput,
} from "@starter/shared/validators/publisher";
import type {
  ApplyAuthorInput,
  UpdateProfileBioInput,
} from "@starter/shared/validators/social";
import { apiFetch } from "@/lib/api/client";

export async function getMySocialProfile(
  signal?: AbortSignal,
): Promise<SocialProfileDto> {
  const { data } = await apiFetch<DataResponse<SocialProfileDto>>(
    "/api/social/me",
    { signal },
  );
  return data;
}

export async function updateSocialProfile(
  input: UpdateProfileBioInput,
): Promise<SocialProfileDto> {
  const { data } = await apiFetch<DataResponse<SocialProfileDto>>(
    "/api/social/me",
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

export async function getUserProfile(
  username: string,
  signal?: AbortSignal,
): Promise<SocialProfileDto> {
  const { data } = await apiFetch<DataResponse<SocialProfileDto>>(
    `/api/social/users/${encodeURIComponent(username)}`,
    { signal },
  );
  return data;
}

export async function exploreAuthors(
  query?: string,
  signal?: AbortSignal,
): Promise<AuthorDirectoryItemDto[]> {
  const { data } = await apiFetch<DataResponse<AuthorDirectoryItemDto[]>>(
    "/api/social/explore/authors",
    {
      query: query ? { query } : undefined,
      signal,
    },
  );
  return data;
}

export async function exploreReaders(
  query?: string,
  signal?: AbortSignal,
): Promise<ReaderDirectoryItemDto[]> {
  const { data } = await apiFetch<DataResponse<ReaderDirectoryItemDto[]>>(
    "/api/social/explore/readers",
    {
      query: query ? { query } : undefined,
      signal,
    },
  );
  return data;
}

export async function applyAuthor(
  input: ApplyAuthorInput,
): Promise<{ id: string; status: string }> {
  const { data } = await apiFetch<
    DataResponse<{ id: string; status: string }>
  >("/api/social/author-applications", {
    method: "POST",
    body: input,
  });
  return data;
}

export async function followUser(
  targetUserId: string,
  isSubscribedUpdates: boolean = true,
): Promise<{ following: boolean; isSubscribedUpdates: boolean }> {
  const { data } = await apiFetch<
    DataResponse<{ following: boolean; isSubscribedUpdates: boolean }>
  >(`/api/social/users/${encodeURIComponent(targetUserId)}/follow`, {
    method: "POST",
    body: { isSubscribedUpdates },
  });
  return data;
}

export async function unfollowUser(
  targetUserId: string,
): Promise<{ following: boolean }> {
  const { data } = await apiFetch<DataResponse<{ following: boolean }>>(
    `/api/social/users/${encodeURIComponent(targetUserId)}/follow`,
    {
      method: "DELETE",
    },
  );
  return data;
}

// ---------------- Publisher & Manuscript APIs ---------------- //

export async function listVerifiedPublishers(
  signal?: AbortSignal,
): Promise<PublisherDto[]> {
  const { data } = await apiFetch<DataResponse<PublisherDto[]>>(
    "/api/publisher/list",
    { signal },
  );
  return data;
}

export async function getPublisherBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<PublisherDto> {
  const { data } = await apiFetch<DataResponse<PublisherDto>>(
    `/api/publisher/${encodeURIComponent(slug)}`,
    { signal },
  );
  return data;
}

export async function applyPublisher(
  input: ApplyPublisherInput,
): Promise<PublisherDto> {
  const { data } = await apiFetch<DataResponse<PublisherDto>>(
    "/api/publisher/apply",
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function submitManuscript(
  input: SubmitManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
    "/api/publisher/manuscripts",
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function getMyManuscripts(
  signal?: AbortSignal,
): Promise<ManuscriptSubmissionDto[]> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto[]>>(
    "/api/publisher/manuscripts/mine",
    { signal },
  );
  return data;
}
