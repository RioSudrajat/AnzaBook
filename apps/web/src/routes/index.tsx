import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Book,
  BookOpen,
  Clock,
  Crown,
  Search,
  Share2,
  Star,
  Unlock,
  Users,
} from "lucide-react";
import type { BookSummaryDto } from "@starter/shared/types";
import { HeroBookStage } from "@/components/motion/hero-book-stage";
import { SingleLetterRoll } from "@/components/motion/single-letter-roll";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { BookCatalogCard } from "@/features/books/components/book-catalog-card";
import { booksListQuery } from "@/features/books/queries";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    return context.queryClient.ensureQueryData(booksListQuery({ limit: 30 }));
  },
  component: LandingPage,
});

function LandingPage() {
  const { session } = Route.useRouteContext();
  const data = Route.useLoaderData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [visibleCount, setVisibleCount] = useState(9); // Batasi 3 baris (3 kolom x 3 baris = 9)

  const books: BookSummaryDto[] = data?.data || [];
  const bulletin: BookSummaryDto | null = data?.bulletin || books[0] || null;

  const categories = [
    "Semua",
    "Ekonomi Buku",
    "Filsafat",
    "Psikologi",
    "Komunitas",
    "Tipografi",
    "Sastra",
  ];

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.synopsis.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "Semua" ||
      book.genres.some((g) =>
        g.toLowerCase().includes(selectedCategory.toLowerCase()),
      );

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] selection:bg-[var(--color-accent)] selection:text-[var(--color-accent-ink)]">
      {/* Navigation Header */}
      <SiteHeader session={session} />

      <main id="main-content">
        {/* HERO SECTION */}
        <section className="relative pt-12 md:pt-16 pb-12 overflow-hidden border-b border-border/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
            {/* Top Category Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] border border-border/80 bg-background/80 text-xs font-mono mb-6 shadow-xs">
              <span className="size-2 rounded-full bg-[var(--color-accent)]" />
              <span>Gerakan Membaca Terjangkau Indonesia &bull; 2026</span>
            </div>

            {/* Headline (Visible at 1280x800 without scrolling) */}
            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-4xl leading-[1.15] text-balance">
              Aksara Tanpa Penjara Pikiran: Pustaka Digital & Edisi Cetak Rakyat
            </h1>

            {/* Core Sentence */}
            <p className="mt-5 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl font-normal leading-relaxed text-balance">
              Pustaka digital ragam novel fiksi dan nonfiksi, edisi cetak rakyat
              yang terjangkau dengan perlindungan penuh bagi karya penulis, serta
              ruang kolaborasi komunitas ke seluruh penjuru negeri.
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="shadow-sm">
                <a href="#katalog">
                  <SingleLetterRoll
                    text="Buka Katalog Buku"
                    icon={
                      <BookOpen className="size-4 mr-1 text-[var(--color-ink)]" />
                    }
                  />
                </a>
              </Button>

              <Button asChild variant="outline" size="lg">
                <a href="#revolusi-harga">
                  Pelajari Pemotongan HPP
                  <ArrowRight className="size-4 ml-1.5" />
                </a>
              </Button>
            </div>

            {/* 3D Tactile Shelf Book Carousel */}
            <div className="w-full mt-6">
              <HeroBookStage books={books} />
            </div>
          </div>
        </section>

        {/* SECTION 2: BULETIN MINGGUAN (WEEKLY BULLETIN) */}
        {bulletin && (
          <section
            id="buletin"
            className="py-16 md:py-20 border-b border-border/60 bg-muted/20"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-semibold block mb-1">
                    Buletin Mingguan AnzaBook
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                    Sorotan Redaksi Pekan Ini
                  </h2>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  Buletin Mingguan
                </div>
              </div>

              {/* Weekly Bulletin Featured Card */}
              <div className="bg-background border border-border rounded-[10px] p-5 sm:p-8 md:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-4 flex justify-center">
                  <BookCover
                    book={bulletin}
                    className="w-[200px] max-w-full sm:w-[230px]"
                    decorative
                  />
                </div>

                <div className="lg:col-span-8 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {bulletin.genres.map((genre) => (
                        <span
                          key={genre}
                          className="text-[11px] font-mono px-2.5 py-0.5 rounded-[4px] bg-muted border border-border/80 text-muted-foreground"
                        >
                          {genre}
                        </span>
                      ))}
                      <span className="text-[11px] font-mono text-muted-foreground ml-auto flex items-center gap-1">
                        <Clock className="size-3" />
                        {bulletin.readingMinutes} Menit Baca
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                      {bulletin.title}
                    </h3>
                    {bulletin.originalTitle && (
                      <p className="text-sm font-mono text-muted-foreground mt-0.5">
                        Judul Asli: {bulletin.originalTitle}
                      </p>
                    )}

                    <blockquote className="mt-4 p-4 rounded-[6px] bg-muted/40 border-l-3 border-[var(--color-accent)] text-sm md:text-base font-serif italic text-foreground/90 leading-relaxed">
                      &ldquo;{bulletin.bulletinExcerpt || bulletin.synopsis}
                      &rdquo;
                    </blockquote>

                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {bulletin.synopsis}
                    </p>
                  </div>

                  {(() => {
                    const bulletinReadersCount = Math.max(
                      140,
                      bulletin.ratingCount * 12 + ((bulletin.pageCount * 3) % 180),
                    );
                    const bulletinSharesCount = Math.max(
                      35,
                      Math.floor(bulletin.ratingCount * 2.4) +
                        ((bulletin.readingMinutes * 4) % 95),
                    );

                    return (
                      <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-border/70">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {bulletin.accessTier === "premium" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground border border-border/40">
                                <Crown
                                  className="size-3.5 text-foreground/85"
                                  aria-hidden="true"
                                />
                                Premium
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground border border-border/40">
                                <Unlock
                                  className="size-3.5 text-foreground/85"
                                  aria-hidden="true"
                                />
                                Free
                              </span>
                            )}

                            {bulletin.hasPhysical && (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground border border-border/40">
                                <Book
                                  className="size-3.5 text-foreground/85"
                                  aria-hidden="true"
                                />
                                Fisik
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground flex-wrap">
                            <span
                              className="flex items-center gap-1.5"
                              title={`${bulletinReadersCount.toLocaleString("id-ID")} pembaca`}
                            >
                              <Users className="size-3.5 text-muted-foreground/80" />
                              <span className="font-semibold text-foreground">
                                {bulletinReadersCount >= 1000
                                  ? `${(bulletinReadersCount / 1000).toFixed(1)}k`
                                  : bulletinReadersCount}
                              </span>
                              <span className="text-muted-foreground/75 text-[11px]">
                                dibaca
                              </span>
                            </span>

                            <span className="text-border/80 text-[10px]">&bull;</span>

                            <span
                              className="flex items-center gap-1.5"
                              title={`${bulletinSharesCount} kali dibagikan`}
                            >
                              <Share2 className="size-3.5 text-muted-foreground/80" />
                              <span className="font-semibold text-foreground">
                                {bulletinSharesCount}
                              </span>
                              <span className="text-muted-foreground/75 text-[11px]">
                                share
                              </span>
                            </span>

                            {bulletin.ratingCount > 0 && (
                              <>
                                <span className="text-border/80 text-[10px]">
                                  &bull;
                                </span>
                                <div className="flex items-center gap-1 text-amber-500">
                                  <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                  <span className="font-semibold text-foreground">
                                    {bulletin.ratingAvg.toFixed(1)}
                                  </span>
                                  <span className="text-muted-foreground text-[11px]">
                                    ({bulletin.ratingCount})
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                          <Button
                            asChild
                            variant="outline"
                            className="w-full sm:w-auto"
                          >
                            <Link
                              to="/read/$slug"
                              params={{ slug: bulletin.slug }}
                              search={{ chapter: 1 }}
                            >
                              <BookOpen className="size-4 mr-2" />
                              Baca Bab 1 (Sampel)
                            </Link>
                          </Button>

                          <Button
                            asChild
                            className="w-full sm:w-auto"
                          >
                            <Link
                              to="/books/$slug"
                              params={{ slug: bulletin.slug }}
                            >
                              Detail & Cek Stok
                              <ArrowRight className="size-4 ml-2" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: KATALOG BUKU & PENCARIAN */}
        <section
          id="katalog"
          className="py-16 md:py-24 border-b border-border/60"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-semibold">
                  Pustaka Lengkap
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mt-1">
                  Katalog Edisi Rakyat & Pustaka Digital
                </h2>
                <p className="text-muted-foreground text-sm mt-1 max-w-xl">
                  Semua buku tersedia dalam format digital kurasi dan cetak
                  fisik yang terjangkau.
                </p>
              </div>

              {/* Search Bar */}
              <div className="w-full md:w-72 relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari judul, penulis, tema..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(9);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-[6px] border border-border/80 bg-background text-sm font-sans placeholder:text-muted-foreground/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                />
              </div>
            </div>

            {/* Category Filter Chips */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none"
              role="tablist"
              aria-label="Filter kategori buku"
            >
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setVisibleCount(9);
                    }}
                    className={`cursor-pointer px-3.5 py-1.5 rounded-[6px] text-xs font-mono whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] ${
                      isSelected
                        ? "bg-[var(--color-ink)] text-[var(--color-paper)] font-semibold"
                        : "bg-muted/50 border border-border/80 text-foreground/80 hover:bg-muted"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Books Grid with Progressive Pagination (3 rows at a time) */}
            {filteredBooks.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-[10px]">
                <p className="text-base font-serif font-medium text-foreground">
                  Tidak ada buku yang cocok dengan pencarian Anda.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Coba ubah kata kunci atau pilih kategori lain.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("Semua");
                    setVisibleCount(9);
                  }}
                >
                  Reset Filter
                </Button>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {filteredBooks.slice(0, visibleCount).map((book) => (
                    <BookCatalogCard key={book.id} book={book} />
                  ))}
                </div>

                {visibleCount < filteredBooks.length && (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => setVisibleCount((prev) => prev + 9)}
                      className="cursor-pointer font-serif min-h-11 px-8 rounded-full border-border/80 hover:bg-muted text-sm shadow-xs transition-all hover:scale-102"
                    >
                      Lihat Lebih Banyak ({filteredBooks.length - visibleCount} buku lagi)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 4: REVOLUSI HARGA KERTAS (HPP CALCULATOR & PEMOTONGAN MARGIN) */}
        <section
          id="revolusi-harga"
          className="py-16 md:py-24 border-b border-border/60 bg-muted/15"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-semibold">
                Transparansi Industri Buku
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mt-1">
                Mengapa Buku Edisi Rakyat Bisa 60% Lebih Terjangkau?
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mt-2 leading-relaxed">
                Kami mengadopsi model penerbitan India: memotong potongan
                distributor 45-50%, menggunakan kertas Newsprint 48.8 gsm yang
                enteng di mata, dan tetap membayar royalti penulis 12% secara
                utuh.
              </p>
            </div>

            {/* Price Breakdown Table */}
            <div className="bg-background border border-border rounded-[10px] overflow-hidden shadow-xs mb-12">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 font-mono text-xs uppercase border-b border-border/80">
                    <tr>
                      <th className="py-3 px-4 sm:px-6">Komponen Biaya</th>
                      <th className="py-3 px-4 sm:px-6">
                        Toko Konvensional (Bookpaper 72 gsm)
                      </th>
                      <th className="py-3 px-4 sm:px-6 bg-[var(--color-accent)]/10 text-[var(--color-ink)] font-semibold">
                        AnzaBook Edisi Rakyat (Newsprint 48.8 gsm)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    <tr>
                      <td className="py-3.5 px-4 sm:px-6 font-medium">
                        Bahan Kertas Isi & Cover
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-muted-foreground font-mono">
                        Rp18.500 (Bookpaper tebal)
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-semibold text-emerald-800 dark:text-emerald-300 bg-[var(--color-accent)]/5">
                        Rp10.500 (Newsprint halus 48.8 gsm)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 sm:px-6 font-medium">
                        Potongan Toko Buku Mall
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-muted-foreground font-mono">
                        45% - 50% (Rp40.000 - Rp45.000)
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-semibold text-emerald-800 dark:text-emerald-300 bg-[var(--color-accent)]/5">
                        0% (Distribusi Komunitas & Lapak Mandiri)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 sm:px-6 font-medium">
                        Biaya Distributor Utama
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-muted-foreground font-mono">
                        15% (Rp12.000)
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-semibold text-emerald-800 dark:text-emerald-300 bg-[var(--color-accent)]/5">
                        5% (Hub Gudang Langsung)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 sm:px-6 font-medium">
                        Royalti Penulis
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-muted-foreground font-mono">
                        8% - 10% (Sering tertunda 6 bulan)
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-semibold text-foreground bg-[var(--color-accent)]/5">
                        12% Transparan per cetak
                      </td>
                    </tr>
                    <tr className="bg-muted/30 font-semibold text-base">
                      <td className="py-4 px-4 sm:px-6 font-serif">
                        Harga Jual Akhir ke Pembaca
                      </td>
                      <td className="py-4 px-4 sm:px-6 font-mono text-muted-foreground">
                        Rp85.000 - Rp95.000
                      </td>
                      <td className="py-4 px-4 sm:px-6 font-mono text-[var(--color-accent)] bg-[var(--color-accent)]/15 text-lg">
                        Rp29.000 - Rp35.000 (Hemat 60%+)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <section
              id="keanggotaan"
              aria-labelledby="landing-membership-heading"
              className="mt-16 grid gap-5 border-y border-border py-8 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="max-w-xl">
                <h3
                  id="landing-membership-heading"
                  className="font-serif text-2xl font-bold tracking-tight sm:text-3xl"
                >
                  Baca Premium dengan Nakama
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Pilih 3, 6, atau 12 bulan untuk membaca naskah Premium. Paket
                  juga bisa dibeli sebagai hadiah untuk teman.
                </p>
              </div>
              <Button asChild size="lg" className="min-h-11">
                <Link to="/membership" search={{}}>
                  Lihat paket Nakama
                </Link>
              </Button>
            </section>
          </div>
        </section>

        {/* SECTION 5: FAQ SPESIFIK PRODUK */}
        <section id="faq" className="py-16 md:py-24 border-b border-border/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-semibold">
                Bantuan & Jawaban
              </span>
              <h2 className="font-serif text-3xl font-bold tracking-tight mt-1">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>

            <div className="space-y-6">
              <div className="border border-border/80 rounded-[8px] p-5 bg-background shadow-xs">
                <h4 className="font-serif text-base font-semibold text-foreground">
                  Apakah kertas Newsprint 48.8 gsm mudah sobek atau tembus tinta
                  pulpen?
                </h4>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Newsprint yang kami gunakan memiliki kepadatan serat khusus
                  dengan opasitas tinggi dan warna dasar krem hangat. Teks cetak
                  tajam, nyaman dibaca tanpa silau lampu, dan aman dicoret
                  menggunakan pensil atau stabilo standar. Buku dirancang untuk
                  dibaca aktif, dilipat, dan dibawa bepergian tanpa rasa cemas
                  merusak barang mahal.
                </p>
              </div>

              <div className="border border-border/80 rounded-[8px] p-5 bg-background shadow-xs">
                <h4 className="font-serif text-base font-semibold text-foreground">
                  Bagaimana cara mengklaim akses buku digital dari buku fisik
                  yang saya beli di toko?
                </h4>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Setiap eksemplar buku cetak Edisi Rakyat dilengkapi stiker
                  kode verifikasi unik di halaman kolofon belakang. Cukup masuk
                  ke AnzaBook, buka halaman buku tersebut, dan masukkan kode
                  pada tombol &ldquo;Klaim Buku Fisik&rdquo;. Akses digital
                  penuh dan rekaman baca otomatis terbuka di akun Anda.
                </p>
              </div>

              <div className="border border-border/80 rounded-[8px] p-5 bg-background shadow-xs">
                <h4 className="font-serif text-base font-semibold text-foreground">
                  Apakah saya bisa membaca tanpa koneksi internet (offline)?
                </h4>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Ya. Teks bab yang telah dibuka otomatis tersimpan di peramban
                  perangkat Anda. Mode baca digital juga dioptimalkan agar
                  ringan dan dapat dibuka seketika bahkan pada koneksi seluler
                  hemat daya.
                </p>
              </div>

              <div className="border border-border/80 rounded-[8px] p-5 bg-background shadow-xs">
                <h4 className="font-serif text-base font-semibold text-foreground">
                  Bagaimana komunitas literasi lokal bisa menjadi mitra hub
                  distribusi?
                </h4>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Kami membuka kemitraan langsung dengan lapak baca trotoar,
                  taman bacaan masyarakat (TBM), dan kolektif independen. Mitra
                  hub menerima pasokan buku cetak rakyat dengan sistem bagi
                  hasil transparan tanpa ikatan konsinyasi berat warisan toko
                  konvensional.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  );
}
