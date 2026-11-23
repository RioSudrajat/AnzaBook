import { useEffect, useId, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlertTriangle,
  Globe,
  Loader2,
} from "lucide-react";
import type {
  CardAspect,
  HighlightColor,
  QuotePostConfig,
  QuoteTemplate,
} from "@starter/shared/types";
import { useTogglePostHighlight } from "@/features/social/hooks";
import type { ReaderTheme } from "@/features/reader/components/reader-toolbar";
import {
  buildQuoteShareCaption,
  buildSharePostUrl,
  getQuoteExcerptValidation,
} from "../card-helpers";
import { renderQuoteCardToCanvas } from "../card-renderer";
import {
  CanvasPreviewFrame,
  ComposerDialogShell,
  ComposerShareBar,
} from "./composer-shell";

export type QuoteComposerTarget = {
  id?: string | null;
  selectedText: string;
  chapterNumber?: number | null;
  pageNumber?: number | null;
  color: HighlightColor;
  note?: string | null;
  isPosted?: boolean;
  postCaption?: string | null;
  postConfig?: QuotePostConfig | null;
  bookTitle: string;
  bookAuthor?: string | null;
  bookSlug?: string | null;
  bookCoverUrl?: string | null;
  bookCoverColor?: string | null;
  surroundingContext?: string | null;
};

export type QuotePostComposerDialogProps = {
  isOpen: boolean;
  theme?: ReaderTheme;
  onClose: () => void;
  target: QuoteComposerTarget | null;
  readerName: string;
  onPublishedChange?: (result: {
    id: string;
    isPosted: boolean;
    postCaption: string | null;
    postConfig: QuotePostConfig | null;
  }) => void;
};

const QUOTE_TEMPLATE_OPTIONS: Array<{
  id: QuoteTemplate;
  label: string;
  hint: string;
}> = [
  { id: "book_cover", label: "Sampul Buku", hint: "Latar sampul & kartu" },
  { id: "furrow_paper", label: "Kertas Manila", hint: "Tipografi editorial" },
  { id: "night_stabilo", label: "Stabilo Malam", hint: "Konteks teks gelap" },
  { id: "cover_tint", label: "Warna Sampul", hint: "Nada warna buku" },
];

const DEFAULT_QUOTE_CONFIG: QuotePostConfig = {
  template: "book_cover",
  aspect: "story",
  alignment: "left",
  includeNote: false,
};

export function QuotePostComposerDialog({
  isOpen,
  theme,
  onClose,
  target,
  readerName,
  onPublishedChange,
}: QuotePostComposerDialogProps) {
  const [config, setConfig] = useState<QuotePostConfig>(DEFAULT_QUOTE_CONFIG);
  const [previewAspect, setPreviewAspect] = useState<CardAspect>("story");

  if (!target) {
    return (
      <ComposerDialogShell
        isOpen={isOpen}
        theme={theme}
        onClose={onClose}
        title="Bagikan & Post Kutipan"
        preview={null}
        controls={null}
      />
    );
  }

  return (
    <QuotePostComposerInner
      key={`${target.id ?? "draft"}-${isOpen ? "open" : "closed"}-${target.selectedText.slice(0, 24)}`}
      isOpen={isOpen}
      theme={theme}
      onClose={onClose}
      target={target}
      readerName={readerName}
      initialConfig={target.postConfig ?? config}
      onConfigSnapshot={(next) => {
        setConfig(next);
        setPreviewAspect(next.aspect);
      }}
      fallbackAspect={previewAspect}
      onPublishedChange={onPublishedChange}
    />
  );
}

type QuotePostComposerInnerProps = {
  isOpen: boolean;
  theme?: ReaderTheme;
  onClose: () => void;
  target: QuoteComposerTarget;
  readerName: string;
  initialConfig: QuotePostConfig;
  fallbackAspect: CardAspect;
  onConfigSnapshot: (next: QuotePostConfig) => void;
  onPublishedChange?: QuotePostComposerDialogProps["onPublishedChange"];
};

