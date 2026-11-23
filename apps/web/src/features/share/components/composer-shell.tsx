import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Download, Share2, MessageCircle, X } from "lucide-react";
import type { CardAspect } from "@starter/shared/types";
import { buildWhatsAppShareUrl } from "../card-helpers";
import {
  copyTextToClipboard,
  downloadCanvasPng,
  sanitizeShareFilename,
  shareCanvasNative,
} from "../web-share";

type ComposerDialogShellProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  preview: ReactNode;
  controls: ReactNode;
};

export function ComposerDialogShell({
  isOpen,
  onClose,
  title,
  subtitle,
  preview,
  controls,
}: ComposerDialogShellProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      className="m-auto w-[min(1040px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto overflow-x-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-0 text-[var(--color-ink)] shadow-2xl open:flex open:flex-col"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h2
            id={titleId}
            className="truncate font-serif text-lg font-bold tracking-tight text-[var(--color-ink)] sm:text-xl"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="truncate text-xs text-[var(--color-ink-muted)] sm:text-sm">
              {subtitle}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,400px)_1fr]">
        <div className="flex flex-col items-center justify-start rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
          {preview}
        </div>
        <div className="flex min-w-0 flex-col gap-5">{controls}</div>
      </div>
    </dialog>
  );
}

type CanvasPreviewFrameProps = {
  aspect: CardAspect;
  isTransparentBackground?: boolean;
  children: ReactNode;
};

export function CanvasPreviewFrame({
  aspect,
  isTransparentBackground = false,
  children,
}: CanvasPreviewFrameProps) {
  const frameClass =
    aspect === "story"
      ? "w-full max-w-[270px] sm:max-w-[300px] aspect-[9/16]"
      : "w-full max-w-[340px] sm:max-w-[360px] aspect-square";

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div
        className={`relative overflow-hidden rounded-xl border border-[var(--color-rule)] shadow-md ${frameClass}`}
        style={
          isTransparentBackground
            ? {
                backgroundImage:
                  "linear-gradient(45deg, #d8d2c5 25%, transparent 25%), linear-gradient(-45deg, #d8d2c5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8d2c5 75%), linear-gradient(-45deg, transparent 75%, #d8d2c5 75%)",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                backgroundColor: "#efeae0",
              }
            : undefined
        }
      >
        {children}
      </div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {aspect === "story"
          ? "Kanvas 1080 × 1920 px (9:16)"
          : "Kanvas 1080 × 1080 px (1:1)"}
      </p>
    </div>
  );
}

type ComposerShareBarProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  filenamePrefix: string;
  filenameTitle: string;
  aspect: CardAspect;
  shareTitle: string;
  shareText: string;
  shareUrl: string;
};

export function ComposerShareBar({
  canvasRef,
  filenamePrefix,
  filenameTitle,
  aspect,
  shareTitle,
  shareText,
  shareUrl,
}: ComposerShareBarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const showTempFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => {
      setFeedback((prev) => (prev === message ? null : prev));
    }, 3500);
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isExporting) return;
    setIsExporting(true);
    try {
      const filename = sanitizeShareFilename(
        filenamePrefix,
        filenameTitle,
        aspect,
      );
      await downloadCanvasPng(canvas, filename);
      showTempFeedback("PNG 1080p berhasil diunduh.");
    } catch (err) {
      showTempFeedback(
        err instanceof Error ? err.message : "Gagal mengunduh gambar PNG.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isExporting) return;
    setIsExporting(true);
    try {
      const filename = sanitizeShareFilename(
        filenamePrefix,
        filenameTitle,
        aspect,
      );
      const result = await shareCanvasNative({
        canvas,
        filename,
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
      if (result === "shared") {
        showTempFeedback("Kartu berhasil dikirim ke lembar bagikan.");
      } else if (result === "unsupported") {
        await downloadCanvasPng(canvas, filename);
        showTempFeedback(
          "Peramban ini belum mendukung bagikan file langsung; PNG diunduh agar siap diunggah.",
        );
      }
    } catch (err) {
      showTempFeedback(
        err instanceof Error ? err.message : "Gagal membuka bagikan sistem.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      showTempFeedback("Tautan disalin ke papan klip.");
      window.setTimeout(() => setCopied(false), 2200);
    } else {
      showTempFeedback("Tidak dapat mengakses papan klip pada peramban ini.");
    }
  };

  const whatsappHref = buildWhatsAppShareUrl(shareText);

  return (
    <div className="flex flex-col gap-2.5 border-t border-[var(--color-rule)] pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
        Bagikan ke Luar & Ekspor 1080p
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={handleNativeShare}
          disabled={isExporting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-3)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          <Share2 className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
          <span>IG Story / Share</span>
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={isExporting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-3)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>Unduh PNG</span>
        </button>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          <MessageCircle className="h-4 w-4 shrink-0 text-[#15803D]" />
          <span>WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          {copied ? (
            <Check className="h-4 w-4 shrink-0 text-[#15803D]" />
          ) : (
            <Copy className="h-4 w-4 shrink-0" />
          )}
          <span>{copied ? "Tersalin" : "Salin Tautan"}</span>
        </button>
      </div>

      {feedback ? (
        <p
          role="status"
          aria-live="polite"
          className="text-xs font-medium text-[var(--color-ink-soft)]"
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
