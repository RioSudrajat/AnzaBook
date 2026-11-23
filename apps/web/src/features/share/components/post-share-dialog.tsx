import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Download,
  ExternalLink,
  Loader2,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import type {
  CardAspect,
  ExplorePostItemDto,
  QuotePostConfig,
  SessionPostConfig,
} from "@starter/shared/types";
import {
  buildQuoteShareCaption,
  buildSessionShareCaption,
  buildSharePostUrl,
  buildWhatsAppShareUrl,
  resolveQuoteCardViewModel,
  resolveSessionCardViewModel,
  shareTempoLabel,
} from "@/features/share/card-helpers";
import {
  renderQuoteCardToCanvas,
  renderSessionCardToCanvas,
} from "@/features/share/card-renderer";
import {
  canShareFilesNatively,
  downloadCanvasPng,
  sanitizeShareFilename,
  shareCanvasNative,
} from "@/features/share/web-share";
import { CopyLinkButton } from "./copy-link-button";

type PostShareDialogProps = {
  post: ExplorePostItemDto | null;
  onClose: () => void;
};

export function PostShareDialog({ post, onClose }: PostShareDialogProps) {
  if (!post) return null;
  return (
    <PostShareDialogContent
      key={`${post.type}-${post.id}`}
      post={post}
      onClose={onClose}
    />
  );
}

