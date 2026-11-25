import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  LoaderCircle,
  MapPin,
  Plus,
} from "lucide-react";
import { useMyManagedPublishers } from "@/features/social/hooks";
import { formatRoleName } from "@/lib/formatters";
import { canAccessPublisherStudio } from "../publisher-helpers";

export function PublisherHubView() {
  const { data: publishers = [], isLoading } = useMyManagedPublishers();

  return (
    <div className="space-y-6 pb-12 text-[var(--color-ink)]">
      <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="font-serif text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2
              className="size-5 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span>Studio Penerbit Anda</span>
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] max-w-2xl">
            Kelola inbox naskah masuk, sunting katalog buku terbitan, atur tim
            redaksi, dan perbarui topik kurasi penerbit mitra AnzaBook.
          </p>
        </div>

        <Link
          to="/publishers/new"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>Daftarkan Penerbit Baru</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
          <LoaderCircle
            className="size-6 animate-spin text-[var(--color-muted)]"
            aria-hidden="true"
          />
        </div>
      ) : publishers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-2)] p-10 text-center space-y-4">
          <BookOpenCheck
            className="mx-auto size-9 text-[var(--color-muted)]"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold">
              Belum Terdaftar sebagai Pengelola Penerbit
            </h3>
            <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto">
              Daftarkan penerbit resmi Anda untuk menerima kiriman naskah
              penulis dan menerbitkan edisi digital maupun phygital di AnzaBook.
            </p>
          </div>
          <Link
            to="/publishers/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-5 text-xs font-semibold hover:bg-[var(--color-paper-3)]"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Ajukan Mitra Penerbit</span>
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {publishers.map((pub) => {
            const hasStudioAccess = canAccessPublisherStudio(pub.role);
            return (
              <li
                key={pub.id}
                className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {pub.logoUrl ? (
                        <img
                          src={pub.logoUrl}
                          alt={pub.name}
                          className="size-12 rounded-xl object-contain border border-[var(--color-rule)] bg-[var(--color-paper)] p-1 shrink-0"
                        />
                      ) : (
                        <div className="size-12 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-3)] flex items-center justify-center font-serif text-lg font-bold shrink-0">
                          {pub.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-serif text-base font-bold truncate">
                          {pub.name}
                        </h3>
                        {pub.city ? (
                          <p className="text-xs text-[var(--color-muted)] flex items-center gap-1 mt-0.5">
                            <MapPin
                              className="size-3 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{pub.city}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--color-muted)] font-mono mt-0.5">
                            /p/{pub.slug}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-0.5 font-mono text-[11px] font-semibold">
                      {pub.verificationStatus === "verified"
                        ? "Terverifikasi"
                        : pub.verificationStatus === "rejected"
                          ? "Ditolak"
                          : "Menunggu Verifikasi"}
                    </span>
                  </div>

                  {pub.topics && pub.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pub.topics.slice(0, 4).map((topic) => (
                        <span
                          key={topic}
                          className="rounded-md bg-[var(--color-paper-3)] px-2 py-0.5 text-[11px] text-[var(--color-ink-2)]"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-rule)] pt-3">
                  <span className="text-xs text-[var(--color-muted)] font-mono">
                    Peran:{" "}
                    <strong className="text-[var(--color-ink)]">
                      {formatRoleName(pub.role)}
                    </strong>
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/p/$slug"
                      params={{ slug: pub.slug }}
                      className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-rule)] px-3.5 text-xs font-medium hover:bg-[var(--color-paper-3)]"
                    >
                      Halaman Publik
                    </Link>
                    {hasStudioAccess && (
                      <Link
                        to="/p/$slug/studio"
                        params={{ slug: pub.slug }}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
                      >
                        <span>Buka Studio Penerbit</span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
