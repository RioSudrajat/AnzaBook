import { useEffect, useId, useRef, useState } from "react";
import { Globe, ImagePlus, Loader2, Trash2 } from "lucide-react";
import type {
  CardAspect,
  SessionPostConfig,
  SessionTemplate,
} from "@starter/shared/types";
import { useTogglePostSession } from "@/features/social/hooks";
import {
  buildSessionShareCaption,
  buildSharePostUrl,
  formatShareDuration,
  resolveSafeInAppSessionTemplate,
  shareTempoLabel,
  suggestSessionTitle,
} from "../card-helpers";
import { renderSessionCardToCanvas } from "../card-renderer";
import {
  CanvasPreviewFrame,
  ComposerDialogShell,
  ComposerShareBar,
} from "./composer-shell";

export type SessionComposerTarget = {
  sessionId?: string | null;
  startedAt?: string | null;
  bookTitle: string;
  bookAuthor?: string | null;
  bookSlug?: string | null;
  bookCoverUrl?: string | null;
  bookCoverColor?: string | null;
  durationSec: number;
  pagesRead: number;
  avgWpm?: number | null;
  startChapterNumber?: number | null;
  endChapterNumber?: number | null;
  startProgressPercent?: number | null;
  endProgressPercent?: number | null;
  streakDays?: number | null;
  title?: string | null;
  note?: string | null;
  isPosted?: boolean;
  postConfig?: SessionPostConfig | null;
};

export type SessionPostComposerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  target: SessionComposerTarget | null;
  readerName: string;
  recentSessions?: ReadonlyArray<{
    createdAt?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
  }>;
  onPublishedChange?: (result: {
    id: string;
    isPosted: boolean;
    title: string | null;
    note: string | null;
    postConfig: SessionPostConfig | null;
  }) => void;
};

const SESSION_TEMPLATE_OPTIONS: Array<{
  id: SessionTemplate;
  label: string;
  hint: string;
}> = [
  { id: "cover_trail", label: "Sampul & Jejak", hint: "Default editorial" },
  { id: "photo_overlay", label: "Foto + Jejak", hint: "Latar foto perangkat" },
  {
    id: "transparent_sticker",
    label: "Stiker IG Story",
    hint: "PNG latar transparan",
  },
  { id: "literary_index", label: "Indeks Literasi", hint: "Metrik & 7 hari" },
];

const DEFAULT_SESSION_CONFIG: SessionPostConfig = {
  template: "cover_trail",
  aspect: "story",
  showWpm: true,
  showDuration: true,
  showPages: true,
  stickerInk: "light",
};

export function SessionPostComposerDialog({
  isOpen,
  onClose,
  target,
  readerName,
  recentSessions,
  onPublishedChange,
}: SessionPostComposerDialogProps) {
  const [config, setConfig] = useState<SessionPostConfig>(
    DEFAULT_SESSION_CONFIG,
  );
  const [fallbackAspect, setFallbackAspect] = useState<CardAspect>("story");

  if (!target) {
    return (
      <ComposerDialogShell
        isOpen={isOpen}
        onClose={onClose}
        title="Bagikan & Post Sesi Baca"
        preview={null}
        controls={null}
      />
    );
  }

  return (
    <SessionPostComposerInner
      key={`${target.sessionId ?? target.bookTitle}-${isOpen ? "open" : "closed"}`}
      isOpen={isOpen}
      onClose={onClose}
      target={target}
      readerName={readerName}
      recentSessions={recentSessions}
      initialConfig={target.postConfig ?? config}
      fallbackAspect={fallbackAspect}
      onConfigSnapshot={(next) => {
        setConfig(next);
        setFallbackAspect(next.aspect);
      }}
      onPublishedChange={onPublishedChange}
    />
  );
}

type SessionPostComposerInnerProps = {
  isOpen: boolean;
  onClose: () => void;
  target: SessionComposerTarget;
  readerName: string;
  recentSessions?: ReadonlyArray<{
    createdAt?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
  }>;
  initialConfig: SessionPostConfig;
  fallbackAspect: CardAspect;
  onConfigSnapshot: (next: SessionPostConfig) => void;
  onPublishedChange?: SessionPostComposerDialogProps["onPublishedChange"];
};

