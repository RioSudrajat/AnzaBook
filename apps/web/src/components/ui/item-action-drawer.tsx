import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal, MoreVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ItemActionOption = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  variant?: "default" | "destructive";
  disabled?: boolean;
  onSelect: () => void;
};

type ItemActionDrawerProps = {
  ariaLabel: string;
  title?: string;
  items: ItemActionOption[];
  iconVariant?: "vertical" | "horizontal";
  triggerClassName?: string;
};

export function ItemActionDrawer({
  ariaLabel,
  title = "Opsi Tindakan",
  items,
  iconVariant = "vertical",
  triggerClassName,
}: ItemActionDrawerProps) {
  const [open, setOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);
  const menuId = useId();
  const titleId = useId();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Desktop popover close & focus restore
  useEffect(() => {
    if (!open || isMobileViewport) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isMobileViewport]);

  // Mobile native <dialog> bottom sheet lifecycle
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && isMobileViewport) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, isMobileViewport]);

  const closeMenu = () => {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  };

  const handleSelect = (item: ItemActionOption) => {
    if (item.disabled) return;
    setOpen(false);
    item.onSelect();
  };

  const Icon = iconVariant === "horizontal" ? MoreHorizontal : MoreVertical;

  return (
    <div
      className="relative shrink-0"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-transparent text-[var(--color-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] transition-colors cursor-pointer",
          open && "bg-[var(--color-paper-3)] text-[var(--color-ink)]",
          triggerClassName,
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>

      {open && !isMobileViewport && (
        <div
          ref={popoverRef}
          id={menuId}
          role="menu"
          aria-label={title}
          className="absolute right-0 top-full z-[var(--z-dropdown)] mt-1.5 w-60 rounded-xl border border-[var(--color-rule)] bg-[var(--color-sheet)] p-1.5 shadow-[var(--shadow-lift)]"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => handleSelect(item)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-45",
                item.variant === "destructive"
                  ? "text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
                  : "text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]",
              )}
            >
              {item.icon && (
                <span className="mt-0.5 shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-snug">
                  {item.label}
                </span>
                {item.description && (
                  <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-muted)]">
                    {item.description}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(e) => {
          e.preventDefault();
          closeMenu();
        }}
        onPointerDown={(e) => {
          pressedOutsideRef.current = e.target === dialogRef.current;
        }}
        onClick={(e) => {
          if (pressedOutsideRef.current && e.target === dialogRef.current) {
            closeMenu();
          }
          pressedOutsideRef.current = false;
        }}
        className="m-auto mt-auto mb-0 w-full max-w-lg rounded-t-2xl border border-b-0 border-[var(--color-rule)] bg-[var(--color-sheet)] p-0 text-[var(--color-ink)] shadow-[var(--shadow-lift)] backdrop:bg-black/55 backdrop:backdrop-blur-xs overscroll-contain open:block"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] px-4 py-3.5">
          <h3 id={titleId} className="font-serif text-base font-bold">
            {title}
          </h3>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Tutup menu"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] cursor-pointer"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="divide-y divide-[var(--color-rule)] p-2 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => handleSelect(item)}
              className={cn(
                "flex min-h-12 w-full items-start gap-3 rounded-lg px-3.5 py-3 text-left text-sm transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45",
                item.variant === "destructive"
                  ? "text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
                  : "text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]",
              )}
            >
              {item.icon && (
                <span className="mt-0.5 shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{item.label}</span>
                {item.description && (
                  <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                    {item.description}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </dialog>
    </div>
  );
}
