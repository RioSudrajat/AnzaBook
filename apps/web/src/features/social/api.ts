import type {
  AuthorDirectoryItemDto,
  BookSummaryDto,
  CommunityCalendarDto,
  DataResponse,
  ExplorePostItemDto,
  ManagedPublisherSummaryDto,
  ManuscriptSubmissionDto,
  PublishManuscriptResultDto,
  PublisherApprovedWriterDto,
  PublisherBookInventoryItemDto,
  PublisherDto,
  PublisherMemberDto,
  QuotePostConfig,
  ReaderDirectoryItemDto,
  SessionPostConfig,
  SocialProfileDto,
  SocialRelationItemDto,
  StoreBranchDto,
  UnifiedExploreResultDto,
  UploadedMediaDto,
} from "@starter/shared/types";
import type {
  AddApprovedWriterInput,
  AddPublisherMemberInput,
  ApplyPublisherInput,
  AuthorUpdateManuscriptInput,
  CreateManuscriptDraftInput,
  ListSubmissionTargetsInput,
  PublishManuscriptInput,
  PublisherEditManuscriptInput,
  PublisherReviewManuscriptInput,
  SubmitManuscriptInput,
  UpdateBookInventoryInput,
  UpdatePublisherBookInput,
  UpdatePublisherInput,
  UpdatePublisherMemberInput,
} from "@starter/shared/validators/publisher";
import type {
  ApplyAuthorInput,
  PublicSocialPostType,
  PublishHighlightPostInput,
  PublishSessionPostInput,
  UpdateProfileBioInput,
} from "@starter/shared/validators/social";
import type { UpdateCalendarInput } from "@starter/shared/validators/community";
import { rankSubmissionTargets } from "@/features/publisher/publisher-helpers";
import { ApiError, apiFetch } from "@/lib/api/client";
import { API_URL } from "@/lib/env";

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

export async function fetchUnifiedExplore(
  params?: {
    q?: string;
    category?: string;
    sort?: "top" | "latest";
  },
  signal?: AbortSignal,
): Promise<UnifiedExploreResultDto> {
  const queryObj: Record<string, string> = {};
  if (params?.q) queryObj.q = params.q;
  if (params?.category) queryObj.category = params.category;
  if (params?.sort) queryObj.sort = params.sort;

  const { data } = await apiFetch<DataResponse<UnifiedExploreResultDto>>(
    "/api/social/explore",
    {
      query: Object.keys(queryObj).length > 0 ? queryObj : undefined,
      signal,
    },
  );
  return data;
}

