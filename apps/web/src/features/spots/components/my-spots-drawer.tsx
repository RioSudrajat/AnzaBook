import { useState } from "react";
import { Bookmark, MapPin, Plus, Send, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMySpotActivity, useToggleSpotBookmark } from "../hooks";
import {
  SPOT_STATUS_META,
  formatSpotApiError,
  formatSpotCategory,
} from "../spots-helpers";
import type { SpotStatus } from "../types";
import { SpotModalDialog } from "./spot-modal-dialog";

type MySpotsDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSelectSpot: (slug: string) => void;
  onOpenSubmitDialog: () => void;
};

type DrawerTab = "submissions" | "bookmarks";

function getStatusBadgeClass(status: SpotStatus): string {
  const tone = SPOT_STATUS_META[status].tone;
  if (tone === "published") {
    return "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-green)]";
  }
  if (tone === "rejected") {
    return "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-error)]";
  }
  if (tone === "pending") {
    return "border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] text-foreground";
  }
  return "border-border bg-muted text-muted-foreground";
}

export function MySpotsDrawer({
  open,
  onClose,
  onSelectSpot,
  onOpenSubmitDialog,
}: MySpotsDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("submissions");
  const { data, isLoading, isError, error } = useMySpotActivity(open);
  const toggleBookmark = useToggleSpotBookmark();

  const submissions = data?.submissions ?? [];
  const bookmarks = data?.bookmarks ?? [];

  return (
    <SpotModalDialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Kontribusi & Favorit Saya"
      description="Pantau status usulan sudut baca dan akses cepat tempat baca favoritmu."
    >
      <div className="space-y-4">
        <div
          role="tablist"
          aria-label="Tab aktivitas sudut baca"
          className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-[var(--color-paper-2)] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "submissions"}
            onClick={() => setActiveTab("submissions")}
            className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
              activeTab === "submissions"
                ? "bg-background text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Usulan Saya{" "}
            <span className="font-mono tabular-nums">
              ({submissions.length})
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bookmarks"}
            onClick={() => setActiveTab("bookmarks")}
            className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
              activeTab === "bookmarks"
                ? "bg-background text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Favorit{" "}
            <span className="font-mono tabular-nums">({bookmarks.length})</span>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3" aria-label="Memuat aktivitas sudut baca">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="h-24 rounded-xl border border-border bg-[var(--color-paper-2)] animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-4 text-xs font-medium text-[var(--color-error)]"
          >
            {formatSpotApiError(error, "Gagal memuat kontribusi dan favorit.")}
          </div>
        ) : activeTab === "submissions" ? (
          submissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-[var(--color-paper-2)] p-6 text-center space-y-3">
              <Send
                className="size-6 text-muted-foreground mx-auto"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="font-serif text-base font-bold text-foreground">
                  Belum ada usulan sudut baca
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Punya kafe buku, perpustakaan, atau TBM favorit di kotamu?
                  Usulkan agar pembaca lain ikut merasakannya.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubmitDialog();
                }}
                className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold text-xs"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>Usulkan Sudut Baca</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onOpenSubmitDialog();
                  }}
                  className="min-h-11 text-xs"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  <span>Usulkan Baru</span>
                </Button>
              </div>

              <ul className="ruled-index" aria-label="Daftar usulan sudut baca">
                {submissions.map((spot) => {
                  const status: SpotStatus = spot.status ?? "pending_review";
                  return (
                    <li key={spot.id} className="py-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span
                              className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${getStatusBadgeClass(
                                status,
                              )}`}
                            >
                              {SPOT_STATUS_META[status].label}
                            </span>
                            <span className="rounded border border-border bg-[var(--color-paper-2)] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                              {formatSpotCategory(spot.category)}
                            </span>
                          </div>
                          <h3 className="font-serif text-sm font-bold text-foreground">
                            {spot.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {spot.address} · {spot.city}
                          </p>
                        </div>
                      </div>

                      {status === "rejected" && spot.rejectionReason && (
                        <div className="rounded-lg border border-[var(--color-error)]/35 bg-[var(--color-error-soft)]/70 px-3 py-2 text-xs text-foreground">
                          <span className="font-semibold text-[var(--color-error)]">
                            Alasan penolakan:{" "}
                          </span>
                          <span>{spot.rejectionReason}</span>
                        </div>
                      )}

                      {status === "published" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onClose();
                            onSelectSpot(spot.slug);
                          }}
                          className="min-h-11 text-xs"
                        >
                          <MapPin className="size-3.5" aria-hidden="true" />
                          <span>Buka di Peta</span>
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )
        ) : bookmarks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-[var(--color-paper-2)] p-6 text-center space-y-2">
            <Bookmark
              className="size-6 text-muted-foreground mx-auto"
              aria-hidden="true"
            />
            <p className="font-serif text-base font-bold text-foreground">
              Belum ada sudut baca tersimpan
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tekan tombol Simpan pada detail sudut baca untuk menyimpannya di
              daftar kunjunganmu.
            </p>
          </div>
        ) : (
          <ul className="ruled-index" aria-label="Daftar sudut baca favorit">
            {bookmarks.map((spot) => (
              <li key={spot.id} className="py-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="rounded border border-border bg-[var(--color-paper-2)] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {formatSpotCategory(spot.category)}
                      </span>
                      {spot.ratingCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[11px] tabular-nums text-foreground">
                          <Star
                            className="size-3 fill-[var(--color-accent)] text-[var(--color-accent)]"
                            aria-hidden="true"
                          />
                          {spot.ratingAvg.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-sm font-bold text-foreground">
                      {spot.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {spot.address} · {spot.city}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onSelectSpot(spot.slug);
                    }}
                    className="min-h-11 text-xs"
                  >
                    <MapPin className="size-3.5" aria-hidden="true" />
                    <span>Buka di Peta</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={toggleBookmark.isPending}
                    onClick={() => toggleBookmark.mutate(spot.slug)}
                    className="min-h-11 text-xs text-muted-foreground hover:text-[var(--color-error)]"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    <span>Hapus Simpanan</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SpotModalDialog>
  );
}