function PostShareDialogContent({
  post,
  onClose,
}: {
  post: ExplorePostItemDto;
  onClose: () => void;
}) {
  const [aspect, setAspect] = useState<CardAspect>(() =>
    post.postConfig && "aspect" in post.postConfig
      ? post.postConfig.aspect
      : "story",
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const activeRunRef = useRef(0);

  const isQuote = post.type === "quote";
  const isSession = post.type === "session";
  const canShareNative =
    typeof window !== "undefined" && canShareFilesNatively();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      activeRunRef.current += 1;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const shareUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://anzabook.id";
    if (post.type === "quote" || post.type === "session") {
      return buildSharePostUrl({
        origin,
        postType: post.type,
        postId: post.id,
        isPosted: true,
        bookSlug: post.book.slug,
      });
    }
    return `${origin}/books/${encodeURIComponent(post.book.slug)}`;
  }, [post]);

  const shareCaption = useMemo(() => {
    if (post.type === "quote") {
      return buildQuoteShareCaption({
        quote: post.content,
        bookTitle: post.book.title,
        bookAuthor: post.book.author,
        postCaption: post.postCaption,
        shareUrl,
      });
    }
    if (post.type === "session") {
      const vm = resolveSessionCardViewModel(post);
      const showDuration =
        !post.postConfig ||
        !("showDuration" in post.postConfig) ||
        post.postConfig.showDuration !== false;
      const showPages =
        !post.postConfig ||
        !("showPages" in post.postConfig) ||
        post.postConfig.showPages !== false;
      const showWpm =
        !post.postConfig ||
        !("showWpm" in post.postConfig) ||
        post.postConfig.showWpm !== false;
      return buildSessionShareCaption({
        title: vm.title,
        bookTitle: post.book.title,
        durationSec: showDuration ? (post.durationSeconds ?? null) : null,
        pagesRead: showPages ? post.pagesRead : undefined,
        tempoLabel: showWpm ? shareTempoLabel(post.avgWpm) : null,
        note: vm.note,
        shareUrl,
      });
    }
    return `${post.content}\n\n${post.book.title} — ${shareUrl}`;
  }, [post, shareUrl]);

  async function renderCurrentCardCanvas(runId: number) {
    const canvas = document.createElement("canvas");
    const isCancelled = () => activeRunRef.current !== runId;

    if (post.type === "quote") {
      const vm = resolveQuoteCardViewModel(post);
      const config: QuotePostConfig = {
        template: vm.template,
        aspect,
        alignment: vm.alignment,
        includeNote: Boolean(vm.note),
      };
      await renderQuoteCardToCanvas(
        canvas,
        {
          quote: post.content,
          bookTitle: post.book.title,
          bookAuthor: post.book.author,
          bookCoverUrl: post.book.coverUrl,
          bookCoverColor: post.book.coverColor,
          chapterNumber: post.chapterNumber,
          pageNumber: post.pageNumber,
          highlightColor: post.color,
          note: vm.note,
          readerName: post.author.name,
          config,
        },
        { isCancelled },
      );
      return isCancelled() ? null : canvas;
    }

    if (post.type === "session") {
      const vm = resolveSessionCardViewModel(post);
      const hasDuration = vm.metrics.some((m) => m.key === "duration");
      const hasPages = vm.metrics.some((m) => m.key === "pages");
      const hasTempo = vm.metrics.some((m) => m.key === "tempo");
      const config: SessionPostConfig = {
        template: vm.template,
        aspect,
        showDuration: hasDuration,
        showPages: hasPages,
        showWpm: hasTempo,
        stickerInk: vm.stickerInk,
      };
      await renderSessionCardToCanvas(
        canvas,
        {
          title: vm.title,
          bookTitle: post.book.title,
          bookAuthor: post.book.author,
          bookCoverUrl: post.book.coverUrl,
          bookCoverColor: post.book.coverColor,
          durationSec: hasDuration ? (post.durationSeconds ?? 0) : 0,
          pagesRead: hasPages ? (post.pagesRead ?? 0) : 0,
          avgWpm: hasTempo ? post.avgWpm : null,
          startChapterNumber: post.startChapterNumber,
          endChapterNumber: post.endChapterNumber,
          startProgressPercent: post.startProgressPercent,
          endProgressPercent: post.endProgressPercent,
          note: vm.note,
          readerName: post.author.name,
          config,
        },
        { isCancelled },
      );
      return isCancelled() ? null : canvas;
    }

    return null;
  }

  async function handleExport(mode: "download" | "native") {
    if (!post || (!isQuote && !isSession)) return;
    const runId = ++activeRunRef.current;
    setIsExporting(true);
    setExportFeedback(null);
    try {
      const canvas = await renderCurrentCardCanvas(runId);
      if (!canvas || activeRunRef.current !== runId) return;

      const filename = sanitizeShareFilename(
        post.type,
        post.book.title,
        aspect,
      );
      if (mode === "native") {
        const result = await shareCanvasNative({
          canvas,
          filename,
          title: `${post.book.title} — AnzaBook`,
          text: shareCaption,
          url: shareUrl,
        });
        if (activeRunRef.current !== runId) return;
        if (result === "unsupported") {
          await downloadCanvasPng(canvas, filename);
          setExportFeedback(
            "Perangkat belum mendukung Share langsung — kartu diunduh sebagai PNG.",
          );
        } else if (result === "shared") {
          setExportFeedback("Kartu berhasil dibagikan.");
        }
      } else {
        await downloadCanvasPng(canvas, filename);
        if (activeRunRef.current !== runId) return;
        setExportFeedback("Kartu PNG 1080p berhasil diunduh.");
      }
    } catch {
      if (activeRunRef.current === runId) {
        setExportFeedback("Gagal merender kartu gambar. Coba lagi.");
      }
    } finally {
      if (activeRunRef.current === runId) {
        setIsExporting(false);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-share-dialog-title"
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h2
              id="post-share-dialog-title"
              className="font-serif text-lg font-bold text-[var(--color-ink)]"
            >
              Bagikan Postingan
            </h2>
            <p className="text-xs text-[var(--color-muted)] truncate">
              {post.book.title} · oleh {post.author.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog bagikan"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] cursor-pointer shrink-0"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Shareable public URL box */}
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-[0.08em] text-[var(--color-muted)]">
            Tautan Publik
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--color-ink-2)]">
              {shareUrl}
            </span>
            <CopyLinkButton
              url={shareUrl}
              label="Salin"
              copiedLabel="Disalin"
              className="shrink-0 bg-[var(--color-paper)]"
            />
          </div>
        </div>

        {/* Aspect picker for 1080p PNG export (Quote / Session) */}
        {(isQuote || isSession) && (
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Rasio Kartu Gambar (1080p PNG)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAspect("story")}
                className={`min-h-11 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] cursor-pointer ${
                  aspect === "story"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)] font-semibold"
                    : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                9:16 IG / WA Story
              </button>
              <button
                type="button"
                onClick={() => setAspect("square")}
                className={`min-h-11 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] cursor-pointer ${
                  aspect === "square"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)] font-semibold"
                    : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                1:1 Feed / X
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid gap-2.5">
          {(isQuote || isSession) && (
            <button
              type="button"
              onClick={() => void handleExport("download")}
              disabled={isExporting}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-ink)] hover:brightness-95 transition-[filter] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-60 cursor-pointer"
            >
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              <span>Unduh Kartu 1080p PNG</span>
            </button>
          )}

          {canShareNative && (isQuote || isSession) && (
            <button
              type="button"
              onClick={() => void handleExport("native")}
              disabled={isExporting}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-60 cursor-pointer"
            >
              <Share2 className="size-4" aria-hidden="true" />
              <span>Bagikan ke IG Story / Aplikasi Lain</span>
            </button>
          )}

          <a
            href={buildWhatsAppShareUrl(shareCaption)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            <span>Bagikan ke WhatsApp</span>
          </a>

          {(post.type === "quote" || post.type === "session") && (
            <Link
              to="/post/$type/$id"
              params={{ type: post.type, id: post.id }}
              onClick={onClose}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-transparent px-4 text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              <span>Buka Halaman Postingan</span>
            </Link>
          )}
        </div>

        {exportFeedback && (
          <p
            role="status"
            aria-live="polite"
            className="text-xs font-mono text-[var(--color-ink-2)]"
          >
            {exportFeedback}
          </p>
        )}
      </div>
    </div>
  );
}
