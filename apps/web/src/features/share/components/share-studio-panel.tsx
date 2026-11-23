import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import type {
  ReadingSessionDto,
  SessionPostConfig,
  SessionTemplate,
} from "@starter/shared/types";
import {
  buildSessionShareCaption,
  buildSharePostUrl,
  shareTempoLabel,
  suggestSessionTitle,
} from "../card-helpers";
import { renderSessionCardToCanvas } from "../card-renderer";
import { CanvasPreviewFrame, ComposerShareBar } from "./composer-shell";

type ShareStudioPanelProps = {
  userName: string;
  recentSessions?: ReadingSessionDto[];
};

const STUDIO_TEMPLATES: Array<{ id: SessionTemplate; label: string }> = [
  { id: "cover_trail", label: "Sampul & Jejak" },
  { id: "literary_index", label: "Indeks Literasi" },
  { id: "transparent_sticker", label: "Stiker IG Story" },
  { id: "photo_overlay", label: "Foto + Jejak" },
];

export function ShareStudioPanel({
  userName,
  recentSessions = [],
}: ShareStudioPanelProps) {
  const latestSession = recentSessions[0];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputId = useId();

  const [config, setConfig] = useState<SessionPostConfig>({
    template: "cover_trail",
    aspect: "square",
    showWpm: true,
    showDuration: true,
    showPages: true,
    stickerInk: "light",
  });
  const [customTitle, setCustomTitle] = useState("");
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPhotoUrl) {
        URL.revokeObjectURL(localPhotoUrl);
      }
    };
  }, [localPhotoUrl]);

  const fallbackBookTitle = latestSession?.bookTitle?.trim() || "Sesi Membaca";
  const effectiveTitle =
    customTitle.trim() ||
    latestSession?.title?.trim() ||
    suggestSessionTitle(
      fallbackBookTitle,
      latestSession?.createdAt ? new Date(latestSession.createdAt) : new Date(),
    );

  useEffect(() => {
    if (!latestSession) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    void renderSessionCardToCanvas(
      canvas,
      {
        title: effectiveTitle,
        bookTitle: fallbackBookTitle,
        bookCoverUrl: latestSession.bookCoverUrl,
        durationSec: latestSession.durationSeconds,
        pagesRead: latestSession.pagesRead,
        avgWpm: latestSession.avgWpm,
        startChapterNumber: latestSession.startChapterNumber,
        endChapterNumber: latestSession.endChapterNumber,
        startProgressPercent: latestSession.startProgressPercent,
        endProgressPercent: latestSession.endProgressPercent,
        note: latestSession.note,
        photoUrl: localPhotoUrl,
        recentSessions,
        readerName: userName,
        config,
      },
      { isCancelled: () => cancelled },
    );

    return () => {
      cancelled = true;
    };
  }, [
    config,
    effectiveTitle,
    fallbackBookTitle,
    latestSession,
    localPhotoUrl,
    recentSessions,
    userName,
  ]);

  if (!latestSession) {
    return (
      <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6 text-center">
        <p className="font-serif text-base font-semibold text-[var(--color-ink)]">
          Belum ada sesi membaca yang siap dibuat kartu
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Selesaikan minimal satu sesi membaca di reader AnzaBook agar statistik
          nyata muncul di studio ini.
        </p>
      </div>
    );
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://anzabook.id";
  const shareUrl = buildSharePostUrl({
    origin,
    postType: "session",
    postId: latestSession.id,
    isPosted: latestSession.isPosted,
  });
  const shareText = buildSessionShareCaption({
    title: effectiveTitle,
    bookTitle: fallbackBookTitle,
    durationSec: config.showDuration ? latestSession.durationSeconds : null,
    pagesRead: config.showPages ? latestSession.pagesRead : undefined,
    tempoLabel: config.showWpm ? shareTempoLabel(latestSession.avgWpm) : null,
    note: latestSession.note,
    shareUrl,
  });

  return (
    <div className="grid grid-cols-1 gap-6 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div className="flex items-center justify-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
        <CanvasPreviewFrame
          aspect={config.aspect}
          isTransparentBackground={config.template === "transparent_sticker"}
        >
          <canvas
            ref={canvasRef}
            aria-label="Pratinjau kartu studio baca 1080p"
            className="block h-full w-full"
          />
        </CanvasPreviewFrame>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {STUDIO_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() =>
                setConfig((prev) => ({ ...prev, template: tpl.id }))
              }
              className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                config.template === tpl.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]"
              }`}
            >
              {tpl.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "square", label: "1:1 Square" },
              { id: "story", label: "9:16 Story" },
            ] as const
          ).map((ratio) => (
            <button
              key={ratio.id}
              type="button"
              onClick={() =>
                setConfig((prev) => ({ ...prev, aspect: ratio.id }))
              }
              className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                config.aspect === ratio.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]"
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>

        {config.template === "photo_overlay" ? (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setLocalPhotoUrl(URL.createObjectURL(file));
              }}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]"
            >
              <ImagePlus className="h-4 w-4 text-[var(--color-accent)]" />
              <span>
                {localPhotoUrl ? "Ganti Foto Latar" : "Pilih Foto Latar"}
              </span>
            </button>
            {localPhotoUrl ? (
              <button
                type="button"
                aria-label="Hapus foto latar"
                onClick={() => setLocalPhotoUrl(null)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={titleInputId}
            className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]"
          >
            Judul Kartu
          </label>
          <input
            id={titleInputId}
            type="text"
            maxLength={140}
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={effectiveTitle}
            className="min-h-11 w-full rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>

        <ComposerShareBar
          canvasRef={canvasRef}
          filenamePrefix="studio-sesi"
          filenameTitle={effectiveTitle}
          aspect={config.aspect}
          shareTitle={effectiveTitle}
          shareText={shareText}
          shareUrl={shareUrl}
        />
      </div>
    </div>
  );
}
