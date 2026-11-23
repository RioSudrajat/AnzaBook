import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, MessageCircle, Share2, User } from "lucide-react";
import type { ExplorePostItemDto } from "@starter/shared/types";
import { publicSocialPostParamsSchema } from "@starter/shared/validators/social";
import { Brand } from "@/components/brand";
import { siteConfig } from "@/config/site";
import { bookShareOrigin } from "@/features/books/book-share";
import {
  buildQuoteShareCaption,
  buildSessionShareCaption,
  buildSharePostUrl,
  buildWhatsAppShareUrl,
  resolveSessionCardViewModel,
  shareTempoLabel,
} from "@/features/share/card-helpers";
import { BookCoverThumb } from "@/features/share/components/book-cover-thumb";
import { CopyLinkButton } from "@/features/share/components/copy-link-button";
import { PostShareDialog } from "@/features/share/components/post-share-dialog";
import { QuotePostCard } from "@/features/share/components/quote-post-card";
import { SessionPostCard } from "@/features/share/components/session-post-card";
import { publicSocialPostQuery } from "@/features/social/queries";
import { ApiError } from "@/lib/api/client";

function buildPostMetaTitle(post: ExplorePostItemDto): string {
  if (post.type === "quote") {
    const snippet =
      post.content.length > 72
        ? `${post.content.slice(0, 69).trimEnd()}…`
        : post.content;
    return `"${snippet}" — ${post.book.title} | ${siteConfig.name}`;
  }
  const vm = resolveSessionCardViewModel(post);
  return `${vm.title} oleh ${post.author.name} | ${siteConfig.name}`;
}

function buildPostMetaDescription(post: ExplorePostItemDto): string {
  if (post.type === "quote") {
    const caption = post.postCaption?.trim();
    if (caption) {
      return `${caption} — Kutipan dari ${post.book.title} (${post.book.author}) oleh ${post.author.name} di AnzaBook.`;
    }
    return `Kutipan dari ${post.book.title} oleh ${post.book.author}, dibagikan oleh ${post.author.name} di AnzaBook.`;
  }
  return `${post.content} — ${post.book.title} (${post.book.author}) oleh ${post.author.name} di AnzaBook.`;
}

export const Route = createFileRoute("/post/$type/$id")({
  loader: async ({ context, params }) => {
    const parsed = publicSocialPostParamsSchema.safeParse(params);
    if (!parsed.success) {
      throw notFound();
    }
    try {
      const post = await context.queryClient.ensureQueryData(
        publicSocialPostQuery(parsed.data.type, parsed.data.id),
      );
      return {
        post,
        postType: parsed.data.type,
        origin: bookShareOrigin(),
      };
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 404 || error.status === 422 || error.status === 400)
      ) {
        throw notFound();
      }
      throw error;
    }
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post;
    if (!post) {
      return {
        meta: [{ title: `Postingan Tidak Ditemukan | ${siteConfig.name}` }],
      };
    }
    const origin = loaderData.origin.replace(/\/+$/, "");
    const postUrl = `${origin}/post/${encodeURIComponent(params.type)}/${encodeURIComponent(params.id)}`;
    const previewUrl = `${origin}/post-preview/${encodeURIComponent(params.type)}/${encodeURIComponent(params.id)}`;
    const title = buildPostMetaTitle(post);
    const description = buildPostMetaDescription(post);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:site_name", content: siteConfig.name },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: postUrl },
        { property: "og:image", content: previewUrl },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: previewUrl },
      ],
      links: [{ rel: "canonical", href: postUrl }],
    };
  },
  notFoundComponent: PublicPostNotFound,
  component: PublicPostPage,
});

function PublicPostNotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col">
      <header className="border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-8 h-16">
          <Brand />
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-rule)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] transition-colors"
          >
            Jelajahi AnzaBook
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center space-y-5">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
          404 · Postingan Privat atau Tidak Ditemukan
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--color-ink)]">
          Postingan ini tidak tersedia untuk publik
        </h1>
        <p className="text-sm leading-relaxed text-[var(--color-muted)]">
          Pembaca mungkin belum mempublikasikan catatan ini, atau tautan yang
          dibuka sudah tidak berlaku.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/app"
            search={{ tab: "explore" }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-accent-ink)] hover:brightness-95 transition-[filter]"
          >
            <BookOpen className="size-4" aria-hidden="true" />
            <span>Buka Feed Explore</span>
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-rule)] px-5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

