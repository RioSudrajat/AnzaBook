import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Send, Share2, X } from "lucide-react";
import { XTwitterIcon } from "@/components/profile/social-icons";
import { isUsableAssetUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

export type ProfileShareEntityType =
  "user" | "author" | "publisher" | "community";

export type ProfileShareDialogProps = {
  open: boolean;
  onClose: () => void;
  entityType: ProfileShareEntityType;
  name: string;
  handle: string;
  avatarUrl?: string | null;
  sharePath: string;
  affiliateSlug?: string | null;
};

const ENTITY_LABEL: Record<ProfileShareEntityType, string> = {
  user: "Profil Pembaca",
  author: "Penulis Resmi",
  publisher: "Mitra Penerbit",
  community: "Komunitas Literasi",
};

function cleanHandleText(raw: string): string {
  return raw.replace(/^\/?[pcu]\//i, "").replace(/^@+/, "");
}

export function ProfileShareDialog({
  open,
  onClose,
  entityType,
  name,
  handle,
  avatarUrl,
  sharePath,
  affiliateSlug,
}: ProfileShareDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleId = useId();

  const [includeAffiliate, setIncludeAffiliate] = useState(true);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const cleanHandle = cleanHandleText(handle);
  const displayHandle = cleanHandle ? `@${cleanHandle}` : "";
  const isCircular = entityType === "user" || entityType === "author";
  const showAvatar = isUsableAssetUrl(avatarUrl) && failedAvatar !== avatarUrl;
  const initial = (name || "A").slice(0, 1).toUpperCase();

  const fullShareUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://anzabook.id";
    const normalizedPath = sharePath.startsWith("/")
      ? sharePath
      : `/${sharePath}`;
    const url = new URL(normalizedPath, origin);
    if (entityType === "community" && affiliateSlug && includeAffiliate) {
      url.searchParams.set("ref", `cal_${affiliateSlug}`);
    }
    return url.toString();
  }, [affiliateSlug, entityType, includeAffiliate, sharePath]);

  const shareText = useMemo(() => {
    switch (entityType) {
      case "author":
        return `Baca karya dan catatan ${name} (${displayHandle}) di AnzaBook`;
      case "publisher":
        return `Jelajahi katalog buku ${name} di AnzaBook`;
      case "community":
        return `Ikuti agenda literasi dan diskusi bersama ${name} di AnzaBook`;
      default:
        return `Lihat rak bacaan dan catatan ${name} di AnzaBook`;
    }
  }, [displayHandle, entityType, name]);

  const handleCopyLink = async () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    try {
      await navigator.clipboard.writeText(fullShareUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    copyTimerRef.current = setTimeout(() => {
      setCopyStatus("idle");
    }, 2200);
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: `${name} — AnzaBook`,
        text: shareText,
        url: fullShareUrl,
      });
    } catch {
      // User dismissed native share sheet.
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${fullShareUrl}`)}`;
  const xHref = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullShareUrl)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(fullShareUrl)}&text=${encodeURIComponent(shareText)}`;

  const isOutsideDialog = (e: React.PointerEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return false;
    const rect = dialog.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as Record<string, string>)}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onPointerDown={(e) => {
        pressedOutsideRef.current =
          e.target === dialogRef.current && isOutsideDialog(e);
      }}
      onPointerUp={(e) => {
        if (
          pressedOutsideRef.current &&
          e.target === dialogRef.current &&
          isOutsideDialog(e)
        ) {
          onClose();
        }
        pressedOutsideRef.current = false;
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[var(--color-rule)] bg-[var(--color-sheet)] p-0 text-[var(--color-ink)] shadow-[var(--shadow-lift)] backdrop:bg-black/55 backdrop:backdrop-blur-xs overscroll-contain"
    >
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center overflow-hidden border border-[var(--color-rule)] bg-[var(--color-paper-2)] font-serif text-lg font-bold text-[var(--color-ink)]",
                isCircular ? "rounded-full" : "rounded-xl",
              )}
            >
              {showAvatar ? (
                <img
                  src={avatarUrl!}
                  alt={name}
                  onError={() => setFailedAvatar(avatarUrl ?? null)}
                  className={cn(
                    "size-full",
                    entityType === "publisher"
                      ? "object-contain p-1"
                      : "object-cover",
                  )}
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--color-muted)]">
                {ENTITY_LABEL[entityType]}
              </p>
              <h2
                id={titleId}
                className="font-serif text-lg font-bold leading-snug truncate text-[var(--color-ink)]"
              >
                Bagikan {name}
              </h2>
              {displayHandle && (
                <p className="font-mono text-xs text-[var(--color-muted)] truncate">
                  {displayHandle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog bagikan"
            className="inline-flex min-h-11 min-w-11 -mr-2 -mt-2 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] cursor-pointer"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {entityType === "community" && affiliateSlug && (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3 text-xs">
            <input
              type="checkbox"
              checked={includeAffiliate}
              onChange={(e) => setIncludeAffiliate(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)] cursor-pointer"
            />
            <span className="space-y-0.5">
              <span className="block font-semibold text-[var(--color-ink)]">
                Sertakan tautan kas komunitas 10%
              </span>
              <span className="block text-[var(--color-muted)] leading-relaxed">
                Transaksi buku atau langganan dari tautan ini otomatis mendukung
                kas komunitas.
              </span>
            </span>
          </label>
        )}

        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
            Tautan Profil
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-2 pl-3">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--color-ink-2)]">
              {fullShareUrl}
            </span>
            <button
              type="button"
              autoFocus
              onClick={() => void handleCopyLink()}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
                copyStatus === "copied"
                  ? "border-[var(--color-green)]/50 bg-[var(--color-green-soft)] text-[var(--color-ink)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]",
              )}
            >
              {copyStatus === "copied" ? (
                <>
                  <Check
                    className="size-3.5 text-[var(--color-green)]"
                    aria-hidden="true"
                  />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden="true" />
                  <span>Salin Tautan</span>
                </>
              )}
            </button>
          </div>
          <p
            role="status"
            aria-live="polite"
            className="min-h-4 text-[11px] font-mono text-[var(--color-muted)]"
          >
            {copyStatus === "copied"
              ? "Tautan berhasil disalin ke papan klip."
              : copyStatus === "error"
                ? "Gagal menyalin otomatis. Salin tautan secara manual di atas."
                : ""}
          </p>
        </div>

        <div className="space-y-2.5">
          {canNativeShare && (
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95 transition-[filter] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] cursor-pointer"
            >
              <Share2 className="size-4" aria-hidden="true" />
              <span>Bagikan lewat Perangkat</span>
            </button>
          )}

          <div className="grid grid-cols-3 gap-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              <MessageCircle className="size-3.5" aria-hidden="true" />
              <span>WhatsApp</span>
            </a>

            <a
              href={xHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              <XTwitterIcon className="size-3.5" />
              <span>X</span>
            </a>

            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              <Send className="size-3.5" aria-hidden="true" />
              <span>Telegram</span>
            </a>
          </div>
        </div>
      </div>
    </dialog>
  );
}
