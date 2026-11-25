import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { booksKeys } from "@/features/books/queries";
import { communityKeys } from "@/features/community/queries";
import {
  addPublisherApprovedWriter,
  addPublisherMember,
  applyAuthor,
  applyPublisher,
  createManuscriptDraft,
  editPublisherManuscript,
  followUser,
  publishPublisherManuscript,
  removePublisherApprovedWriter,
  removePublisherMember,
  reviewPublisherManuscript,
  submitManuscript,
  submitManuscriptDraft,
  togglePostHighlight,
  togglePostSession,
  unfollowUser,
  updateCalendarProfile,
  updateManuscript,
  updatePublisherBook,
  updatePublisherBookInventory,
  updatePublisherMember,
  updatePublisherProfile,
  updateSocialProfile,
  uploadMediaImage,
  withdrawManuscript,
} from "./api";
import {
  exploreAuthorsQuery,
  exploreReadersQuery,
  manuscriptDetailQuery,
  myManagedPublishersQuery,
  myManuscriptsQuery,
  mySocialProfileQuery,
  publicSocialPostQuery,
  publisherApprovedWritersQuery,
  publisherBookInventoryQuery,
  publisherBooksQuery,
  publisherDetailQuery,
  publisherKeys,
  publisherManuscriptsQuery,
  publisherMembersQuery,
  socialKeys,
  storeBranchesQuery,
  submissionTargetsQuery,
  unifiedExploreQuery,
  userFollowersQuery,
  userFollowingQuery,
  userProfileQuery,
  verifiedPublishersQuery,
} from "./queries";
import { eventsKeys } from "@/features/events/queries";

export function useMySocialProfile() {
  return useQuery(mySocialProfileQuery());
}

export function useUserProfile(username: string) {
  return useQuery({
    ...userProfileQuery(username),
    enabled: Boolean(username),
  });
}

export function useUserFollowers(username: string) {
  return useQuery({
    ...userFollowersQuery(username),
    enabled: Boolean(username),
  });
}

export function useUserFollowing(username: string) {
  return useQuery({
    ...userFollowingQuery(username),
    enabled: Boolean(username),
  });
}

export function useExploreAuthors(query?: string) {
  return useQuery(exploreAuthorsQuery(query));
}

export function useExploreReaders(query?: string) {
  return useQuery(exploreReadersQuery(query));
}

export function useUnifiedExplore(params?: {
  q?: string;
  category?: string;
  sort?: "top" | "latest";
}) {
  return useQuery(unifiedExploreQuery(params));
}

export function useUpdateSocialProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileBioInput) => updateSocialProfile(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(socialKeys.me(), updated);
      if (updated.username) {
        queryClient.setQueryData(socialKeys.user(updated.username), updated);
      }
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      targetUserId,
      isSubscribedUpdates,
    }: {
      targetUserId: string;
      isSubscribedUpdates?: boolean;
    }) => followUser(targetUserId, isSubscribedUpdates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => unfollowUser(targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

export function useApplyAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyAuthorInput) => applyAuthor(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.me() });
    },
  });
}

export function useApplyPublisher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyPublisherInput) => applyPublisher(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publisherKeys.all });
    },
  });
}

export function useVerifiedPublishers() {
  return useQuery(verifiedPublishersQuery());
}

export function useSubmissionTargets(
  params?: ListSubmissionTargetsInput,
  enabled = true,
) {
  return useQuery({
    ...submissionTargetsQuery(params),
    enabled,
  });
}

export function useMyManagedPublishers(enabled = true) {
  return useQuery({
    ...myManagedPublishersQuery(),
    enabled,
  });
}

export function usePublisher(slug: string) {
  return useQuery(publisherDetailQuery(slug));
}

export function usePublisherBooks(slug: string, enabled = true) {
  return useQuery({
    ...publisherBooksQuery(slug),
    enabled: Boolean(slug) && enabled,
  });
}

export function usePublisherMembers(slug: string, enabled = true) {
  return useQuery({
    ...publisherMembersQuery(slug),
    enabled: Boolean(slug) && enabled,
  });
}

export function usePublisherApprovedWriters(slug: string, enabled = true) {
  return useQuery({
    ...publisherApprovedWritersQuery(slug),
    enabled: Boolean(slug) && enabled,
  });
}

export function useAddPublisherApprovedWriter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      input,
    }: {
      slug: string;
      input: AddApprovedWriterInput;
    }) => addPublisherApprovedWriter(slug, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.approvedWriters(variables.slug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.detail(variables.slug),
      });
    },
  });
}

export function useRemovePublisherApprovedWriter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, writerId }: { slug: string; writerId: string }) =>
      removePublisherApprovedWriter(slug, writerId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.approvedWriters(variables.slug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.detail(variables.slug),
      });
    },
  });
}

export function useStoreBranches(enabled = true) {
  return useQuery({
    ...storeBranchesQuery(),
    enabled,
  });
}

export function usePublisherBookInventory(
  slug: string,
  bookId: string,
  enabled = true,
) {
  return useQuery({
    ...publisherBookInventoryQuery(slug, bookId),
    enabled: Boolean(slug && bookId) && enabled,
  });
}

export function useUpdatePublisherBookInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      bookId,
      input,
    }: {
      slug: string;
      bookId: string;
      input: UpdateBookInventoryInput;
    }) => updatePublisherBookInventory(slug, bookId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.bookInventory(variables.slug, variables.bookId),
      });
      queryClient.invalidateQueries({ queryKey: booksKeys.all });
    },
  });
}