function SessionPostComposerInner({
  isOpen,
  onClose,
  target,
  readerName,
  recentSessions,
  initialConfig,
  fallbackAspect,
  onConfigSnapshot,
  onPublishedChange,
}: SessionPostComposerInnerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputId = useId();
  const noteInputId = useId();
  const photoInputId = useId();
  const togglePostMutation = useTogglePostSession();

  const [config, setConfig] = useState<SessionPostConfig>(() => ({
    template: initialConfig.template ?? "cover_trail",
    aspect: initialConfig.aspect ?? fallbackAspect,
    showWpm: initialConfig.showWpm ?? true,
    showDuration: initialConfig.showDuration ?? true,
    showPages: initialConfig.showPages ?? true,
    stickerInk: initialConfig.stickerInk ?? "light",
  }));

  const [sessionTitle, setSessionTitle] = useState(() => {
    const existing = target.title?.trim();
    if (existing) return existing;
    const baseDate = target.startedAt ? new Date(target.startedAt) : new Date();
    return suggestSessionTitle(
      target.bookTitle,
      Number.isNaN(baseDate.getTime()) ? new Date() : baseDate,
    );
  });

  const [note, setNote] = useState(() => target.note ?? "");
  const [localIsPosted, setLocalIsPosted] = useState(() =>
    Boolean(target.isPosted),
  );
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPhotoUrl) {
        URL.revokeObjectURL(localPhotoUrl);
      }
    };
  }, [localPhotoUrl]);

  const updateConfig = (patch: Partial<SessionPostConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      onConfigSnapshot(next);
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    void renderSessionCardToCanvas(canvas, {
      title: sessionTitle.trim() || target.bookTitle,
      bookTitle: target.bookTitle,
      bookAuthor: target.bookAuthor,
      bookCoverUrl: target.bookCoverUrl,
      bookCoverColor: target.bookCoverColor,
      durationSec: target.durationSec,
      pagesRead: target.pagesRead,
      avgWpm: target.avgWpm,
      startChapterNumber: target.startChapterNumber,
      endChapterNumber: target.endChapterNumber,
      startProgressPercent: target.startProgressPercent,
      endProgressPercent: target.endProgressPercent,
      streakDays: target.streakDays,
      note: note.trim() || null,
      photoUrl: localPhotoUrl,
      recentSessions,
      readerName,
      config,
    }).then(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [
    config,
    isOpen,
    localPhotoUrl,
    note,
    readerName,
    recentSessions,
    sessionTitle,
    target,
  ]);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://anzabook.id";
  const shareUrl = buildSharePostUrl({
    origin,
    postType: "session",
    postId: target.sessionId,
    isPosted: localIsPosted,
    bookSlug: target.bookSlug,
  });
  const tempoText = config.showWpm ? shareTempoLabel(target.avgWpm) : null;
  const shareText = buildSessionShareCaption({
    title: sessionTitle.trim() || target.bookTitle,
    bookTitle: target.bookTitle,
    durationSec: config.showDuration ? target.durationSec : 0,
    pagesRead: config.showPages ? target.pagesRead : undefined,
    tempoLabel: tempoText,
    note,
    shareUrl,
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setLocalPhotoUrl(objectUrl);
  };

  const handlePublish = async (nextIsPosted: boolean) => {
    if (!target.sessionId || togglePostMutation.isPending) return;
    setPublishError(null);
    setPublishFeedback(null);

    const safeInAppTemplate = resolveSafeInAppSessionTemplate(config.template);
    const persistedConfig: SessionPostConfig = {
      ...config,
      template: safeInAppTemplate,
    };

    try {
      const result = await togglePostMutation.mutateAsync({
        sessionId: target.sessionId,
        isPosted: nextIsPosted,
        title: sessionTitle.trim() || null,
        note: note.trim() || null,
        postConfig: persistedConfig,
      });
      setLocalIsPosted(result.isPosted);
      onPublishedChange?.({
        id: result.id,
        isPosted: result.isPosted,
        title: result.title,
        note: result.note,
        postConfig: result.postConfig,
      });
      setPublishFeedback(
        result.isPosted
          ? config.template === "photo_overlay"
            ? "Sesi tayang di Feed AnzaBook memakai template Sampul & Jejak (foto perangkatmu tetap siap diunduh)."
            : "Sesi berhasil ditayangkan ke Feed AnzaBook."
          : "Sesi ditarik dari Feed AnzaBook.",
      );
    } catch (err) {
      setPublishError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui publikasi sesi membaca.",
      );
    }
  };

  const previewNode = (
    <CanvasPreviewFrame
      aspect={config.aspect}
      isTransparentBackground={config.template === "transparent_sticker"}
    >
      <canvas
        ref={canvasRef}
        aria-label="Pratinjau kartu sesi membaca 1080p"
        className="block h-full w-full"
      />
    </CanvasPreviewFrame>
  );

  const controlsNode = (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 py-2.5 text-xs text-[var(--color-ink-soft)]">
        <span className="font-mono font-semibold text-[var(--color-ink)]">
          {formatShareDuration(target.durationSec)}
        </span>
        <span aria-hidden="true">·</span>
        <span className="font-mono font-semibold text-[var(--color-ink)]">
          {Math.max(0, Math.round(target.pagesRead))} hlm
        </span>
        {target.avgWpm && target.avgWpm > 0 ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              Ritme {shareTempoLabel(target.avgWpm)} (
              {Math.round(target.avgWpm)} wpm)
            </span>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            Template Kartu
          </span>
          <div className="grid grid-cols-2 gap-2">
            {SESSION_TEMPLATE_OPTIONS.map((tpl) => {
              const active = config.template === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => updateConfig({ template: tpl.id })}
                  className={`flex min-h-11 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                      : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-3)]"
                  }`}
                >
                  <span className="text-xs font-semibold">{tpl.label}</span>
                  <span className="text-[11px] text-[var(--color-ink-muted)]">
                    {tpl.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
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
                      : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-3)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {config.template === "transparent_sticker" ? (
            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                Warna Tinta Stiker
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "light", label: "Tinta Terang" },
                    { id: "dark", label: "Tinta Gelap" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateConfig({ stickerInk: item.id })}
                    className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                      (config.stickerInk ?? "light") === item.id
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                        : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-3)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {config.template === "photo_overlay" ? (
        <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label
                htmlFor={photoInputId}
                className="block text-xs font-semibold text-[var(--color-ink)]"
              >
                Foto Latar Perangkat (Klien-Sisi)
              </label>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Foto diproses langsung di peramban untuk unduhan PNG/Story tanpa
                diunggah ke server.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id={photoInputId}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                <ImagePlus className="h-4 w-4 text-[var(--color-accent)]" />
                <span>{localPhotoUrl ? "Ganti Foto" : "Pilih Foto"}</span>
              </button>
              {localPhotoUrl ? (
                <button
                  type="button"
                  aria-label="Hapus foto latar"
                  onClick={() => setLocalPhotoUrl(null)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={titleInputId}
              className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]"
            >
              Judul Sesi
            </label>
            <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
              {sessionTitle.length}/140
            </span>
          </div>
          <input
            id={titleInputId}
            type="text"
            maxLength={140}
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="Baca Malam · Bumi Manusia"
            className="min-h-11 w-full rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={noteInputId}
              className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]"
            >
              Refleksi Singkat (Opsional)
            </label>
            <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
              {note.length}/500
            </span>
          </div>
          <input
            id={noteInputId}
            type="text"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kesan utama setelah sesi ini..."
            className="min-h-11 w-full rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          Privasi Metrik Kartu
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              { key: "showDuration", label: "Durasi Baca" },
              { key: "showPages", label: "Halaman Standar" },
              { key: "showWpm", label: "Ritme & WPM" },
            ] as const
          ).map((toggle) => (
            <label
              key={toggle.key}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-medium text-[var(--color-ink)]"
            >
              <input
                type="checkbox"
                checked={config[toggle.key]}
                onChange={(e) =>
                  updateConfig({ [toggle.key]: e.target.checked })
                }
                className="h-4 w-4 rounded border-[var(--color-rule)] accent-[var(--color-accent)]"
              />
              <span>{toggle.label}</span>
            </label>
          ))}
        </div>
      </div>

      {target.sessionId ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={togglePostMutation.isPending}
              onClick={() => void handlePublish(true)}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#13110F] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
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
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 py-2.5 text-xs font-semibold text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-paper-3)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
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
        filenamePrefix="sesi"
        filenameTitle={sessionTitle.trim() || target.bookTitle}
        aspect={config.aspect}
        shareTitle={sessionTitle.trim() || target.bookTitle}
        shareText={shareText}
        shareUrl={shareUrl}
      />
    </>
  );

  return (
    <ComposerDialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Bagikan & Post Sesi Baca"
      subtitle={`${target.bookTitle}${target.bookAuthor ? ` · ${target.bookAuthor}` : ""}`}
      preview={previewNode}
      controls={controlsNode}
    />
  );
}
