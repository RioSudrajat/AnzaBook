import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  ApplyPublisherInput,
  SubmitManuscriptInput,
} from "@starter/shared/validators/publisher";
import type {
  ApplyAuthorInput,
  UpdateProfileBioInput,
} from "@starter/shared/validators/social";
import {
  applyAuthor,
  applyPublisher,
  followUser,
  submitManuscript,
  unfollowUser,
  updateSocialProfile,
} from "./api";
import {
  exploreAuthorsQuery,
  exploreReadersQuery,
  myManuscriptsQuery,
  mySocialProfileQuery,
  publisherKeys,
  socialKeys,
  userProfileQuery,
  verifiedPublishersQuery,
  publisherDetailQuery,
} from "./queries";

export function useMySocialProfile() {
  return useQuery(mySocialProfileQuery());
}

export function useUserProfile(username: string) {
  return useQuery({
    ...userProfileQuery(username),
    enabled: Boolean(username),
  });
}

export function useExploreAuthors(query?: string) {
  return useQuery(exploreAuthorsQuery(query));
}

export function useExploreReaders(query?: string) {
  return useQuery(exploreReadersQuery(query));
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
