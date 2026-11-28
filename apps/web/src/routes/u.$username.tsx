import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { SmartBackButton } from "@/components/smart-back-button";
import { PageFrame } from "@/features/dashboard/components/page-frame";
import { PublicProfileView } from "@/features/dashboard/components/public-profile-view";
import { useUserProfile } from "@/features/social/hooks";
import { userProfileQuery } from "@/features/social/queries";
import { ApiError } from "@/lib/api/client";

const userProfileSearchSchema = z.object({
  returnTo: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/u/$username")({
  validateSearch: userProfileSearchSchema,
  loader: async ({ context, params }) => {
    try {
      const cleanUsername = params.username.replace(/^@/, "");
      const profile = await context.queryClient.ensureQueryData(
        userProfileQuery(cleanUsername),
      );
      return { profile };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    const name = loaderData?.profile?.name;
    const username = loaderData?.profile?.username;
    const title = name
      ? `${name} (@${username || "user"}) | AnzaBook`
      : "Profil Pengguna | AnzaBook";
    return { meta: [{ title }] };
  },
  component: PublicUserProfilePage,
});

function PublicUserProfilePage() {
  const { username } = Route.useParams();
  const search = Route.useSearch();
  const cleanUsername = username.replace(/^@/, "");
  const context = Route.useRouteContext();
  const sessionUser = context?.session?.user;
  const currentUserId = sessionUser?.id;

  const { data: profile } = useUserProfile(cleanUsername);

  if (!profile) return null;

  return (
    <PageFrame
      user={sessionUser}
      activeTab="explore"
      title={profile.name || "Profil"}
      showBack={false}
      wide
    >
      <SmartBackButton
        returnTo={search.returnTo}
        fallbackTo={sessionUser ? "/app?tab=explore" : "/"}
        label="Kembali"
        className="-ml-2 mb-3"
      />
      <PublicProfileView profile={profile} viewerId={currentUserId} />
    </PageFrame>
  );
}
