import * as React from "react";
import { Dialog } from "radix-ui";
import type { CardAspect } from "@starter/shared/types";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/features/share/components/copy-link-button";
import { InstagramIcon } from "@/features/share/components/instagram-icon";
import {
  canCopyPngToClipboard,
  canShareFilesNatively,
  canvasToPngBlob,
  copyPngBlobToClipboard,
  copyTextSilently,
  copyTextToClipboard,
  downloadCanvasPng,
  shareCanvasNative,
  sharePngFileNative,
} from "@/features/share/web-share";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import {
  EVENT_SHARE_TEMPLATES,
  buildEventShareCaption,
  buildEventShareFilename,
  buildEventTelegramUrl,
  buildEventWhatsAppUrl,
  buildEventXUrl,
  type EventShareMode,
  type EventShareSource,
  type EventShareTemplate,
} from "../event-share";
import { eventPagePath, eventShareOrigin } from "../event-share-origin";
import { renderEventShareCard } from "../event-share-renderer";

const ASPECT_OPTIONS: ReadonlyArray<{
  id: CardAspect;
  label: string;
  sizeNote: string;
}> = [
  { id: "story", label: "9:16 Story", sizeNote: "1080 x 1920 px · IG Story" },
  { id: "square", label: "1:1 Feed", sizeNote: "1080 x 1080 px · Persegi" },
  { id: "4:3", label: "4:3 Slide", sizeNote: "1440 x 1080 px · Presentasi" },
];

const noopSubscribe = () => () => {};
const getClientNativeShareSupport = () => canShareFilesNatively();
const getServerNativeShareSupport = () => false;
const getClientClipboardPngSupport = () => canCopyPngToClipboard();
const getServerClipboardPngSupport = () => false;

export type EventShareDialogProps = {
  event: EventShareSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTemplate?: EventShareTemplate;
  defaultAspect?: CardAspect;
  defaultMode?: EventShareMode;
  defaultReaderName?: string | null;
  isUserGoing?: boolean;
};

export function EventShareDialog({
  event,
  open,
  onOpenChange,
  defaultTemplate,
  defaultAspect = "story",
  defaultMode,
  defaultReaderName,
  isUserGoing = false,
}: EventShareDialogProps) {
  useBodyScrollLock(open);

  const sessionKey = `${event.slug}:${defaultTemplate ?? ""}:${defaultAspect}:${defaultMode ?? ""}:${isUserGoing ? "1" : "0"}:${defaultReaderName ?? ""}`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {open && (
        <EventShareDialogContent
          key={sessionKey}
          event={event}
          defaultTemplate={defaultTemplate}
          defaultAspect={defaultAspect}
          defaultMode={defaultMode}
          defaultReaderName={defaultReaderName}
          isUserGoing={isUserGoing}
        />
      )}
    </Dialog.Root>
  );
}

type EventShareDialogContentProps = {
  event: EventShareSource;
  defaultTemplate?: EventShareTemplate;
  defaultAspect: CardAspect;
  defaultMode?: EventShareMode;
  defaultReaderName?: string | null;
  isUserGoing: boolean;
};

