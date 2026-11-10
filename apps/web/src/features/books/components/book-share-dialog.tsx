import { useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Copy, ExternalLink, MessageCircle, Send, X } from "lucide-react";
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
          {typeof navigator.share === "function" && (
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
