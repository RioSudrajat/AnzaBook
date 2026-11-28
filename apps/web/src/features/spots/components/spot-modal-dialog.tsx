import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type SpotModalDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: "modal" | "drawer";
  dismissMode?: "any" | "closerequest";
  maxWidthClass?: string;
  children: ReactNode;
};

export function SpotModalDialog({
  open,
  onClose,
  title,
  description,
  variant = "modal",
  dismissMode = "any",
  maxWidthClass,
  children,
}: SpotModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onCloseRef.current();
    };

    dialog.addEventListener("close", handleClose);

    // Fallback light-dismiss for browsers without native <dialog closedby="any"> (e.g. Safari).
    const needsLightDismissFallback =
      dismissMode === "any" &&
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype);

    let pressedOutside = false;
    const isOutside = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      pressedOutside = isOutside(event);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (pressedOutside && isOutside(event) && dialog.open) {
        dialog.close();
      }
      pressedOutside = false;
    };

    if (needsLightDismissFallback) {
      dialog.addEventListener("pointerdown", handlePointerDown);
      dialog.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      if (needsLightDismissFallback) {
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      }
    };
  }, [dismissMode]);

  const widthClass =
    maxWidthClass ?? (variant === "drawer" ? "max-w-md" : "max-w-2xl");

  const dialogLayoutClass =
    variant === "drawer"
      ? `ml-auto mr-0 my-0 h-dvh max-h-dvh w-[min(100vw,28rem)] ${widthClass} rounded-none sm:rounded-l-2xl border-l border-border`
      : `m-auto max-h-[min(90dvh,820px)] w-[calc(100vw-1.5rem)] ${widthClass} rounded-2xl border border-border`;

  const closedByProps = { closedby: dismissMode } as Record<string, string>;

  return (
    <dialog
      ref={dialogRef}
      data-lenis-prevent
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      {...closedByProps}
      className={`${dialogLayoutClass} open:flex flex-col bg-card text-card-foreground p-0 shadow-2xl overflow-hidden backdrop:bg-black/60 backdrop:backdrop-blur-[2px]`}
    >
      <header className="shrink-0 flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
        <div className="min-w-0 space-y-1">
          <h1
            id={titleId}
            className="font-serif text-lg sm:text-xl font-bold text-foreground leading-snug"
          >
            {title}
          </h1>
          {description && (
            <p
              id={descriptionId}
              className="text-xs sm:text-sm text-muted-foreground leading-relaxed"
            >
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup dialog"
          className="size-11 shrink-0 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
        {open ? children : null}
      </div>
    </dialog>
  );
}
