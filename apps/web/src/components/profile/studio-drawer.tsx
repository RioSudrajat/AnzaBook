import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StudioDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  titleId: string;
  widthClass?: string;
  isDirty?: boolean;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Right-edge native `<dialog>` slide-over drawer obeying `modern-web-guidance: dialog`:
 * - Top-layer modal via `showModal()` (no manual `role="dialog"` or `aria-modal`)
 * - Preserves background context for list/editor workflows
 * - Dirty-state unsaved-changes guard on `cancel` / backdrop / close button
 * - Non-shifting reserved inline confirmation strip with `aria-describedby`
 */
export function StudioDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  titleId,
  widthClass = "w-[min(100vw,44rem)]",
  isDirty = false,
  children,
  footer,
}: StudioDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const discardButtonRef = useRef<HTMLButtonElement>(null);
  const pressedOutsideRef = useRef(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const confirmMessageId = useId();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen && !el.open) {
      el.showModal();
    } else if (!isOpen && el.open) {
      el.close();
    }
  }, [isOpen]);

  const requestCloseDrawer = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      queueMicrotask(() => {
        discardButtonRef.current?.focus();
      });
      return;
    }
    setShowDiscardConfirm(false);
    onClose();
  };

  const isPointerOutsideDialog = (
    e: React.PointerEvent<HTMLDialogElement>,
    el: HTMLDialogElement,
  ) => {
    const rect = el.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (isDirty) {
          e.preventDefault();
          requestCloseDrawer();
        }
      }}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = "";
        setShowDiscardConfirm(false);
        if (isOpen) onClose();
      }}
      onPointerDown={(e) => {
        const el = dialogRef.current;
        if (!el) return;
        pressedOutsideRef.current = isPointerOutsideDialog(e, el);
      }}
      onPointerUp={(e) => {
        const el = dialogRef.current;
        if (!el) return;
        const releasedOutside = isPointerOutsideDialog(e, el);
        if (pressedOutsideRef.current && releasedOutside) {
          pressedOutsideRef.current = false;
          requestCloseDrawer();
        }
        pressedOutsideRef.current = false;
      }}
      className={cn(
        "m-0 ml-auto h-[100svh] max-h-[100svh] max-w-none overflow-hidden rounded-none sm:rounded-l-2xl border-l border-[var(--color-rule)] bg-[var(--color-paper-2)] p-0 text-[var(--color-ink)] shadow-2xl backdrop:bg-black/60",
        widthClass,
      )}
    >
      {isOpen && (
        <div className="flex h-full flex-col overflow-hidden">
          {/* Sticky Header */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] px-5 py-4 sm:px-7">
            <div className="min-w-0 space-y-1">
              <h1
                id={titleId}
                className="font-serif text-lg sm:text-xl font-bold text-[var(--color-ink)]"
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={requestCloseDrawer}
              aria-label={`Tutup ${title}`}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          {/* Unsaved Changes Confirmation Strip (only occupies layout when triggered cleanly above scroll body) */}
          {showDiscardConfirm && (
            <div
              role="alert"
              className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] px-5 py-3 text-xs sm:px-7"
            >
              <span id={confirmMessageId} className="font-medium">
                Perubahan belum disimpan. Tutup panel ini tanpa menyimpan?
              </span>
              <div className="flex items-center gap-2">
                <Button
                  ref={discardButtonRef}
                  type="button"
                  variant="outline"
                  aria-describedby={confirmMessageId}
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="min-h-10 px-3 text-xs border-[var(--color-error)]/40 text-[var(--color-error)] hover:bg-[var(--color-error-soft)] cursor-pointer"
                >
                  Buang perubahan
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="min-h-10 px-3 text-xs font-semibold bg-[var(--color-ink)] text-[var(--color-paper)] cursor-pointer"
                >
                  Tetap menyunting
                </Button>
              </div>
            </div>
          )}

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
            {children}
          </div>

          {/* Sticky Footer */}
          {footer && (
            <div className="shrink-0 border-t border-[var(--color-rule)] bg-[var(--color-paper-2)] px-5 py-3.5 sm:px-7">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
