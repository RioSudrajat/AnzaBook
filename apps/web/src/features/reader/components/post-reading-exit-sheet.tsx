import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Share2, X } from "lucide-react";
import type { ReadingTempo } from "@starter/shared/reading-progress";
import type { PublishSessionPostInput } from "@starter/shared/validators/social";
import { Button } from "@/components/ui/button";
import type { ReaderTheme } from "./reader-toolbar";
import { formatActiveDuration, tempoLabelId } from "../session-metrics";

export type PostReadingSessionSummary = {
  sessionId: string | null;
  bookTitle: string;
  bookAuthor: string;
  activeSeconds: number;
  wordsRead: number;
  pagesRead: number;
  rawWpm: number | null;
  tempo: ReadingTempo | null;
  startProgressPercent: number;
  endProgressPercent: number;
  startChapterNumber: number;
  endChapterNumber: number;
  highlightsCount: number;
};

type PostReadingExitSheetProps = {
  isOpen: boolean;
  theme: ReaderTheme;
  summary: PostReadingSessionSummary | null;
  isPosted: boolean;
  isSubmittingPost: boolean;
  postError: string | null;
  nextChapter?: number;
  onSkipAndExit: () => void;
  onResumeReading: () => void;
  onContinueNextChapter?: (chapterNumber: number) => void;
  onPublishSession: (input: PublishSessionPostInput) => Promise<void>;
  onOpenExternalComposer?: (summary: PostReadingSessionSummary) => void;
};

