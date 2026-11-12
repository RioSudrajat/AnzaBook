import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  ApplyPublisherInput,
  CreateManuscriptDraftInput,
  ReviewManuscriptInput,
  SubmitManuscriptInput,
  UpdateManuscriptInput,
  UpdatePublisherInput,
} from "@starter/shared/validators/publisher";
import type {
  ApplyAuthorInput,
  UpdateProfileBioInput,
} from "@starter/shared/validators/social";
import type { UpdateCalendarInput } from "@starter/shared/validators/community";
import {
  applyAuthor,
  applyPublisher,
  createManuscriptDraft,
  followUser,
  reviewManuscript,
  submitManuscript,
  submitManuscriptDraft,
  togglePostHighlight,
  togglePostSession,
  unfollowUser,
  updateCalendarProfile,
  updateManuscript,
  updatePublisherProfile,
  updateSocialProfile,
} from "./api";
import {
  exploreAuthorsQuery,
  exploreReadersQuery,
  manuscriptDetailQuery,
  myManuscriptsQuery,
  mySocialProfileQuery,
  publisherDetailQuery,
  publisherKeys,
  publisherManuscriptsQuery,
  socialKeys,
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

export function usePublisher(slug: string) {
  return useQuery(publisherDetailQuery(slug));
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

export function useMyManuscripts() {
  return useQuery(myManuscriptsQuery());
}

export function useManuscript(idOrSlug: string) {
  return useQuery(manuscriptDetailQuery(idOrSlug));
}

export function usePublisherManuscripts(slug: string) {
  return useQuery(publisherManuscriptsQuery(slug));
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
      input: UpdateManuscriptInput;
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

export function useReviewManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idOrSlug,
      input,
    }: {
      idOrSlug: string;
      input: ReviewManuscriptInput;
    }) => reviewManuscript(idOrSlug, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: publisherKeys.manuscriptDetail(variables.idOrSlug),
      });
      queryClient.invalidateQueries({
        queryKey: publisherKeys.all,
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
      isPosted,
    }: {
      highlightId: string;
      isPosted?: boolean;
    }) => togglePostHighlight(highlightId, isPosted),
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
      note,
      isPosted,
    }: {
      sessionId: string;
      note?: string;
      isPosted?: boolean;
    }) => togglePostSession(sessionId, { note, isPosted }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
      queryClient.invalidateQueries({ queryKey: ["reading", "sessions"] });
    },
  });
}