function PublicPostPage() {
  const { post, postType, origin } = Route.useLoaderData();
  const context = Route.useRouteContext();
  const isSignedIn = Boolean(context?.session?.user);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const shareUrl = buildSharePostUrl({
    origin: typeof window !== "undefined" ? window.location.origin : origin,
    postType,
    postId: post.id,
    isPosted: true,
    bookSlug: post.book.slug,
  });

  const shareCaption =
    post.type === "quote"
      ? buildQuoteShareCaption({
          quote: post.content,
          bookTitle: post.book.title,
          bookAuthor: post.book.author,
          postCaption: post.postCaption,
          shareUrl,
        })
      : (() => {
          const vm = resolveSessionCardViewModel(post);
          const hasDuration = vm.metrics.some((m) => m.key === "duration");
          const hasPages = vm.metrics.some((m) => m.key === "pages");
          const hasTempo = vm.metrics.some((m) => m.key === "tempo");
          return buildSessionShareCaption({
            title: vm.title,
            bookTitle: post.book.title,
            durationSec: hasDuration ? (post.durationSeconds ?? null) : null,
            pagesRead: hasPages ? post.pagesRead : undefined,
            tempoLabel: hasTempo ? shareTempoLabel(post.avgWpm) : null,
            note: vm.note,
            shareUrl,
          });
        })();

  const formattedDate = new Date(post.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col">
      {/* Minimal editorial header */}
      <header className="border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 sm:px-8 h-16">
          <Brand />
          <nav
            aria-label="Navigasi publik"
            className="flex items-center gap-2 sm:gap-3"
          >
            <Link
              to="/"
              className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center rounded-lg px-3 text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            >
              Katalog
            </Link>
            {isSignedIn ? (
              <Link
                to="/app"
                search={{ tab: "explore" }}
                className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center rounded-lg bg-[var(--color-ink)] px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-[var(--color-paper)] hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                Jelajahi Feed
              </Link>
            ) : (
              <Link
                to="/sign-in"
                className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center rounded-lg border border-[var(--color-rule)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                Masuk
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Above-the-fold editorial grid (1280x800 ready) */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(290px,0.85fr)] lg:items-start">
          {/* Primary Column: Reader Attribution + Styled Post Card */}
          <section className="space-y-5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                to="/u/$username"
                params={{ username: post.author.username || post.author.id }}
                className="inline-flex min-h-11 items-center gap-3 group rounded-lg pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                {post.author.image ? (
                  <img
                    src={post.author.image}
                    alt={post.author.name}
                    className="size-10 rounded-full object-cover border border-[var(--color-rule)] shrink-0"
                  />
                ) : (
                  <span className="size-10 rounded-full bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink)] font-serif font-bold text-sm flex items-center justify-center shrink-0">
                    {post.author.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-ink)] group-hover:underline truncate">
                    {post.author.name}
                  </p>
                  <p className="text-xs font-mono text-[var(--color-muted)] truncate">
                    @{post.author.username || "pembaca"} · {formattedDate}
                  </p>
                </div>
              </Link>

              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {post.type === "quote" ? "Kutipan Publik" : "Catatan Sesi Baca"}
              </span>
            </div>

            {post.type === "quote" ? (
              <QuotePostCard post={post} variant="standalone" />
            ) : (
              <SessionPostCard post={post} variant="standalone" />
            )}
          </section>

          {/* Secondary Column: Curiosity-to-Sample Book CTA (FLEX-05) & Share Bar */}
          <aside className="space-y-6 lg:sticky lg:top-8 min-w-0">
            <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 sm:p-6 space-y-5">
              <div className="flex items-start gap-4">
                <BookCoverThumb book={post.book} className="w-16" />
                <div className="min-w-0 space-y-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Dari Buku
                  </p>
                  <h1 className="font-serif text-lg font-bold leading-snug text-[var(--color-ink)] break-words">
                    {post.book.title}
                  </h1>
                  <p className="text-sm text-[var(--color-ink-2)] truncate">
                    {post.book.author}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <Link
                  to="/books/$slug"
                  params={{ slug: post.book.slug }}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-ink)] hover:brightness-95 transition-[filter] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                >
                  <BookOpen className="size-4 shrink-0" aria-hidden="true" />
                  <span>Baca Cuplikan di AnzaBook</span>
                </Link>

                <Link
                  to="/read/$slug"
                  params={{ slug: post.book.slug }}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                >
                  <span>Buka Langsung di Reader</span>
                </Link>
              </div>

              <div className="border-t border-[var(--color-rule)] pt-4 space-y-2.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Bagikan Postingan Ini
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <CopyLinkButton url={shareUrl} label="Salin Tautan" />

                  <a
                    href={buildWhatsAppShareUrl(shareCaption)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                  >
                    <MessageCircle
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsShareOpen(true)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] cursor-pointer"
                  >
                    <Share2 className="size-4 shrink-0" aria-hidden="true" />
                    <span>Kartu 1080p</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-[var(--color-rule)] pt-3">
                <Link
                  to="/u/$username"
                  params={{ username: post.author.username || post.author.id }}
                  className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-sm"
                >
                  <User className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Lihat rak &amp; catatan lain dari {post.author.name}
                  </span>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <PostShareDialog
        post={isShareOpen ? post : null}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
}