function EventShareDialogContent({
  event,
  defaultTemplate,
  defaultAspect,
  defaultMode,
  defaultReaderName,
  isUserGoing,
}: EventShareDialogContentProps) {
  const initialMode: EventShareMode =
    defaultMode ?? (isUserGoing ? "attending" : "invite");
  const initialTemplate: EventShareTemplate =
    defaultTemplate ?? (isUserGoing ? "attending_pass" : "invitation_poster");

  const [template, setTemplate] =
    React.useState<EventShareTemplate>(initialTemplate);
  const [aspect, setAspect] = React.useState<CardAspect>(defaultAspect);
  const [mode, setMode] = React.useState<EventShareMode>(initialMode);
  const [readerName, setReaderName] = React.useState(
    defaultReaderName?.trim() || "",
  );
  const [isRendering, setIsRendering] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [showInstagramGuide, setShowInstagramGuide] = React.useState(false);
  const [copiedCaption, setCopiedCaption] = React.useState(false);
  const [copiedImage, setCopiedImage] = React.useState(false);
  const [feedback, setFeedback] = React.useState("");

  const supportsNativeFiles = React.useSyncExternalStore(
    noopSubscribe,
    getClientNativeShareSupport,
    getServerNativeShareSupport,
  );

  const supportsClipboardPng = React.useSyncExternalStore(
    noopSubscribe,
    getClientClipboardPngSupport,
    getServerClipboardPngSupport,
  );

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const prebakedRef = React.useRef<{
    key: string;
    blob: Blob;
    file: File;
  } | null>(null);
  const nameInputId = React.useId();
  const captionBoxId = React.useId();

  const origin = React.useMemo(() => {
    try {
      return eventShareOrigin();
    } catch {
      return "https://anzabook.id";
    }
  }, []);

  const shareUrl = React.useMemo(
    () => new URL(eventPagePath(event.slug), origin).href,
    [event.slug, origin],
  );

  const hostLabel = React.useMemo(() => {
    try {
      return new URL(origin).host;
    } catch {
      return "anzabook.id";
    }
  }, [origin]);

  const caption = React.useMemo(
    () =>
      buildEventShareCaption(event, shareUrl, {
        mode,
        readerName,
      }),
    [event, shareUrl, mode, readerName],
  );

  const whatsappUrl = React.useMemo(
    () => buildEventWhatsAppUrl(caption),
    [caption],
  );

  const telegramUrl = React.useMemo(
    () =>
      buildEventTelegramUrl(shareUrl, `${event.title} · ${event.calendarName}`),
    [shareUrl, event.title, event.calendarName],
  );

  const xUrl = React.useMemo(
    () =>
      buildEventXUrl(
        shareUrl,
        mode === "attending"
          ? `Saya akan hadir di "${event.title}" (${event.calendarName}) di AnzaBook.`
          : `Agenda "${event.title}" oleh ${event.calendarName} di AnzaBook.`,
      ),
    [shareUrl, mode, event.title, event.calendarName],
  );

  const filename = React.useMemo(
    () => buildEventShareFilename(event.slug, template, aspect),
    [event.slug, template, aspect],
  );

  const renderKey = `${event.slug}:${template}:${aspect}:${mode}:${readerName}:${filename}`;

  React.useEffect(() => {
    let cancelled = false;
    prebakedRef.current = null;

    const frameId = window.requestAnimationFrame(() => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        setIsRendering(false);
        return;
      }
      setIsRendering(true);
      void renderEventShareCard(
        canvas,
        {
          event,
          template,
          aspect,
          mode,
          readerName,
          shareHostLabel: hostLabel,
        },
        {
          isCancelled: () => cancelled,
        },
      )
        .then(async (rendered) => {
          if (!rendered || cancelled) return;
          try {
            const blob = await canvasToPngBlob(canvas);
            if (cancelled) return;
            const file = new File([blob], filename, { type: "image/png" });
            prebakedRef.current = { key: renderKey, blob, file };
          } catch {
            // Fall back to on-demand canvas export when triggered.
          }
        })
        .catch(() => {
          if (!cancelled) {
            setFeedback("Pratinjau kanvas gagal dimuat. Coba ulangi lagi.");
          }
        })
        .finally(() => {
          if (!cancelled) setIsRendering(false);
        });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [
    event,
    template,
    aspect,
    mode,
    readerName,
    hostLabel,
    filename,
    renderKey,
  ]);

  const ensureReadyCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error("Kanvas kartu tidak tersedia.");
    }
    if (isRendering) {
      await renderEventShareCard(canvas, {
        event,
        template,
        aspect,
        mode,
        readerName,
        shareHostLabel: hostLabel,
      });
    }
    return canvas;
  };

  const handleInstagramStory = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      if (supportsNativeFiles) {
        // Keep clipboard sync non-blocking and invoke share synchronously from click
        // whenever the PNG file is pre-baked so mobile browsers retain user activation.
        copyTextSilently(shareUrl);
        const prebaked =
          prebakedRef.current?.key === renderKey ? prebakedRef.current : null;
        const result = prebaked
          ? await sharePngFileNative(prebaked.file)
          : await shareCanvasNative({
              canvas: await ensureReadyCanvas(),
              filename,
              title: event.title,
              text: caption,
              url: shareUrl,
            });
        if (result === "shared") {
          setShowInstagramGuide(false);
          setFeedback(
            "Poster dikirim ke lembar bagikan dan tautan acara otomatis disalin. Di IG Story, tinggal tempel pada Stiker Tautan.",
          );
          return;
        }
        if (result === "cancelled") {
          return;
        }
      }

      const canvas = await ensureReadyCanvas();
      await downloadCanvasPng(canvas, filename);
      setShowInstagramGuide(true);
      setFeedback(
        "Poster PNG 1080p sudah diunduh. Unggah lewat Instagram Story lalu tempel tautan acara pada stiker.",
      );
    } catch {
      setFeedback("Gagal menyiapkan gambar agenda untuk Instagram. Coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeImageShare = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const prebaked =
        prebakedRef.current?.key === renderKey ? prebakedRef.current : null;
      const result = prebaked
        ? await sharePngFileNative(prebaked.file)
        : await shareCanvasNative({
            canvas: await ensureReadyCanvas(),
            filename,
            title: event.title,
            text: caption,
            url: shareUrl,
          });
      if (result === "shared") {
        setFeedback(
          "Poster kartu dikirim ke aplikasi pilihanmu tanpa unduh file.",
        );
      } else if (result === "unsupported") {
        const canvas = await ensureReadyCanvas();
        await downloadCanvasPng(canvas, filename);
        setFeedback(
          "Perangkat tidak mendukung bagikan file langsung; PNG diunduh.",
        );
      }
    } catch {
      setFeedback("Gagal membagikan file gambar agenda.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyPosterImage = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const prebaked =
        prebakedRef.current?.key === renderKey ? prebakedRef.current : null;
      const blob = prebaked
        ? prebaked.blob
        : await canvasToPngBlob(await ensureReadyCanvas());
      const ok = await copyPngBlobToClipboard(blob);
      if (ok) {
        setCopiedImage(true);
        setFeedback(
          "Poster PNG disalin ke clipboard. Langsung tempel di WhatsApp Web, Telegram Desktop, atau X tanpa unduh file.",
        );
        window.setTimeout(() => setCopiedImage(false), 2400);
      } else {
        setFeedback(
          "Browser belum mengizinkan salin gambar ke clipboard. Gunakan Unduh PNG.",
        );
      }
    } catch {
      setFeedback("Gagal menyalin poster ke clipboard.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPng = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setShowInstagramGuide(false);
    try {
      const canvas = await ensureReadyCanvas();
      await downloadCanvasPng(canvas, filename);
      setFeedback(`Kartu PNG (${filename}) berhasil diunduh.`);
    } catch {
      setFeedback("Gagal mengunduh gambar kartu. Coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyCaption = async () => {
    const ok = await copyTextToClipboard(caption);
    if (ok) {
      setCopiedCaption(true);
      setFeedback("Teks undangan WhatsApp disalin.");
      window.setTimeout(() => setCopiedCaption(false), 2200);
    } else {
      setFeedback("Gagal menyalin teks undangan.");
    }
  };

  const activeAspectMeta =
    ASPECT_OPTIONS.find((item) => item.id === aspect) ?? ASPECT_OPTIONS[0];

  const previewFrameClass =
    aspect === "story"
      ? "aspect-[9/16] max-h-[380px] sm:max-h-[450px] w-auto"
      : aspect === "4:3"
        ? "aspect-[4/3] w-full max-w-[420px]"
        : "aspect-square w-full max-w-[360px]";

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs" />
      <Dialog.Content
        data-lenis-prevent
        style={{ overscrollBehavior: "contain" }}
        className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-4">
          <div className="min-w-0">
            <Dialog.Title className="font-serif text-lg sm:text-xl font-bold text-foreground truncate">
              Studio Bagikan Agenda
            </Dialog.Title>
            <Dialog.Description className="text-xs text-muted-foreground mt-0.5 truncate">
              Pilih template kartu visual siap unggah ke Instagram Story atau
              kirim langsung lewat WhatsApp.
            </Dialog.Description>
          </div>
          <Dialog.Close asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 rounded-xl"
              aria-label="Tutup studio bagikan agenda"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </Dialog.Close>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="flex flex-col items-center justify-center gap-3 border-b lg:border-b-0 lg:border-r border-border bg-muted/50 p-5 sm:p-6">
            <div className="relative flex items-center justify-center w-full">
              <canvas
                ref={canvasRef}
                aria-label={`Pratinjau kartu agenda ${event.title}`}
                className={`${previewFrameClass} rounded-xl border border-border bg-background shadow-md object-contain`}
              />
              {isRendering && (
                <div
                  aria-live="polite"
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/55 backdrop-blur-xs"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-sm">
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Merender kartu...</span>
                  </div>
                </div>
              )}
            </div>

            <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {activeAspectMeta.sizeNote}
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-foreground">
                Gaya Kartu
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {EVENT_SHARE_TEMPLATES.map((item) => {
                  const active = template === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTemplate(item.id)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                        active
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      <div className="text-xs font-semibold text-foreground">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {item.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-foreground">
                  Rasio Gambar
                </div>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-muted/60 p-1">
                  {ASPECT_OPTIONS.map((opt) => {
                    const active = aspect === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setAspect(opt.id)}
                        className={`min-h-11 rounded-lg px-2 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                          active
                            ? "bg-card text-foreground font-semibold shadow-xs border border-border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-foreground">
                  Mode Konten
                </div>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-muted/60 p-1">
                  <button
                    type="button"
                    aria-pressed={mode === "invite"}
                    onClick={() => setMode("invite")}
                    className={`min-h-11 rounded-lg px-2 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                      mode === "invite"
                        ? "bg-card text-foreground font-semibold shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Undangan Umum
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === "attending"}
                    onClick={() => setMode("attending")}
                    className={`min-h-11 rounded-lg px-2 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                      mode === "attending"
                        ? "bg-card text-foreground font-semibold shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Saya Akan Hadir
                  </button>
                </div>
              </div>
            </div>

            {mode === "attending" && (
              <div className="space-y-1.5">
                <label
                  htmlFor={nameInputId}
                  className="block text-xs font-semibold text-foreground"
                >
                  Nama Tampilan di Kartu
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  maxLength={48}
                  value={readerName}
                  onChange={(e) => setReaderName(e.target.value)}
                  placeholder="Contoh: Raka Alpiansyah"
                  className="min-h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  disabled={isExporting}
                  onClick={() => void handleInstagramStory()}
                  className="min-h-11 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 font-semibold text-xs px-4"
                >
                  {isExporting ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <InstagramIcon className="size-4" aria-hidden="true" />
                  )}
                  <span>Bagikan ke IG Story</span>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="min-h-11 rounded-xl font-semibold text-xs px-4"
                >
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle
                      className="size-4 text-emerald-700 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <span>Kirim ke WhatsApp</span>
                    <ExternalLink
                      className="size-3.5 ml-auto text-muted-foreground"
                      aria-hidden="true"
                    />
                  </a>
                </Button>
              </div>

              {supportsNativeFiles && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isExporting}
                    onClick={() => void handleNativeImageShare()}
                    className="w-full min-h-11 rounded-xl text-xs font-medium"
                  >
                    <Share2 className="size-4" aria-hidden="true" />
                    <span>Kirim Poster ke WA Status / Aplikasi Lain</span>
                  </Button>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Di HP: poster dikirim langsung tanpa unduh file, dan tautan
                    acara otomatis disalin untuk Stiker Tautan.
                  </p>
                </div>
              )}

              {showInstagramGuide && (
                <div className="rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] p-3.5 space-y-2.5 text-xs text-foreground">
                  <div className="font-semibold">
                    Panduan Cepat IG Story (Desktop)
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Poster PNG sudah diunduh otomatis. Unggah gambar ini di
                    Instagram, lalu tempel tautan acara pada stiker Tautan.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href="https://www.instagram.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3.5 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      <span>Buka Instagram</span>
                    </a>
                    <CopyLinkButton
                      url={shareUrl}
                      label="Salin Tautan untuk Stiker"
                      copiedLabel="Tautan Tersalin"
                      className="text-xs rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div
                className={`grid grid-cols-2 gap-2 ${
                  supportsClipboardPng ? "sm:grid-cols-3" : "sm:grid-cols-4"
                }`}
              >
                {supportsClipboardPng && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isExporting}
                    onClick={() => void handleCopyPosterImage()}
                    className="min-h-11 rounded-xl text-xs px-2.5 whitespace-nowrap"
                  >
                    {copiedImage ? (
                      <>
                        <Check
                          className="size-3.5 shrink-0 text-emerald-700 dark:text-emerald-400"
                          aria-hidden="true"
                        />
                        <span>Poster Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy
                          className="size-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>Salin Poster</span>
                      </>
                    )}
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  disabled={isExporting}
                  onClick={() => void handleDownloadPng()}
                  className="min-h-11 rounded-xl text-xs px-2.5 whitespace-nowrap"
                >
                  <Download className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>Unduh PNG</span>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="min-h-11 rounded-xl text-xs px-2.5 whitespace-nowrap"
                >
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Send className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>Telegram</span>
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="min-h-11 rounded-xl text-xs px-2.5 whitespace-nowrap"
                >
                  <a href={xUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink
                      className="size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>X / Twitter</span>
                  </a>
                </Button>

                <CopyLinkButton
                  url={shareUrl}
                  label="Salin Tautan"
                  copiedLabel="Tersalin"
                  className="w-full rounded-xl text-xs px-2.5 whitespace-nowrap"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={captionBoxId}
                  className="text-xs font-semibold text-foreground"
                >
                  Pratinjau Teks Undangan WhatsApp
                </label>
                <button
                  type="button"
                  onClick={() => void handleCopyCaption()}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[var(--color-accent-text)] hover:bg-muted cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {copiedCaption ? (
                    <>
                      <Check className="size-3.5" aria-hidden="true" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" aria-hidden="true" />
                      <span>Salin Teks</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                id={captionBoxId}
                readOnly
                rows={4}
                value={caption}
                className="w-full rounded-xl border border-input bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
            </div>

            {feedback && (
              <p
                role="status"
                aria-live="polite"
                className="rounded-xl border border-border bg-muted/60 px-3.5 py-2.5 text-xs font-medium text-foreground"
              >
                {feedback}
              </p>
            )}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
