import { useEffect, useId, useRef } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmDeleteDialogProps = {
  open: boolean;
  title: string;
  description: string;
  warningNote?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmDeleteDialog({
  open,
  title,
  description,
  warningNote,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  isPending = false,
  errorMessage,
  onConfirm,
  onClose,
}: ConfirmDeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault();
        if (!isPending) onClose();
      }}
      onPointerDown={(e) => {
        pressedOutsideRef.current = e.target === dialogRef.current;
      }}
      onClick={(e) => {
        if (
          pressedOutsideRef.current &&
          e.target === dialogRef.current &&
          !isPending
        ) {
          onClose();
        }
        pressedOutsideRef.current = false;
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[var(--color-rule)] bg-[var(--color-sheet)] p-0 text-[var(--color-ink)] shadow-[var(--shadow-lift)] backdrop:bg-black/60 backdrop:backdrop-blur-xs overscroll-contain"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-error-soft)] text-[var(--color-error)]">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </div>
            <h2
              id={titleId}
              className="font-serif text-lg font-bold leading-snug"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            aria-label="Tutup dialog konfirmasi"
            className="inline-flex min-h-11 min-w-11 -mr-2 -mt-2 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] cursor-pointer disabled:opacity-45"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <p
          id={descId}
          className="mt-3 text-sm leading-relaxed text-[var(--color-ink-2)]"
        >
          {description}
        </p>

        {warningNote && (
          <div className="mt-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--color-ink-2)]">
            {warningNote}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error-soft)] px-3.5 py-2.5 text-xs text-[var(--color-error)]"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={onClose}
            autoFocus
            className="min-h-11 border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] cursor-pointer"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              void onConfirm();
            }}
            className="min-h-11 bg-[var(--color-error)] text-white hover:brightness-95 gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Memproses...
              </>
            ) : (
              <>
                <Trash2 className="size-4" aria-hidden="true" />
                {confirmLabel}
              </>
            )}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
