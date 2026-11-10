import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { DashboardProfile } from "@/features/dashboard/components/dashboard-profile";
import { useUserProfile } from "@/features/social/hooks";
import { userProfileQuery } from "@/features/social/queries";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/u/$username")({
  loader: async ({ context, params }) => {
    try {
      const profile = await context.queryClient.ensureQueryData(
        userProfileQuery(params.username),
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
      ? `${name} (@${username || "user"}) | Profil Sosial AnzaBook`
      : "Profil Pengguna | AnzaBook";
    return { meta: [{ title }] };
  },
  component: PublicUserProfilePage,
});

export default function PublicUserProfilePage() {
  const { username } = Route.useParams();
  const context = Route.useRouteContext();
  const currentUserId = context?.session?.user?.id;

  const { data: profile } = useUserProfile(username);

  if (!profile) return null;

  const isOwnProfile = Boolean(currentUserId && currentUserId === profile.id);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          to="/app"
          search={{ tab: "explore" }}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Pustaka</span>
        </Link>

        <Link
          to="/app"
          search={{ tab: "home" }}
          className="flex items-center gap-2"
        >
          <img
            src="/icon.svg"
            alt="AnzaBook"
            className="size-6 rounded-[5px] object-contain border border-border/40 shadow-xs"
          />
          <span className="font-serif font-bold text-sm">AnzaBook</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 flex-1">
        <DashboardProfile isOwnProfile={isOwnProfile} profile={profile} />
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
