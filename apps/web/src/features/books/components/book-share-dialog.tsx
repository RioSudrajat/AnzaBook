import { useRef, useState } from "react";
import { Dialog } from "radix-ui";
import {
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { InstagramIcon } from "@/features/share/components/instagram-icon";
import { Button } from "@/components/ui/button";
import { bookPreviewPath } from "@/features/books/book-share";

export function BookShareDialog({
  title,
  slug,
  url,
  trigger,
  onClose,
}: {
  title: string;
  slug: string;
  url: string;
  trigger: HTMLButtonElement;
  onClose: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [showInstagramGuide, setShowInstagramGuide] = useState(false);
  const link = encodeURIComponent(url);
  const targets = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${link}`,
      Icon: MessageCircle,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${link}`,
      Icon: Send,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${link}`,
    },
    { label: "X", href: `https://x.com/intent/post?url=${link}` },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback("Tautan disalin.");
    } catch {
      input.current?.focus();
      input.current?.select();
      setFeedback("Salin tautan dari kolom yang dipilih.");
    }
  }

  async function fetchBookCardFile(): Promise<{
    blob: Blob;
    file: File;
    filename: string;
  }> {
    const response = await fetch(bookPreviewPath(slug));
    if (!response.ok) {
      throw new Error("Gagal menyiapkan kartu gambar buku.");
    }
    const blob = await response.blob();
    const filename = `anzabook-buku-${slug}.png`;
    const file = new File([blob], filename, { type: "image/png" });
    return { blob, file, filename };
  }

  function triggerBlobDownload(blob: Blob, filename: string) {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  }

  async function shareToInstagram() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { blob, file, filename } = await fetchBookCardFile();
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          // Image-only payload keeps Instagram Stories visible in mobile OS share sheets.
          await navigator.share({
            files: [file],
          });
          setShowInstagramGuide(false);
          setFeedback("Kartu buku dikirim ke lembar bagikan sistem.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        }
      }
      triggerBlobDownload(blob, filename);
      setShowInstagramGuide(true);
      setFeedback(
        "Kartu PNG buku sudah diunduh. Di desktop, browser tidak bisa membuka editor IG Story secara langsung — unggah lewat Instagram atau buka di HP untuk kirim langsung ke IG Story.",
      );
    } catch {
      setFeedback("Gagal menyiapkan gambar buku untuk Instagram. Coba lagi.");
    } finally {
      setIsExporting(false);
    }
  }

  async function downloadBookCard() {
    if (isExporting) return;
    setIsExporting(true);
    setShowInstagramGuide(false);
    try {
      const { blob, filename } = await fetchBookCardFile();
      triggerBlobDownload(blob, filename);
      setFeedback("Kartu gambar buku berhasil diunduh.");
    } catch {
      setFeedback("Gagal mengunduh gambar buku. Coba lagi.");
    } finally {
      setIsExporting(false);
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ title, url });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setFeedback("Pilih aplikasi di atas atau salin tautannya.");
      }
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--book-cover-shade)]" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.focus();
          }}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <Dialog.Title className="font-serif text-xl font-semibold">
              Bagikan buku
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Tutup dialog bagikan buku"
              >
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Bagikan halaman katalog {title} beserta pratinjau sampulnya.
          </Dialog.Description>
          <img
            src={bookPreviewPath(slug)}
            alt={`Pratinjau tautan ${title}`}
            width={1200}
            height={630}
            className="aspect-[40/21] w-full rounded-sm border border-border bg-muted object-cover"
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="default"
              disabled={isExporting}
              onClick={() => void shareToInstagram()}
              className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 font-semibold"
            >
              {isExporting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <InstagramIcon aria-hidden="true" />
              )}
              <span>IG Story</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isExporting}
              onClick={() => void downloadBookCard()}
              className="min-h-11"
            >
              <Download aria-hidden="true" />
              <span>Unduh PNG</span>
            </Button>
          </div>

          {showInstagramGuide && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-accent)]/35 bg-muted/50 px-3 py-2.5 text-xs text-foreground/90">
              <span className="min-w-0 flex-1">
                PNG kartu buku sudah diunduh. Unggah ke Story lewat Instagram
                atau buka dari HP untuk kirim langsung ke IG Story.
              </span>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span>Buka Instagram</span>
              </a>
            </div>
          )}

          <div className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {targets.map(({ label, href, Icon }) => (
              <Button
                key={label}
                asChild
                variant="outline"
                className="min-h-11 px-2"
              >
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {Icon && <Icon aria-hidden="true" />}
                  {label}
                </a>
              </Button>
            ))}
          </div>
          <label
            htmlFor="share-book-url"
            className="mb-2 block text-sm font-medium"
          >
            Tautan buku
          </label>
          <div className="flex gap-2">
            <input
              ref={input}
              id="share-book-url"
              value={url}
              readOnly
              className="min-h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              aria-label="Salin tautan buku"
              onClick={() => void copyLink()}
            >
              <Copy />
            </Button>
          </div>
          {typeof navigator !== "undefined" &&
            typeof navigator.share === "function" && (
              <Button
                variant="ghost"
                className="mt-2 min-h-11"
                onClick={() => void shareLink()}
              >
                <ExternalLink />
                Aplikasi lain
              </Button>
            )}
          {feedback && (
            <p role="status" className="mt-2 text-sm text-muted-foreground">
              {feedback}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