export function useUploadMediaImage() {
  return useMutation({
    mutationFn: (file: File) => uploadMediaImage(file),
  });
}

export function useUpdatePublisherBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      bookId,
      input,
    }: {
      slug: string;
      bookId: string;
      input: UpdatePublisherBookInput;
    }) => updatePublisherBook(slug, bookId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.books(variables.slug),
      });
      queryClient.invalidateQueries({ queryKey: booksKeys.all });
    },
  });
}

export function useAddPublisherMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      input,
    }: {
      slug: string;
      input: AddPublisherMemberInput;
    }) => addPublisherMember(slug, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.members(variables.slug),
      });
    },
  });
}

export function useUpdatePublisherMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      memberId,
      input,
    }: {
      slug: string;
      memberId: string;
      input: UpdatePublisherMemberInput;
    }) => updatePublisherMember(slug, memberId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.members(variables.slug),
      });
    },
  });
}

export function useRemovePublisherMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, memberId }: { slug: string; memberId: string }) =>
      removePublisherMember(slug, memberId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.members(variables.slug),
      });
    },
  });
}

export function useEditPublisherManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      idOrSlug,
      input,
    }: {
      slug: string;
      idOrSlug: string;
      input: PublisherEditManuscriptInput;
    }) => editPublisherManuscript(slug, idOrSlug, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.manuscriptDetail(variables.idOrSlug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.publisherManuscripts(variables.slug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.myManuscripts(),
      });
    },
  });
}

export function useReviewPublisherManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      idOrSlug,
      input,
    }: {
      slug: string;
      idOrSlug: string;
      input: PublisherReviewManuscriptInput;
    }) => reviewPublisherManuscript(slug, idOrSlug, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.manuscriptDetail(variables.idOrSlug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.publisherManuscripts(variables.slug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.myManuscripts(),
      });
    },
  });
}

export function usePublishPublisherManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      idOrSlug,
      input,
    }: {
      slug: string;
      idOrSlug: string;
      input?: PublishManuscriptInput;
    }) => publishPublisherManuscript(slug, idOrSlug, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.manuscriptDetail(variables.idOrSlug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.publisherManuscripts(variables.slug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.books(variables.slug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.detail(variables.slug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.myManuscripts(),
      });
      queryClient.invalidateQueries({ queryKey: booksKeys.all });
    },
  });
}

export function useSubmitManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitManuscriptInput) => submitManuscript(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.myManuscripts(),
      });
    },
  });
}

export function useMyManuscripts(enabled = true) {
  return useQuery({
    ...myManuscriptsQuery(),
    enabled,
  });
}

export function useManuscript(idOrSlug: string) {
  return useQuery(manuscriptDetailQuery(idOrSlug));
}

export function usePublisherManuscripts(slug: string, enabled = true) {
  return useQuery({
    ...publisherManuscriptsQuery(slug),
    enabled: Boolean(slug) && enabled,
  });
}

export function useCreateManuscriptDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateManuscriptDraftInput) =>
      createManuscriptDraft(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.myManuscripts(),
      });
    },
  });
}

export function useUpdateManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idOrSlug,
      input,
    }: {
      idOrSlug: string;
      input: AuthorUpdateManuscriptInput;
    }) => updateManuscript(idOrSlug, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.manuscriptDetail(variables.idOrSlug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.myManuscripts(),
      });
    },
  });
}

export function useSubmitManuscriptDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idOrSlug,
      publisherId,
    }: {
      idOrSlug: string;
      publisherId?: string | null;
    }) => submitManuscriptDraft(idOrSlug, publisherId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.manuscriptDetail(variables.idOrSlug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.myManuscripts(),
      });
    },
  });
}

export function useWithdrawManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idOrSlug: string) => withdrawManuscript(idOrSlug),
    onSuccess: (_data, idOrSlug) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.manuscriptDetail(idOrSlug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.myManuscripts(),
      });
    },
  });
}

export function useUpdatePublisherProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      input,
    }: {
      slug: string;
      input: UpdatePublisherInput;
    }) => updatePublisherProfile(slug, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.detail(variables.slug),
      });
      queryClient.invalidateQueries({
        queryKey: socialKeys.me(),
      });
    },
  });
}

export function useUpdateCalendarProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      input,
    }: {
      slug: string;
      input: UpdateCalendarInput;
    }) => updateCalendarProfile(slug, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventsKeys.calendar(variables.slug),
      });
      queryClient.invalidateQueries({
        queryKey: socialKeys.me(),
      });
    },
  });
}

export function useTogglePostHighlight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      highlightId,
      ...input
    }: { highlightId: string } & PublishHighlightPostInput) =>
      togglePostHighlight(highlightId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
      queryClient.invalidateQueries({ queryKey: ["books", "highlights"] });
    },
  });
}

export function useTogglePostSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      ...input
    }: { sessionId: string } & PublishSessionPostInput) =>
      togglePostSession(sessionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
      queryClient.invalidateQueries({ queryKey: ["reading", "sessions"] });
      queryClient.invalidateQueries({ queryKey: communityKeys.sessions() });
    },
  });
}

export function usePublicSocialPost(type: PublicSocialPostType, id: string) {
  return useQuery(publicSocialPostQuery(type, id));
}
