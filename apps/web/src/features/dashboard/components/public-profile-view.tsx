import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  BookOpen,
  CheckCircle,
  Clock,
  Heart,
  MapPin,
  MessageSquare,
  Quote,
  Share2,
  Sparkles,
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
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
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

function BookLine({ book }: { book: BookSummaryDto }) {
  return (
    <Link
      to="/books/$slug"
      params={{ slug: book.slug }}
      className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-ring group w-fit max-w-full"
    >
      <BookCover book={book} decorative className="w-10 shrink-0" />
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

export function PublicProfileView({ profile, viewerId }: PublicProfileViewProps) {
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const shelves = profile.publicShelves ?? [];
  const works = profile.publishedBooks ?? [];
  const reading = shelves.filter((s) => s.shelfStatus === "reading");
  const finished = shelves.filter((s) => s.shelfStatus === "finished");
  const wantToRead = shelves.filter((s) => s.shelfStatus === "want_to_read");

  // Activities: includes reviews, posted highlights/quotes, and posted reading sessions
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

  // Tab 1: Rak Bacaan (Default), Tab 2: Aktivitas, Tab 3: Karya
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "shelf", label: "Rak Bacaan", count: shelves.length },
    { id: "activities", label: "Aktivitas", count: activities.length },
    ...(works.length > 0
      ? [{ id: "works" as const, label: "Karya", count: works.length }]
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

  const stats = [
    {
      label: "Pengikut",
      value: profile.followersCount,
      onClick: () => setRelations({ isOpen: true, initialTab: "followers" }),
    },
    {
      label: "Mengikuti",
      value: profile.followingCount,
      onClick: () => setRelations({ isOpen: true, initialTab: "following" }),
    },
    { label: "Buku tamat", value: profile.booksCompletedCount ?? 0 },
    { label: "Menit baca", value: profile.totalReadingMinutes ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <section
        aria-label="Informasi profil"
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        {profile.headerImage?.trim() ? (
          <img
            src={profile.headerImage}
            alt=""
            className="h-32 w-full object-cover sm:h-44"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="h-20 w-full bg-muted sm:h-28" aria-hidden="true" />
        )}

        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-muted text-2xl font-bold sm:size-24">
                {profile.image ? (
                  <img
                    src={profile.image}
                    alt={profile.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <span>{profile.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
            </div>

            {viewerId ? (
              <Button
                type="button"
                onClick={toggleFollow}
                disabled={busy}
                className={`min-h-11 cursor-pointer gap-2 rounded-xl px-5 text-sm font-semibold transition-all ${
                  profile.isFollowing
                    ? "border border-border bg-muted text-foreground hover:bg-muted/80"
                    : "bg-orange-600 hover:bg-orange-700 text-white"
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
              <Button asChild className="min-h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white">
                <Link
                  to="/sign-in"
                  search={{ redirect: `/u/@${username}` }}
                >
                  Masuk untuk mengikuti
                </Link>
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                {profile.name}
              </h2>
              {isVerifiedAuthor && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 font-mono text-xs font-semibold">
                  <CheckCircle className="size-3.5 text-emerald-600" aria-hidden="true" />
                  Penulis Resmi
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">@{username}</span>
              {profile.locationCity && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {profile.locationCity}
                </span>
              )}
            </div>
            {profile.bio && (
              <p className="max-w-2xl whitespace-pre-line pt-1 text-sm leading-relaxed text-foreground/80">
                {profile.bio}
              </p>
            )}

            {(communities.length > 0 || publishers.length > 0) && (
              <ul className="flex flex-wrap gap-2 pt-2" aria-label="Afiliasi">
                {publishers.map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/p/$slug"
                      params={{ slug: p.slug }}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 text-xs font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
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
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 text-xs font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <Users className="size-3.5" aria-hidden="true" />
                      Komunitas: {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => {
              const body = (
                <>
                  <dt className="font-mono text-[11px] text-muted-foreground">
                    {s.label}
                  </dt>
                  <dd className="font-serif text-xl font-bold">{s.value}</dd>
                </>
              );
              return s.onClick ? (
                <button
                  key={s.label}
                  type="button"
                  onClick={s.onClick}
                  className="cursor-pointer rounded-xl border border-border/70 bg-muted/30 p-3 text-left hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {body}
                </button>
              ) : (
                <div
                  key={s.label}
                  className="rounded-xl border border-border/70 bg-muted/30 p-3"
                >
                  {body}
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      {/* Tabs Navigation Bar (Rak Bacaan default first, Aktivitas second) */}
      <div
        role="tablist"
        aria-label="Isi profil"
        className="flex gap-1 border-b border-border overflow-x-auto no-scrollbar scrollbar-none"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`min-h-11 cursor-pointer border-b-2 px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring whitespace-nowrap ${
              activeTab === t.id
                ? "border-orange-600 dark:border-orange-500 font-bold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

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
                          className="block space-y-2 p-2 rounded-xl border border-border/70 hover:border-foreground/30 bg-card transition-colors group focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <BookCover book={item.book} decorative />
                          <div className="space-y-1">
                            <span className="block truncate font-serif text-xs font-bold text-foreground group-hover:underline">
                              {item.book.title}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {item.book.author}
                            </span>
                            {item.shelfStatus === "reading" && item.progressPercent > 0 && (
                              <div className="space-y-1 pt-1">
                                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-orange-600 rounded-full"
                                    style={{ width: `${item.progressPercent}%` }}
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

      {/* TAB 2: AKTIVITAS (Ulasan, Kutipan/Highlight yang di-post, Sesi yang di-post) */}
      {activeTab === "activities" &&
        (activities.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {profile.name} belum membagikan kutipan, ulasan, atau sesi membaca ke linimasa.
          </p>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {activities.map((act) => (
              <ActivityFeedCard key={act.id} activity={act} />
            ))}
          </div>
        ))}

      {/* TAB 3: KARYA TERBIT (Khusus Penulis) */}
      {activeTab === "works" && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {works.map((book) => (
            <li key={book.id}>
              <Link
                to="/books/$slug"
                params={{ slug: book.slug }}
                className="block space-y-2 p-2 rounded-xl border border-border/70 hover:border-foreground/30 bg-card transition-colors group focus-visible:outline-2 focus-visible:outline-ring"
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

// Sub-component: ActivityFeedCard for Tab Aktivitas
function ActivityFeedCard({ activity }: { activity: ExplorePostItemDto }) {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const formattedDate = new Date(activity.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="rounded-xl border border-border/80 bg-card p-5 space-y-3.5 shadow-xs hover:border-foreground/30 transition-colors">
      {/* Activity Type Header */}
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {activity.type === "quote" && (
            <span className="inline-flex items-center gap-1 font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[11px]">
              <Quote className="size-3" /> Kutipan Publik
            </span>
          )}
          {activity.type === "review" && (
            <span className="inline-flex items-center gap-1 font-mono font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full text-[11px]">
              <Star className="size-3 fill-current" /> Ulasan Buku
            </span>
          )}
          {activity.type === "session" && (
            <span className="inline-flex items-center gap-1 font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full text-[11px]">
              <Clock className="size-3" /> Sesi Membaca
            </span>
          )}
          <span className="font-mono text-[11px]">· {formattedDate}</span>
        </div>

        {activity.type === "review" && activity.rating && (
          <RatingStars value={activity.rating} />
        )}
      </div>

      {/* Content based on type */}
      {activity.type === "quote" ? (
        <div className="rounded-xl bg-[#283618] text-[#fefae0] dark:bg-[#1f2b13] dark:text-[#f3ecc8] p-5 space-y-3 relative overflow-hidden shadow-xs border border-[#3a4d23]">
          <Quote className="size-7 text-[#dda15e] opacity-80" />
          <p className="font-serif text-sm sm:text-base leading-relaxed tracking-wide">
            &ldquo;{activity.content}&rdquo;
          </p>

          {activity.note && (
            <p className="text-xs text-[#fefae0]/80 italic border-t border-[#fefae0]/15 pt-2">
              Catatan: {activity.note}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 text-xs text-[#dda15e] font-medium">
            <Link
              to="/books/$slug"
              params={{ slug: activity.book.slug }}
              className="hover:underline flex items-center gap-1.5 truncate"
            >
              <BookOpen className="size-3.5 shrink-0" />
              <span>{activity.book.title} — {activity.book.author}</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsBookmarked(!isBookmarked)}
              className="text-[#fefae0] hover:text-[#dda15e] transition-colors p-1"
              aria-label="Simpan kutipan"
            >
              <Bookmark className={`size-4 ${isBookmarked ? "fill-current" : ""}`} />
            </button>
          </div>
        </div>
      ) : activity.type === "session" ? (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-border/80 bg-muted/40 space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground">
              <Clock className="size-4 text-orange-600" />
              <span>
                {Math.round((activity.durationSeconds || 0) / 60)} menit baca • {activity.pagesRead || 0} halaman
              </span>
            </div>
            {activity.note && (
              <p className="font-serif text-sm leading-relaxed text-foreground/90 italic">
                &ldquo;{activity.note}&rdquo;
              </p>
            )}
          </div>

          <BookLine book={activity.book as any} />
        </div>
      ) : (
        <div className="space-y-3">
          <BookLine book={activity.book as any} />
          <p className="whitespace-pre-line font-serif text-[15px] leading-relaxed text-foreground/90">
            {activity.content}
          </p>
        </div>
      )}

      {/* Social interaction footer */}
      <div className="flex items-center gap-6 pt-2 border-t border-border/60 text-muted-foreground text-xs">
        <button
          type="button"
          onClick={() => setIsLiked(!isLiked)}
          className={`flex items-center gap-1.5 hover:text-red-500 transition-colors ${
            isLiked ? "text-red-500 font-semibold" : ""
          }`}
        >
          <Heart className={`size-4 ${isLiked ? "fill-current" : ""}`} />
          <span>{isLiked ? 1 : 0}</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <MessageSquare className="size-4" />
          <span>Balas</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (navigator.clipboard) {
              void navigator.clipboard.writeText(
                `${activity.content} — ${activity.book.title} di AnzaBook`,
              );
            }
          }}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
          aria-label="Bagikan aktivitas"
        >
          <Share2 className="size-4" />
        </button>
      </div>
    </article>
  );
}
