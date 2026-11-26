import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookMarked,
  BookOpen,
  CheckCircle,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  MessageSquare,
  Quote,
  Share2,
  Star,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type {
  BookSummaryDto,
  ExplorePostItemDto,
  SocialProfileDto,
} from "@starter/shared/types";
import { EntityProfileHeader } from "@/components/profile/entity-profile-header";
import {
  ProfileTabs,
  type ProfileTabItem,
} from "@/components/profile/profile-tabs";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { PostShareDialog } from "@/features/share/components/post-share-dialog";
import { QuotePostCard } from "@/features/share/components/quote-post-card";
import { SessionPostCard } from "@/features/share/components/session-post-card";
import { SocialRelationsDialog } from "@/features/social/components/social-relations-dialog";
import { useFollowUser, useUnfollowUser } from "@/features/social/hooks";

type PublicProfileViewProps = {
  profile: SocialProfileDto;
  /** Signed-in viewer's ID; anonymous visitors are sent to sign in to follow. */
  viewerId?: string;
};

type Tab = "shelf" | "activities" | "works";

function RatingStars({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-amber-500"
      role="img"
      aria-label={`${value} dari 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-3.5 ${
            value >= n - 0.25
              ? "fill-amber-500 text-amber-500"
              : "text-muted-foreground/30"
          }`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function BookLine({ book }: { book: ExplorePostItemDto["book"] }) {
  return (
    <Link
      to="/books/$slug"
      params={{ slug: book.slug }}
      className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] group w-fit max-w-full"
    >
      <BookCover
        book={book as unknown as BookSummaryDto}
        decorative
        className="w-10 shrink-0"
      />
      <span className="min-w-0">
        <span className="block truncate font-serif text-sm font-bold text-foreground group-hover:underline">
          {book.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {book.author}
        </span>
      </span>
    </Link>
  );
}

export function PublicProfileView({
  profile,
  viewerId,
}: PublicProfileViewProps) {
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const shelves = profile.publicShelves ?? [];
  const works = profile.publishedBooks ?? [];
  const reading = shelves.filter((s) => s.shelfStatus === "reading");
  const finished = shelves.filter((s) => s.shelfStatus === "finished");
  const wantToRead = shelves.filter((s) => s.shelfStatus === "want_to_read");

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
        badges={
          isVerifiedAuthor
            ? [
                {
                  label: "Penulis Resmi",
                  tone: "success",
                  icon: <CheckCircle className="size-3.5" aria-hidden="true" />,
                },
              ]
            : []
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
          viewerId ? (
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

      {/* TAB 1: RAK BACAAN */}
      {activeTab === "shelf" &&
        (shelves.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Belum ada buku di rak bacaan {profile.name}.
          </p>
        ) : (
          <div className="space-y-8">
            {[
              { title: "Sedang dibaca", items: reading },
              { title: "Sudah tamat", items: finished },
              { title: "Ingin dibaca", items: wantToRead },
            ]
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <section key={group.title} className="space-y-3">
                  <h3 className="font-serif text-lg font-bold">
                    {group.title} ({group.items.length})
                  </h3>
                  <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <Link
                          to="/books/$slug"
                          params={{ slug: item.book.slug }}
                          className="block space-y-2 p-2.5 rounded-xl border border-border/70 hover:border-foreground/30 bg-card transition-colors group focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <BookCover book={item.book} decorative />
                          <div className="space-y-1">
                            <span className="block truncate font-serif text-xs font-bold text-foreground group-hover:underline">
                              {item.book.title}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {item.book.author}
                            </span>
                            {item.shelfStatus === "reading" &&
                              item.progressPercent > 0 && (
                                <div className="space-y-1 pt-1">
                                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[var(--color-accent)] rounded-full"
                                      style={{
                                        width: `${item.progressPercent}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-muted-foreground block text-right">
                                    {item.progressPercent}%
                                  </span>
                                </div>
                              )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        ))}

      {/* TAB 2: AKTIVITAS */}
      {activeTab === "activities" &&
        (activities.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {profile.name} belum membagikan kutipan, ulasan, atau sesi membaca
            ke linimasa.
          </p>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {activities.map((act) => (
              <ActivityFeedCard key={act.id} activity={act} />
            ))}
          </div>
        ))}

      {/* TAB 3: KARYA TERBIT */}
      {activeTab === "works" && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {works.map((book) => (
            <li key={book.id}>
              <Link
                to="/books/$slug"
                params={{ slug: book.slug }}
                className="block space-y-2 p-2.5 rounded-xl border border-border/70 hover:border-foreground/30 bg-card transition-colors group focus-visible:outline-2 focus-visible:outline-ring"
              >
                <BookCover book={book} decorative />
                <div className="space-y-0.5">
                  <span className="block truncate font-serif text-xs font-bold text-foreground group-hover:underline">
                    {book.title}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {book.author}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

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

function ActivityFeedCard({ activity }: { activity: ExplorePostItemDto }) {
  const [isLiked, setIsLiked] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const formattedDate = new Date(activity.createdAt).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  const isShareablePost =
    activity.type === "quote" || activity.type === "session";

  return (
    <article className="rounded-xl border border-border/80 bg-card p-5 space-y-3.5 shadow-xs hover:border-foreground/30 transition-colors">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {activity.type === "quote" && (
            <span className="inline-flex items-center gap-1 font-mono font-medium text-[var(--color-green)] bg-[var(--color-green-soft)] px-2.5 py-0.5 rounded-md text-[11px]">
              <Quote className="size-3" aria-hidden="true" /> Kutipan Publik
            </span>
          )}
          {activity.type === "review" && (
            <span className="inline-flex items-center gap-1 font-mono font-medium text-[var(--color-ink)] bg-[var(--color-accent-soft)] px-2.5 py-0.5 rounded-md text-[11px]">
              <Star className="size-3 fill-current" aria-hidden="true" /> Ulasan
              Buku
            </span>
          )}
          {activity.type === "session" && (
            <span className="inline-flex items-center gap-1 font-mono font-medium text-[var(--color-ink)] bg-[var(--color-accent-soft)] px-2.5 py-0.5 rounded-md text-[11px]">
              <Clock className="size-3" aria-hidden="true" /> Sesi Membaca
            </span>
          )}
          <span className="font-mono text-[11px]">{formattedDate}</span>
        </div>

        {activity.type === "review" && activity.rating && (
          <RatingStars value={activity.rating} />
        )}
      </div>

      {activity.type === "quote" ? (
        <QuotePostCard post={activity} as="div" />
      ) : activity.type === "session" ? (
        <SessionPostCard post={activity} as="div" />
      ) : (
        <div className="space-y-3">
          <BookLine book={activity.book} />
          <p className="whitespace-pre-line font-serif text-[15px] leading-relaxed text-foreground/90">
            {activity.content}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-muted-foreground text-xs">
        <button
          type="button"
          onClick={() => setIsLiked(!isLiked)}
          className={`inline-flex min-h-10 items-center gap-1.5 px-2 rounded-md hover:text-destructive transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] cursor-pointer ${
            isLiked ? "text-destructive font-semibold" : ""
          }`}
        >
          <Heart className={`size-4 ${isLiked ? "fill-current" : ""}`} />
          <span>{isLiked ? 1 : 0}</span>
        </button>

        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-1.5 px-2 rounded-md hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] cursor-pointer"
        >
          <MessageSquare className="size-4" />
          <span>Balas</span>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          {isShareablePost && (
            <Link
              to="/post/$type/$id"
              params={{ type: activity.type, id: activity.id }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span>Detail</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-md px-2.5 hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] cursor-pointer"
            aria-label="Bagikan aktivitas"
          >
            <Share2 className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Bagikan</span>
          </button>
        </div>
      </div>

      <PostShareDialog
        post={isShareOpen ? activity : null}
        onClose={() => setIsShareOpen(false)}
      />
    </article>
  );
}
