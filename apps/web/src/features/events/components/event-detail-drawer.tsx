import * as React from "react";
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsRight,
  Copy,
  Check,
  ExternalLink,
  X,
} from "lucide-react";
import type {
  CommunityEventDetailDto,
  CommunityEventSummaryDto,
} from "@starter/shared/types";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useEventDetail } from "../hooks";
import { EventDetailView } from "./event-detail-view";

interface EventDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  event: CommunityEventDetailDto | CommunityEventSummaryDto | null;
  onNextEvent?: () => void;
  onPrevEvent?: () => void;
  hasNextEvent?: boolean;
  hasPrevEvent?: boolean;
}

export function EventDetailDrawer({
  open,
  onClose,
  event: initialEvent,
  onNextEvent,
  onPrevEvent,
  hasNextEvent = false,
  hasPrevEvent = false,
}: EventDetailDrawerProps) {
  useBodyScrollLock(open);

  const [copied, setCopied] = React.useState(false);
  const { data: fullEvent } = useEventDetail(initialEvent?.slug || "");
  const event = fullEvent || initialEvent;

  if (!open || !event) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/events/${event.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop overlay on mobile */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        style={{ overscrollBehavior: "contain" }}
      />

      {/* Slide-over Drawer (matching Luma right drawer) */}
      <aside
        data-lenis-prevent
        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[440px] sm:max-w-[480px] flex-col border-l border-white/10 bg-[#121316] text-white shadow-2xl animate-in slide-in-from-right duration-250 select-none"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Top Header Bar matching Luma: >> | Salin Tautan | Halaman Acara ↗ | ^ v */}
        <div className="flex h-13 shrink-0 items-center justify-between border-b border-white/10 px-4 bg-[#141518]">
          {/* Collapse Button */}
          <button
            type="button"
            onClick={onClose}
            title="Tutup Panel"
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronsRight className="size-4" />
          </button>

          {/* Action buttons: Salin Tautan & Halaman Acara ↗ */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-white/50" />
                  <span>Salin Tautan</span>
                </>
              )}
            </button>

            <a
              href={`/events/${event.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span>Halaman Acara</span>
              <ExternalLink className="size-3 text-white/50" />
            </a>
          </div>

          {/* Up / Down Event Switchers (Luma Screenshot 4) */}
          <div className="flex items-center gap-0.5 border-l border-white/10 pl-2">
            <button
              type="button"
              disabled={!hasPrevEvent}
              onClick={onPrevEvent}
              title="Acara Sebelumnya"
              className="flex size-7 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:pointer-events-none"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              disabled={!hasNextEvent}
              onClick={onNextEvent}
              title="Acara Selanjutnya"
              className="flex size-7 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:pointer-events-none"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Event Content */}
        <div
          data-lenis-prevent
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 scrollbar-thin"
          style={{ overscrollBehavior: "contain" }}
        >
          <EventDetailView event={event} isDrawer={true} />
        </div>
      </aside>
    </>
  );
}