function ExitSheetContent({
  summary,
  isPosted,
  isSubmittingPost,
  postError,
  nextChapter,
  onSkipAndExit,
  onResumeReading,
  onContinueNextChapter,
  onPublishSession,
  onOpenExternalComposer,
}: Omit<PostReadingExitSheetProps, "isOpen" | "theme"> & {
  summary: PostReadingSessionSummary;
}) {
  const titleId = useId();
  const noteId = useId();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [showDuration, setShowDuration] = useState(true);
  const [showPages, setShowPages] = useState(true);
  const [showWpm, setShowWpm] = useState(summary.rawWpm !== null);

  const isCompleted = summary.endProgressPercent >= 100;
  const progressDelta = Math.max(
    0,
    summary.endProgressPercent - summary.startProgressPercent,
  );
  const tempoMeta = summary.tempo ? tempoLabelId(summary.tempo) : null;

  const handleToggleComposer = () => {
    if (onOpenExternalComposer) {
      onOpenExternalComposer(summary);
      return;
    }
    setIsComposerOpen((prev) => !prev);
  };

  const handleSubmitPost = async (event: React.FormEvent) => {
    event.preventDefault();
    await onPublishSession({
      isPosted: true,
      title: title.trim() || null,
      note: note.trim() || null,
      postConfig: {
        template: "literary_index",
        aspect: "square",
        showDuration,
        showPages,
        showWpm: showWpm && summary.rawWpm !== null,
      },
    });
  };

  const handleUnpublish = async () => {
    await onPublishSession({ isPosted: false });
  };

  return (
    <div className="bg-card text-card-foreground border border-border rounded-[14px] p-5 sm:p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h2
            id="exit-sheet-title"
            className="font-serif text-xl font-semibold tracking-tight text-foreground"
          >
            {isCompleted ? "Buku Tuntas Dibaca" : "Ringkasan Sesi Baca"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground truncate">
            {summary.bookTitle}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onResumeReading}
          className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Tutup ringkasan dan lanjut membaca"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {isCompleted && (
        <div className="mt-4 rounded-[8px] border border-[var(--color-green)]/30 bg-[var(--color-green-soft)] px-3.5 py-2.5 text-xs font-medium text-[var(--color-green)]">
          Progres baca mencapai 100%. Pencapaianmu sudah tercatat di riwayat
          buku.
        </div>
      )}

      <dl className="mt-4 grid grid-cols-3 divide-x divide-border rounded-[10px] border border-border bg-muted/40">
        <div className="px-2.5 py-3 text-center">
          <dt className="font-sans text-[11px] font-medium text-muted-foreground">
            Durasi Aktif
          </dt>
          <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
            {formatActiveDuration(summary.activeSeconds)}
          </dd>
        </div>
        <div className="px-2.5 py-3 text-center">
          <dt className="font-sans text-[11px] font-medium text-muted-foreground">
            Halaman Standar
          </dt>
          <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
            {summary.pagesRead} hal
          </dd>
          <dd className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {summary.wordsRead.toLocaleString("id-ID")} kata
          </dd>
        </div>
        <div className="px-2.5 py-3 text-center">
          <dt className="font-sans text-[11px] font-medium text-muted-foreground">
            Progres Buku
          </dt>
          <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
            {summary.startProgressPercent}% &rarr; {summary.endProgressPercent}%
          </dd>
          {progressDelta > 0 && (
            <dd className="font-mono text-[10px] tabular-nums text-[var(--color-green)]">
              +{progressDelta}%
            </dd>
          )}
        </div>
      </dl>

      {(tempoMeta !== null || summary.highlightsCount > 0) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 text-xs font-mono tabular-nums text-muted-foreground">
          {tempoMeta !== null && summary.rawWpm !== null ? (
            <span title={tempoMeta.description}>
              Tempo {tempoMeta.label} ({summary.rawWpm} KPM)
            </span>
          ) : (
            <span />
          )}
          {summary.highlightsCount > 0 && (
            <span>{summary.highlightsCount} stabilo baru</span>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Sesi baca ini disimpan privat secara bawaan.
      </p>

      {isComposerOpen && !isPosted && summary.sessionId && (
        <form
          onSubmit={(e) => void handleSubmitPost(e)}
          className="mt-4 space-y-3 rounded-[10px] border border-border bg-background/70 p-3.5"
        >
          <div>
            <label
              htmlFor={titleId}
              className="mb-1 block font-sans text-xs font-medium text-foreground"
            >
              Judul sesi (opsional)
            </label>
            <input
              id={titleId}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              placeholder={`Sesi Chapter ${summary.endChapterNumber}`}
              className="min-h-11 w-full rounded-[6px] border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>

          <div>
            <label
              htmlFor={noteId}
              className="mb-1 block font-sans text-xs font-medium text-foreground"
            >
              Catatan bacaan (opsional)
            </label>
            <textarea
              id={noteId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Bagian yang paling berkesan dari sesi ini..."
              className="w-full resize-none rounded-[6px] border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>

          <fieldset className="space-y-1">
            <legend className="font-sans text-xs font-medium text-muted-foreground">
              Metrik yang ditampilkan di linimasa
            </legend>
            <div className="flex flex-wrap gap-3 pt-1">
              <label className="inline-flex min-h-11 items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={showDuration}
                  onChange={(e) => setShowDuration(e.target.checked)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                Durasi
              </label>
              <label className="inline-flex min-h-11 items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={showPages}
                  onChange={(e) => setShowPages(e.target.checked)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                Halaman
              </label>
              {summary.rawWpm !== null && (
                <label className="inline-flex min-h-11 items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={showWpm}
                    onChange={(e) => setShowWpm(e.target.checked)}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  Kecepatan (KPM)
                </label>
              )}
            </div>
          </fieldset>

          {postError && (
            <p
              role="alert"
              className="rounded-[6px] border border-destructive/40 bg-[var(--color-error-soft)] px-3 py-2 text-xs text-destructive"
            >
              {postError}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmittingPost}
            className="min-h-11 w-full bg-primary text-primary-foreground font-sans text-sm font-semibold hover:brightness-95"
          >
            {isSubmittingPost ? "Menerbitkan..." : "Terbitkan ke Linimasa"}
          </Button>
        </form>
      )}

      {isPosted && (
        <div className="mt-4 space-y-2 rounded-[10px] border border-[var(--color-green)]/30 bg-[var(--color-green-soft)] p-3 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-[var(--color-green)]">
            <Check className="size-4 shrink-0" aria-hidden="true" />
            Sesi telah dibagikan ke linimasa publik.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/app"
              search={{ tab: "library" }}
              className="inline-flex min-h-11 items-center font-semibold text-foreground underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Buka My Library
            </Link>
            <button
              type="button"
              onClick={() => void handleUnpublish()}
              disabled={isSubmittingPost}
              className="inline-flex min-h-11 items-center text-muted-foreground underline hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              Tarik dari Publik
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        {summary.sessionId && !isPosted && (
          <Button
            type="button"
            onClick={handleToggleComposer}
            className="min-h-11 w-full gap-2 bg-primary text-primary-foreground font-sans text-sm font-semibold hover:brightness-95"
          >
            <Share2 className="size-4" aria-hidden="true" />
            Post / Bagikan Sesi
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={onSkipAndExit}
          className="min-h-11 w-full font-sans text-sm font-medium"
        >
          {isPosted ? "Kembali ke Home" : "Lewati & Keluar"}
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onResumeReading}
            className="min-h-11 flex-1 font-sans text-sm text-muted-foreground hover:text-foreground"
            autoFocus
          >
            Lanjut Membaca
          </Button>

          {nextChapter !== undefined && onContinueNextChapter && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onContinueNextChapter(nextChapter)}
              className="min-h-11 flex-1 font-sans text-sm font-medium text-foreground"
            >
              Lanjut ke Chapter {nextChapter}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PostReadingExitSheet({
  isOpen,
  theme,
  summary,
  isPosted,
  isSubmittingPost,
  postError,
  nextChapter,
  onSkipAndExit,
  onResumeReading,
  onContinueNextChapter,
  onPublishSession,
  onOpenExternalComposer,
}: PostReadingExitSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const skipResumeOnCloseRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const shouldBeOpen = isOpen && Boolean(summary);
    if (shouldBeOpen && !dialog.open) {
      skipResumeOnCloseRef.current = false;
      dialog.showModal();
    } else if (!shouldBeOpen && dialog.open) {
      skipResumeOnCloseRef.current = true;
      dialog.close();
    }
  }, [isOpen, summary]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || typeof HTMLDialogElement === "undefined") return;
    if ("closedBy" in HTMLDialogElement.prototype) return;

    // Fallback light dismiss when native closedby attribute is unavailable (Safari).
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    let pressedOutside = false;
    const handlePointerDown = (e: PointerEvent) => {
      if (!dialog.open) return;
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (dialog.open && pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleDialogClose = () => {
    const dialog = dialogRef.current;
    if (dialog) dialog.returnValue = "";
    const skipResume = skipResumeOnCloseRef.current;
    skipResumeOnCloseRef.current = false;
    if (!skipResume) {
      onResumeReading();
    }
  };

  const handleSkipAndExit = () => {
    skipResumeOnCloseRef.current = true;
    dialogRef.current?.close();
    onSkipAndExit();
  };

  const handleContinueNext = (chapterNum: number) => {
    skipResumeOnCloseRef.current = true;
    dialogRef.current?.close();
    onContinueNextChapter?.(chapterNum);
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as Record<string, string>)}
      aria-labelledby="exit-sheet-title"
      data-theme={theme}
      onClose={handleDialogClose}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto border-0 bg-transparent p-0 text-foreground backdrop:bg-black/65"
    >
      {summary && (
        <ExitSheetContent
          key={summary.sessionId ?? "session"}
          summary={summary}
          isPosted={isPosted}
          isSubmittingPost={isSubmittingPost}
          postError={postError}
          nextChapter={nextChapter}
          onSkipAndExit={handleSkipAndExit}
          onResumeReading={() => dialogRef.current?.close()}
          onContinueNextChapter={
            onContinueNextChapter ? handleContinueNext : undefined
          }
          onPublishSession={onPublishSession}
          onOpenExternalComposer={onOpenExternalComposer}
        />
      )}
    </dialog>
  );
}
