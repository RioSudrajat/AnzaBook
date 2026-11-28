import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookMarked,
  BookOpen,
  Clock,
  MapPin,
  Quote,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type {
  ExplorePostItemDto,
  SocialProfileDto,
} from "@starter/shared/types";
import { EntityProfileHeader } from "@/components/profile/entity-profile-header";
import { ProfileActivityFeed } from "@/components/profile/profile-activity-feed";
import { ProfileReadingShelf } from "@/components/profile/profile-reading-shelf";
import {
  ProfileTabs,
  type ProfileTabItem,
} from "@/components/profile/profile-tabs";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/features/books/components/book-card";
import { SocialRelationsDialog } from "@/features/social/components/social-relations-dialog";
import { useFollowUser, useUnfollowUser } from "@/features/social/hooks";

type PublicProfileViewProps = {
  profile: SocialProfileDto;
  /** Signed-in viewer's ID; anonymous visitors are sent to sign in to follow. */
  viewerId?: string;
};

type Tab = "shelf" | "activities" | "works";

export function PublicProfileView({
  profile,
  viewerId,
}: PublicProfileViewProps) {
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const shelves = profile.publicShelves ?? [];
  const works = profile.publishedBooks ?? [];

  const activities: ExplorePostItemDto[] =
    profile.publicActivities && profile.publicActivities.length > 0
      ? profile.publicActivities
      : (profile.publicReviews ?? []).map((r) => ({
          id: r.id,
          type: "review" as const,
          content: r.content,
          createdAt: r.createdAt,
          author: {
            id: profile.id,
            name: profile.name,
            username: profile.username,
            image: profile.image,
          },
          book: r.book,
          rating: r.rating,
        }));

  const tabs: ProfileTabItem<Tab>[] = [
    {
      id: "shelf",
      label: "Rak Bacaan",
      count: shelves.length,
      icon: <BookMarked className="size-4" aria-hidden="true" />,
    },
    {
      id: "activities",
      label: "Aktivitas",
      count: activities.length,
      icon: <Quote className="size-4" aria-hidden="true" />,
    },
    ...(works.length > 0
      ? [
          {
            id: "works" as const,
            label: "Karya",
            count: works.length,
            icon: <BookOpen className="size-4" aria-hidden="true" />,
          },
        ]
      : []),
  ];

  const [activeTab, setActiveTab] = useState<Tab>("shelf");
  const [relations, setRelations] = useState<{
    isOpen: boolean;
    initialTab: "followers" | "following";
  }>({ isOpen: false, initialTab: "followers" });

  const username = profile.username ?? "";
  const isVerifiedAuthor = profile.authorStatus === "verified";
  const communities = profile.managedCommunities ?? [];
  const publishers = profile.managedPublishers ?? [];
  const busy = followMutation.isPending || unfollowMutation.isPending;

  const toggleFollow = async () => {
    if (profile.isFollowing) {
      await unfollowMutation.mutateAsync(profile.id);
    } else {
      await followMutation.mutateAsync({
        targetUserId: profile.id,
        isSubscribedUpdates: true,
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <EntityProfileHeader
        kind="user"
        headingLevel="h2"
        ariaLabel="Informasi profil"
        name={profile.name}
        handleOrSlug={username ? `@${username}` : undefined}
        avatarUrl={profile.image}
        bannerUrl={profile.headerImage || profile.socialLinks?.headerImage}
        isVerified={isVerifiedAuthor}
        verifiedEntityType="author"
        shareConfig={
          username
            ? {
                entityType: isVerifiedAuthor ? "author" : "user",
                name: profile.name,
                handle: username,
                avatarUrl: profile.image,
                sharePath: `/u/${username}`,
              }
            : undefined
        }
        metaItems={
          profile.locationCity
            ? [
                {
                  icon: <MapPin className="size-3.5" aria-hidden="true" />,
                  label: profile.locationCity,
                },
              ]
            : []
        }
        bio={profile.bio}
        socialLinks={profile.socialLinks}
        affiliations={
          communities.length > 0 || publishers.length > 0 ? (
            <ul className="flex flex-wrap gap-2 pt-1" aria-label="Afiliasi">
              {publishers.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/p/$slug"
                    params={{ slug: p.slug }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-medium text-[var(--color-ink-2)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
                  >
                    <BookOpen className="size-3.5" aria-hidden="true" />
                    Penerbit: {p.name}
                  </Link>
                </li>
              ))}
              {communities.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/c/$slug"
                    params={{ slug: c.slug }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-medium text-[var(--color-ink-2)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
                  >
                    <Users className="size-3.5" aria-hidden="true" />
                    Komunitas: {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : undefined
        }
        actions={
          viewerId === profile.id ? undefined : viewerId ? (
            <Button
              type="button"
              onClick={toggleFollow}
              disabled={busy}
              className={`min-h-11 cursor-pointer gap-2 rounded-xl px-5 text-xs font-semibold transition-colors ${
                profile.isFollowing
                  ? "border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]"
                  : "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95"
              }`}
            >
              {profile.isFollowing ? (
                <UserCheck className="size-4" aria-hidden="true" />
              ) : (
                <UserPlus className="size-4" aria-hidden="true" />
              )}
              <span>{profile.isFollowing ? "Mengikuti" : "Ikuti"}</span>
            </Button>
          ) : (
            <Button
              asChild
              className="min-h-11 rounded-xl bg-[var(--color-accent)] px-5 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
            >
              <Link to="/sign-in" search={{ redirect: `/u/@${username}` }}>
                Masuk untuk mengikuti
              </Link>
            </Button>
          )
        }
        metrics={[
          {
            label: "Pengikut",
            value: profile.followersCount,
            icon: <Users className="size-3.5" aria-hidden="true" />,
            onClick: () =>
              setRelations({ isOpen: true, initialTab: "followers" }),
          },
          {
            label: "Mengikuti",
            value: profile.followingCount,
            icon: <UserCheck className="size-3.5" aria-hidden="true" />,
            onClick: () =>
              setRelations({ isOpen: true, initialTab: "following" }),
          },
          {
            label: "Buku Tamat",
            value: profile.booksCompletedCount ?? 0,
            icon: <BookMarked className="size-3.5" aria-hidden="true" />,
          },
          {
            label: "Total Menit Baca",
            value: profile.totalReadingMinutes ?? 0,
            unit: "menit",
            icon: <Clock className="size-3.5" aria-hidden="true" />,
          },
        ]}
      />

      <ProfileTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel="Isi profil"
        idPrefix="pub-user"
      />

      <div className="min-h-[55vh]">
        {activeTab === "shelf" && (
          <div role="tabpanel" aria-labelledby="pub-user-tab-shelf">
            <ProfileReadingShelf
              shelves={shelves}
              isOwner={false}
              ownerName={profile.name}
            />
          </div>
        )}

        {activeTab === "activities" && (
          <div role="tabpanel" aria-labelledby="pub-user-tab-activities">
            <ProfileActivityFeed
              entries={activities.map((post) => ({ post }))}
              isOwner={false}
              ownerName={profile.name}
            />
          </div>
        )}

        {activeTab === "works" && (
          <div role="tabpanel" aria-labelledby="pub-user-tab-works">
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {works.map((book) => (
                <li key={book.id}>
                  <BookCard book={book} variant="catalog" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <SocialRelationsDialog
        isOpen={relations.isOpen}
        onClose={() => setRelations((prev) => ({ ...prev, isOpen: false }))}
        targetUsername={username}
        initialTab={relations.initialTab}
        currentUserId={viewerId}
      />
    </div>
  );
}