export async function applyAuthor(
  input: ApplyAuthorInput,
): Promise<{ id: string; status: string }> {
  const { data } = await apiFetch<DataResponse<{ id: string; status: string }>>(
    "/api/social/author-applications",
    {
      method: "POST",
      body: input,
    },
  );
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

export async function getUserFollowers(
  username: string,
  signal?: AbortSignal,
): Promise<SocialRelationItemDto[]> {
  const { data } = await apiFetch<DataResponse<SocialRelationItemDto[]>>(
    `/api/social/users/${encodeURIComponent(username)}/followers`,
    { signal },
  );
  return data;
}

export async function getUserFollowing(
  username: string,
  signal?: AbortSignal,
): Promise<SocialRelationItemDto[]> {
  const { data } = await apiFetch<DataResponse<SocialRelationItemDto[]>>(
    `/api/social/users/${encodeURIComponent(username)}/following`,
    { signal },
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

export async function listSubmissionTargets(
  params?: ListSubmissionTargetsInput,
  signal?: AbortSignal,
): Promise<PublisherDto[]> {
  const queryObj: Record<string, string | number> = {};
  if (params?.q?.trim()) queryObj.q = params.q.trim();
  if (params?.topic?.trim()) queryObj.topic = params.topic.trim();
  if (params?.limit) queryObj.limit = params.limit;

  const { data } = await apiFetch<DataResponse<PublisherDto[]>>(
    "/api/publisher/submission-targets",
    {
      query: Object.keys(queryObj).length > 0 ? queryObj : undefined,
      signal,
    },
  );
  return rankSubmissionTargets(data, {
    q: params?.q,
    topic: params?.topic,
  });
}

export async function getMyManagedPublishers(
  signal?: AbortSignal,
): Promise<ManagedPublisherSummaryDto[]> {
  const { data } = await apiFetch<DataResponse<ManagedPublisherSummaryDto[]>>(
    "/api/publisher/mine",
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

export async function followPublisher(
  slug: string,
): Promise<{ isFollowing: boolean; followerCount: number }> {
  const { data } = await apiFetch<
    DataResponse<{ isFollowing: boolean; followerCount: number }>
  >(`/api/publisher/${encodeURIComponent(slug)}/follow`, {
    method: "POST",
  });
  return data;
}

export async function unfollowPublisher(
  slug: string,
): Promise<{ isFollowing: boolean; followerCount: number }> {
  const { data } = await apiFetch<
    DataResponse<{ isFollowing: boolean; followerCount: number }>
  >(`/api/publisher/${encodeURIComponent(slug)}/follow`, {
    method: "DELETE",
  });
  return data;
}

export async function listPublisherBooks(
  slug: string,
  signal?: AbortSignal,
): Promise<BookSummaryDto[]> {
  const { data } = await apiFetch<DataResponse<BookSummaryDto[]>>(
    `/api/publisher/${encodeURIComponent(slug)}/books`,
    { signal },
  );
  return data;
}

export async function updatePublisherBook(
  slug: string,
  bookId: string,
  input: UpdatePublisherBookInput,
): Promise<BookSummaryDto> {
  const { data } = await apiFetch<DataResponse<BookSummaryDto>>(
    `/api/publisher/${encodeURIComponent(slug)}/books/${encodeURIComponent(bookId)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

export async function listPublisherMembers(
  slug: string,
  signal?: AbortSignal,
): Promise<PublisherMemberDto[]> {
  const { data } = await apiFetch<DataResponse<PublisherMemberDto[]>>(
    `/api/publisher/${encodeURIComponent(slug)}/members`,
    { signal },
  );
  return data;
}

export async function addPublisherMember(
  slug: string,
  input: AddPublisherMemberInput,
): Promise<PublisherMemberDto> {
  const { data } = await apiFetch<DataResponse<PublisherMemberDto>>(
    `/api/publisher/${encodeURIComponent(slug)}/members`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function updatePublisherMember(
  slug: string,
  memberId: string,
  input: UpdatePublisherMemberInput,
): Promise<PublisherMemberDto> {
  const { data } = await apiFetch<DataResponse<PublisherMemberDto>>(
    `/api/publisher/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

export async function removePublisherMember(
  slug: string,
  memberId: string,
): Promise<{ removed: boolean }> {
  const { data } = await apiFetch<DataResponse<{ removed: boolean }>>(
    `/api/publisher/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "DELETE",
    },
  );
  return data;
}

export async function listPublisherApprovedWriters(
  slug: string,
  signal?: AbortSignal,
): Promise<PublisherApprovedWriterDto[]> {
  const { data } = await apiFetch<DataResponse<PublisherApprovedWriterDto[]>>(
    `/api/publisher/${encodeURIComponent(slug)}/approved-writers`,
    { signal },
  );
  return data;
}

export async function addPublisherApprovedWriter(
  slug: string,
  input: AddApprovedWriterInput,
): Promise<PublisherApprovedWriterDto> {
  const { data } = await apiFetch<DataResponse<PublisherApprovedWriterDto>>(
    `/api/publisher/${encodeURIComponent(slug)}/approved-writers`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function removePublisherApprovedWriter(
  slug: string,
  writerId: string,
): Promise<{ removed: boolean }> {
  const { data } = await apiFetch<DataResponse<{ removed: boolean }>>(
    `/api/publisher/${encodeURIComponent(slug)}/approved-writers/${encodeURIComponent(writerId)}`,
    {
      method: "DELETE",
    },
  );
  return data;
}

export async function listStoreBranches(
  signal?: AbortSignal,
): Promise<StoreBranchDto[]> {
  const { data } = await apiFetch<DataResponse<StoreBranchDto[]>>(
    "/api/publisher/store-branches",
    { signal },
  );
  return data;
}

export async function listPublisherBookInventory(
  slug: string,
  bookId: string,
  signal?: AbortSignal,
): Promise<PublisherBookInventoryItemDto[]> {
  const { data } = await apiFetch<
    DataResponse<PublisherBookInventoryItemDto[]>
  >(
    `/api/publisher/${encodeURIComponent(slug)}/books/${encodeURIComponent(bookId)}/inventory`,
    { signal },
  );
  return data;
}

export async function updatePublisherBookInventory(
  slug: string,
  bookId: string,
  input: UpdateBookInventoryInput,
): Promise<PublisherBookInventoryItemDto[]> {
  const { data } = await apiFetch<
    DataResponse<PublisherBookInventoryItemDto[]>
  >(
    `/api/publisher/${encodeURIComponent(slug)}/books/${encodeURIComponent(bookId)}/inventory`,
    {
      method: "PUT",
      body: input,
    },
  );
  return data;
}

export async function editPublisherManuscript(
  slug: string,
  idOrSlug: string,
  input: PublisherEditManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
    `/api/publisher/${encodeURIComponent(slug)}/manuscripts/${encodeURIComponent(idOrSlug)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

export async function reviewPublisherManuscript(
  slug: string,
  idOrSlug: string,
  input: PublisherReviewManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
    `/api/publisher/${encodeURIComponent(slug)}/manuscripts/${encodeURIComponent(idOrSlug)}/review`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function publishPublisherManuscript(
  slug: string,
  idOrSlug: string,
  input?: PublishManuscriptInput,
): Promise<PublishManuscriptResultDto> {
  const { data } = await apiFetch<DataResponse<PublishManuscriptResultDto>>(
    `/api/publisher/${encodeURIComponent(slug)}/manuscripts/${encodeURIComponent(idOrSlug)}/publish`,
    {
      method: "POST",
      body: input ?? {},
    },
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

export async function createManuscriptDraft(
  input: CreateManuscriptDraftInput,
): Promise<ManuscriptSubmissionDto> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
    "/api/publisher/manuscripts/drafts",
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function getManuscript(
  idOrSlug: string,
  signal?: AbortSignal,
): Promise<ManuscriptSubmissionDto> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
    `/api/publisher/manuscripts/${encodeURIComponent(idOrSlug)}`,
    { signal },
  );
  return data;
}

export async function updateManuscript(
  idOrSlug: string,
  input: AuthorUpdateManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
    `/api/publisher/manuscripts/${encodeURIComponent(idOrSlug)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

export async function submitManuscriptDraft(
  idOrSlug: string,
  publisherId?: string | null,
): Promise<ManuscriptSubmissionDto> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
    `/api/publisher/manuscripts/${encodeURIComponent(idOrSlug)}/submit`,
    {
      method: "POST",
      body: { publisherId },
    },
  );
  return data;
}

export async function withdrawManuscript(
  idOrSlug: string,
): Promise<ManuscriptSubmissionDto> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
    `/api/publisher/manuscripts/${encodeURIComponent(idOrSlug)}/withdraw`,
    {
      method: "POST",
    },
  );
  return data;
}

export async function getPublisherManuscripts(
  slug: string,
  signal?: AbortSignal,
): Promise<ManuscriptSubmissionDto[]> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto[]>>(
    `/api/publisher/${encodeURIComponent(slug)}/manuscripts`,
    { signal },
  );
  return data;
}

export async function uploadMediaImage(file: File): Promise<UploadedMediaDto> {
  const allowedContentType =
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
      ? file.type
      : "application/octet-stream";

  const url = new URL("/api/media/upload-image", API_URL);
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      accept: "application/json",
      "content-type": allowedContentType,
    },
    body: file,
  });

  if (!response.ok) {
    let message = "Gagal mengunggah gambar.";
    let code = "UPLOAD_FAILED";
    try {
      const payload = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      if (payload.error?.message) message = payload.error.message;
      if (payload.error?.code) code = payload.error.code;
    } catch {
      // Fallback to default message when server does not return JSON.
    }
    throw new ApiError(response.status, code, message);
  }

  const payload = (await response.json()) as DataResponse<UploadedMediaDto>;
  return payload.data;
}

export async function updatePublisherProfile(
  slug: string,
  input: UpdatePublisherInput,
): Promise<PublisherDto> {
  const { data } = await apiFetch<DataResponse<PublisherDto>>(
    `/api/publisher/${encodeURIComponent(slug)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

export async function updateCalendarProfile(
  slug: string,
  input: UpdateCalendarInput,
): Promise<CommunityCalendarDto> {
  const { data } = await apiFetch<DataResponse<CommunityCalendarDto>>(
    `/api/events/calendars/${encodeURIComponent(slug)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

export type TogglePostHighlightResult = {
  id: string;
  isPosted: boolean;
  postCaption: string | null;
  postConfig: QuotePostConfig | null;
  postedAt: string | null;
};

export async function togglePostHighlight(
  highlightId: string,
  input?: boolean | PublishHighlightPostInput,
): Promise<TogglePostHighlightResult> {
  const body: PublishHighlightPostInput =
    typeof input === "boolean" ? { isPosted: input } : (input ?? {});
  const { data } = await apiFetch<DataResponse<TogglePostHighlightResult>>(
    `/api/social/highlights/${encodeURIComponent(highlightId)}/toggle-post`,
    {
      method: "POST",
      body,
    },
  );
  return data;
}

export type TogglePostSessionResult = {
  id: string;
  isPosted: boolean;
  title: string | null;
  note: string | null;
  postConfig: SessionPostConfig | null;
  postedAt: string | null;
};

export async function togglePostSession(
  sessionId: string,
  input: PublishSessionPostInput,
): Promise<TogglePostSessionResult> {
  const { data } = await apiFetch<DataResponse<TogglePostSessionResult>>(
    `/api/social/sessions/${encodeURIComponent(sessionId)}/toggle-post`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function getPublicSocialPost(
  type: PublicSocialPostType,
  id: string,
  signal?: AbortSignal,
): Promise<ExplorePostItemDto> {
  const { data } = await apiFetch<DataResponse<ExplorePostItemDto>>(
    `/api/social/posts/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,
    { signal },
  );
  return data;
}
