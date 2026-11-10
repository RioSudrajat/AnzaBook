import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CheckCircle,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { BookCatalogCard } from "@/features/books/components/book-catalog-card";
import { useBooks } from "@/features/books/hooks";
import { booksListQuery } from "@/features/books/queries";
import { usePublisher } from "@/features/social/hooks";
import { publisherDetailQuery } from "@/features/social/queries";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ context, params }) => {
    try {
      const publisher = await context.queryClient.ensureQueryData(
        publisherDetailQuery(params.slug),
      );
      const booksData = await context.queryClient.ensureQueryData(
        booksListQuery({ publisher: params.slug }),
      );
      return { publisher, booksData };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    const name = loaderData?.publisher?.name;
    const title = name
      ? `${name} — Mitra Penerbit Resmi | AnzaBook`
      : "Mitra Penerbit | AnzaBook";
    return { meta: [{ title }] };
  },
  component: PublisherPublicProfilePage,
});

export default function PublisherPublicProfilePage() {
  const { slug } = Route.useParams();
  const { data: publisher } = usePublisher(slug);
  const { data: booksResponse } = useBooks({ publisher: slug });

  if (!publisher) return null;

  const publishedBooks = booksResponse?.data || [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          to="/app"
          search={{ tab: "explore" }}
          className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Jelajah</span>
        </Link>

        <Link
          to="/app"
          search={{ tab: "home" }}
          className="flex items-center gap-2"
        >
          <img
            src="/icon.svg"
            alt="AnzaBook"
            className="size-6 rounded-[5px] object-contain border border-border/40 shadow-xs"
          />
          <span className="font-serif font-bold text-sm">AnzaBook</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-12 flex-1">
        {/* Publisher Hero Profile Banner */}
        <section
          aria-labelledby="publisher-heading"
          className="rounded-2xl border border-border/80 bg-card p-6 sm:p-10 space-y-6 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {publisher.logoUrl ? (
                <img
                  src={publisher.logoUrl}
                  alt={publisher.name}
                  className="size-20 rounded-2xl object-contain bg-muted/40 p-2 border border-border/70 shrink-0"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-3xl border border-amber-500/30 shrink-0">
                  {publisher.name.slice(0, 1)}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1
                    id="publisher-heading"
                    className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
                  >
                    {publisher.name}
                  </h1>
                  {publisher.verificationStatus === "verified" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      <ShieldCheck className="size-3.5" />
                      Mitra Penerbit Terverifikasi IKAPI
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
                  {publisher.ikapiNumber && (
                    <span className="font-semibold text-foreground/80">
                      No. Anggota IKAPI: {publisher.ikapiNumber}
                    </span>
                  )}
                  {publisher.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {publisher.city}
                    </span>
                  )}
                  {publisher.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3.5" />
                      {publisher.contactEmail}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button asChild variant="outline" size="sm" className="h-9 text-xs font-mono">
              <Link to="/app" search={{ tab: "explore" }}>
                Semua Mitra
              </Link>
            </Button>
          </div>

          {publisher.description && (
            <p className="font-serif text-sm text-foreground/80 max-w-3xl leading-relaxed">
              {publisher.description}
            </p>
          )}

          {/* Stats Badges Row */}
          <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-1">
              <div className="text-muted-foreground">Total Buku Terbit</div>
              <div className="font-serif text-lg font-bold text-foreground">
                {publisher.totalBooks || publishedBooks.length} Judul
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-1">
              <div className="text-muted-foreground">Bagi Hasil Royalti</div>
              <div className="font-serif text-lg font-bold text-emerald-600 dark:text-emerald-400">
                75% Penerbit / Penulis
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-1">
              <div className="text-muted-foreground">Distribusi Phygital</div>
              <div className="font-serif text-lg font-bold text-foreground">
                Gratis Kuota Klaim Cetak
              </div>
            </div>
          </div>
        </section>

        {/* Section: Published Books Catalog */}
        <section aria-labelledby="publisher-books-heading" className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-[var(--color-accent)]" />
              <h2
                id="publisher-books-heading"
                className="font-serif text-2xl font-bold tracking-tight text-foreground"
              >
                Katalog Naskah Terbitan {publisher.name}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Jelajahi edisi cetak phygital dan pustaka naskah digital berlisensi resmi.
            </p>
          </div>

          {publishedBooks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-3">
              <BookOpen className="size-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Belum ada naskah yang diterbitkan oleh penerbit ini di katalog digital AnzaBook.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/app" search={{ tab: "explore" }}>
                  Lihat Katalog Lainnya
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publishedBooks.map((book) => (
                <li key={book.id}>
                  <BookCatalogCard book={book} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Site Footer */}
      <SiteFooter />
    </div>
  );
}
