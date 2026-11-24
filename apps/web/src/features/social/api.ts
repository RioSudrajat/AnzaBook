import type {
  AuthorDirectoryItemDto,
  BookSummaryDto,
  CommunityCalendarDto,
  DataResponse,
  ExplorePostItemDto,
  ManagedPublisherSummaryDto,
  ManuscriptSubmissionDto,
  PublishManuscriptResultDto,
  PublisherDto,
  PublisherMemberDto,
  QuotePostConfig,
  ReaderDirectoryItemDto,
  SessionPostConfig,
  SocialProfileDto,
  SocialRelationItemDto,
  UnifiedExploreResultDto,
} from "@starter/shared/types";
import type {
  AddPublisherMemberInput,
  ApplyPublisherInput,
  CreateManuscriptDraftInput,
  ListSubmissionTargetsInput,
  PublishManuscriptInput,
  PublisherEditManuscriptInput,
  PublisherReviewManuscriptInput,
  ReviewManuscriptInput,
  SubmitManuscriptInput,
  UpdateManuscriptInput,
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
import { listBooks } from "@/features/books/api";
import { rankSubmissionTargets } from "@/features/publisher/publisher-helpers";
import { ApiError, apiFetch } from "@/lib/api/client";

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

  try {
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
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const fallbackList = await listVerifiedPublishers(signal);
      return rankSubmissionTargets(fallbackList, {
        q: params?.q,
        topic: params?.topic,
      });
    }
    throw error;
  }
}

export async function getMyManagedPublishers(
  signal?: AbortSignal,
): Promise<ManagedPublisherSummaryDto[]> {
  try {
    const { data } = await apiFetch<DataResponse<ManagedPublisherSummaryDto[]>>(
      "/api/publisher/mine",
      { signal },
    );
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const profile = await getMySocialProfile(signal);
      return profile.managedPublishers ?? [];
    }
    throw error;
  }
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

export async function listPublisherBooks(
  slug: string,
  signal?: AbortSignal,
): Promise<BookSummaryDto[]> {
  try {
    const { data } = await apiFetch<DataResponse<BookSummaryDto[]>>(
      `/api/publisher/${encodeURIComponent(slug)}/books`,
      { signal },
    );
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const response = await listBooks({ publisher: slug, limit: 100 }, signal);
      return response.data;
    }
    throw error;
  }
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
  try {
    const { data } = await apiFetch<DataResponse<PublisherMemberDto[]>>(
      `/api/publisher/${encodeURIComponent(slug)}/members`,
      { signal },
    );
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
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

export async function editPublisherManuscript(
  slug: string,
  idOrSlug: string,
  input: PublisherEditManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  try {
    const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
      `/api/publisher/${encodeURIComponent(slug)}/manuscripts/${encodeURIComponent(idOrSlug)}`,
      {
        method: "PATCH",
        body: input,
      },
    );
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return updateManuscript(idOrSlug, input);
    }
    throw error;
  }
}

export async function reviewPublisherManuscript(
  slug: string,
  idOrSlug: string,
  input: PublisherReviewManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  try {
    const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
      `/api/publisher/${encodeURIComponent(slug)}/manuscripts/${encodeURIComponent(idOrSlug)}/review`,
      {
        method: "POST",
        body: input,
      },
    );
    return data;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      input.action !== "start_editing"
    ) {
      return reviewManuscript(idOrSlug, {
        action: input.action,
        notes: input.notes,
      });
    }
    throw error;
  }
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
  input: UpdateManuscriptInput,
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

export async function reviewManuscript(
  idOrSlug: string,
  input: ReviewManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  const { data } = await apiFetch<DataResponse<ManuscriptSubmissionDto>>(
    `/api/publisher/manuscripts/${encodeURIComponent(idOrSlug)}/review`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
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