function QuotePostComposerInner({
  isOpen,
  theme,
  onClose,
  target,
  readerName,
  initialConfig,
  fallbackAspect,
  onConfigSnapshot,
  onPublishedChange,
}: QuotePostComposerInnerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captionId = useId();
  const includeNoteId = useId();
  const togglePostMutation = useTogglePostHighlight();

  const [config, setConfig] = useState<QuotePostConfig>(() => ({
    template: initialConfig.template ?? "book_cover",
    aspect: initialConfig.aspect ?? fallbackAspect,
    alignment: initialConfig.alignment ?? "left",
    includeNote: initialConfig.includeNote ?? false,
  }));
  const [postCaption, setPostCaption] = useState(
    () => target.postCaption ?? "",
  );
  const [localIsPosted, setLocalIsPosted] = useState(() =>
    Boolean(target.isPosted),
  );
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const excerptCheck = getQuoteExcerptValidation(target.selectedText);

  const updateConfig = (patch: Partial<QuotePostConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    onConfigSnapshot(next);
  };

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    void renderQuoteCardToCanvas(
      canvas,
      {
        quote: target.selectedText,
        bookTitle: target.bookTitle,
        bookAuthor: target.bookAuthor,
        bookCoverUrl: target.bookCoverUrl,
        bookCoverColor: target.bookCoverColor,
        chapterNumber: target.chapterNumber,
        pageNumber: target.pageNumber,
        highlightColor: target.color,
        note: target.note,
        surroundingContext: target.surroundingContext,
        readerName,
        config,
      },
      { isCancelled: () => cancelled },
    );

    return () => {
      cancelled = true;
    };
  }, [config, isOpen, readerName, target]);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://anzabook.id";
  const shareUrl = buildSharePostUrl({
    origin,
    postType: "quote",
    postId: target.id,
    isPosted: localIsPosted,
    bookSlug: target.bookSlug,
  });
  const shareText = buildQuoteShareCaption({
    quote: target.selectedText,
    bookTitle: target.bookTitle,
    bookAuthor: target.bookAuthor,
    postCaption,
    shareUrl,
  });

  const handlePublish = async (nextIsPosted: boolean) => {
    if (!target.id || togglePostMutation.isPending) return;
    setPublishError(null);
    setPublishFeedback(null);

    try {
      const result = await togglePostMutation.mutateAsync({
        highlightId: target.id,
        isPosted: nextIsPosted,
        postCaption: postCaption.trim() ? postCaption.trim() : null,
        postConfig: config,
      });
      setLocalIsPosted(result.isPosted);
      onPublishedChange?.({
        id: result.id,
        isPosted: result.isPosted,
        postCaption: result.postCaption,
        postConfig: result.postConfig,
      });
      setPublishFeedback(
        result.isPosted
          ? "Kutipan berhasil ditayangkan ke Feed AnzaBook."
          : "Kutipan ditarik dari Feed AnzaBook.",
      );
    } catch (err) {
      setPublishError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui status publikasi kutipan.",
      );
    }
  };

  const previewNode = (
    <CanvasPreviewFrame aspect={config.aspect}>
      <canvas
        ref={canvasRef}
        aria-label="Pratinjau kartu kutipan 1080p"
        className="block h-full w-full"
      />
    </CanvasPreviewFrame>
  );

  const controlsNode = (
    <>
      <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Kutipan Dipilih
          </span>
          <span
            className={`font-mono ${
              excerptCheck.isTooLong
                ? "font-semibold text-[#B91C1C]"
                : "text-[var(--color-muted)]"
            }`}
          >
            {excerptCheck.length}/{excerptCheck.maxLength} karakter
          </span>
        </div>
        <p className="line-clamp-3 font-serif text-sm leading-relaxed text-[var(--color-ink)]">
          "{target.selectedText}"
        </p>
        {excerptCheck.isTooLong ? (
          <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-[#B91C1C]/30 bg-[#FEF2F2] p-2.5 text-xs text-[#7F1D1D]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Kutipan melebihi batas {excerptCheck.maxLength} karakter untuk
              publikasi Feed (DRM-05). Kamu tetap bisa mengunduh kartu gambar ke
              perangkatmu.
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Template Kartu
          </span>
          <div className="grid grid-cols-2 gap-2">
            {QUOTE_TEMPLATE_OPTIONS.map((tpl) => {
              const active = config.template === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => updateConfig({ template: tpl.id })}
                  className={`flex min-h-11 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                      : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]"
                  }`}
                >
                  <span className="text-xs font-semibold">{tpl.label}</span>
                  <span className="text-[11px] text-[var(--color-muted)]">
                    {tpl.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Rasio Kanvas
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "story", label: "9:16 Story" },
                  { id: "square", label: "1:1 Square" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => updateConfig({ aspect: item.id })}
                  className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                    config.aspect === item.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                      : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Perataan Teks
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateConfig({ alignment: "left" })}
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                  config.alignment === "left"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                    : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]"
                }`}
              >
                <AlignLeft className="h-3.5 w-3.5" />
                <span>Rata Kiri</span>
              </button>
              <button
                type="button"
                onClick={() => updateConfig({ alignment: "center" })}
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                  config.alignment === "center"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                    : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]"
                }`}
              >
                <AlignCenter className="h-3.5 w-3.5" />
                <span>Tengah</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={captionId}
            className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]"
          >
            Opini / Konteks Tambahan
          </label>
          <span className="font-mono text-[11px] text-[var(--color-muted)]">
            {postCaption.length}/500
          </span>
        </div>
        <textarea
          id={captionId}
          rows={3}
          maxLength={500}
          value={postCaption}
          onChange={(e) => setPostCaption(e.target.value)}
          placeholder="Tulis mengapa paragraf ini berkesan bagimu..."
          className="w-full rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:outline-none"
        />
      </div>

      {target.note?.trim() ? (
        <label
          htmlFor={includeNoteId}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 py-2.5"
        >
          <input
            id={includeNoteId}
            type="checkbox"
            checked={config.includeNote}
            onChange={(e) => updateConfig({ includeNote: e.target.checked })}
            className="h-4 w-4 rounded border-[var(--color-rule)] accent-[var(--color-accent)]"
          />
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-[var(--color-ink)]">
              Sertakan catatan pribadi di kartu & feed publik
            </span>
            <span className="block truncate text-xs text-[var(--color-muted)]">
              Catatanmu: "{target.note.trim()}"
            </span>
          </div>
        </label>
      ) : null}

      {target.id ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={
                togglePostMutation.isPending ||
                (!localIsPosted && excerptCheck.isTooLong)
              }
              onClick={() => void handlePublish(true)}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
            >
              {togglePostMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              <span>
                {localIsPosted
                  ? "Perbarui di Feed AnzaBook"
                  : "Post ke Feed AnzaBook"}
              </span>
            </button>

            {localIsPosted ? (
              <button
                type="button"
                disabled={togglePostMutation.isPending}
                onClick={() => void handlePublish(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 py-2.5 text-xs font-semibold text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-paper-3)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                Tarik dari Feed
              </button>
            ) : null}
          </div>

          {publishError ? (
            <p role="alert" className="text-xs font-medium text-[#B91C1C]">
              {publishError}
            </p>
          ) : null}
          {publishFeedback ? (
            <p
              role="status"
              aria-live="polite"
              className="text-xs font-medium text-[#15803D]"
            >
              {publishFeedback}
            </p>
          ) : null}
        </div>
      ) : null}

      <ComposerShareBar
        canvasRef={canvasRef}
        filenamePrefix="kutipan"
        filenameTitle={target.bookTitle}
        aspect={config.aspect}
        shareTitle={`Kutipan dari ${target.bookTitle}`}
        shareText={shareText}
        shareUrl={shareUrl}
      />
    </>
  );

  return (
    <ComposerDialogShell
      isOpen={isOpen}
      theme={theme}
      onClose={onClose}
      title="Bagikan & Post Kutipan"
      subtitle={`${target.bookTitle}${target.bookAuthor ? ` · ${target.bookAuthor}` : ""}`}
      preview={previewNode}
      controls={controlsNode}
    />
  );
}
