import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import type { BookSummaryDto } from "@starter/shared/types";
import { Brand } from "@/components/brand";
import { HeroBookStage } from "@/components/motion/hero-book-stage";
import { SingleLetterRoll } from "@/components/motion/single-letter-roll";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
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
      book.genres.some((g) => g.toLowerCase().includes(selectedCategory.toLowerCase()));

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
              Aksara Tanpa Tirani Harga: Pustaka Digital & Edisi Cetak Rakyat
            </h1>

            {/* Core Sentence */}
            <p className="mt-5 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl font-normal leading-relaxed text-balance">
              Platform baca dwibahasa Indonesia-Inggris, buku fisik Newsprint 48.8 gsm
              mulai Rp29.000, dan jaringan distribusi lapak mandiri di seluruh negeri.
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="shadow-sm">
                <a href="#katalog">
                  <SingleLetterRoll
                    text="Buka Katalog Buku"
                    icon={<BookOpen className="size-4 mr-1 text-[var(--color-ink)]" />}
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
          <section id="buletin" className="py-16 md:py-20 border-b border-border/60 bg-muted/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-semibold mb-1">
                    <Sparkles className="size-3.5" />
                    Buletin Mingguan AnzaBook
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                    Sorotan Redaksi Pekan Ini
                  </h2>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  Edisi #42 &bull; Diperbarui Sabtu Pagi
                </div>
              </div>

              {/* Weekly Bulletin Featured Card */}
              <div className="bg-background border border-border rounded-[10px] p-6 sm:p-8 md:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-4 flex justify-center">
                  <div
                    className="w-[200px] sm:w-[230px] h-[300px] sm:h-[340px] rounded-[3px_8px_8px_3px] shadow-xl p-5 flex flex-col justify-between relative overflow-hidden"
                    style={{
                      backgroundColor: bulletin.coverColor || "#F06A24",
                      color: "#13110F",
                    }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/30 via-white/10 to-transparent pointer-events-none" />
                    <div className="text-[10px] font-mono uppercase tracking-wider font-semibold opacity-80">
                      Pilihan Redaksi
                    </div>
                    <div>
                      <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
                        {bulletin.title}
                      </h3>
                      <p className="text-xs mt-2 font-medium opacity-90 font-sans">
                        {bulletin.author}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-black/15 flex items-center justify-between text-xs font-mono font-semibold">
                      <span>Edisi Rakyat</span>
                      <span>Rp{bulletin.rakyatPriceIdr.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
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
                      &ldquo;{bulletin.bulletinExcerpt || bulletin.synopsis}&rdquo;
                    </blockquote>

                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {bulletin.synopsis}
                    </p>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-border/70">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-foreground">
                        Rp{bulletin.rakyatPriceIdr.toLocaleString("id-ID")}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground line-through">
                        Rp{bulletin.standardPriceIdr.toLocaleString("id-ID")}
                      </span>
                      <span className="text-xs font-mono text-emerald-800 dark:text-emerald-300 font-semibold ml-2">
                        Hemat 63%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button asChild variant="outline">
                        <Link
                          to="/read/$slug"
                          params={{ slug: bulletin.slug }}
                          search={{ mode: "blueprint", chapter: 1 }}
                        >
                          <BookOpen className="size-4 mr-2" />
                          Baca Intisari 20 Menit
                        </Link>
                      </Button>

                      <Button asChild>
                        <Link to="/books/$slug" params={{ slug: bulletin.slug }}>
                          Detail & Cek Stok
                          <ArrowRight className="size-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: KATALOG BUKU & PENCARIAN */}
        <section id="katalog" className="py-16 md:py-24 border-b border-border/60">
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
                  Semua buku tersedia dalam format digital dwibahasa dan cetak fisik
                  Newsprint 48.8 gsm terjangkau.
                </p>
              </div>

              {/* Search Bar */}
              <div className="w-full md:w-72 relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari judul, penulis, tema..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                    onClick={() => setSelectedCategory(cat)}
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

            {/* Books Grid */}
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
                  }}
                >
                  Reset Filter
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    className="bg-background border border-border rounded-[10px] p-5 shadow-xs flex flex-col justify-between hover:border-border/90 hover:shadow-md transition-all group"
                  >
                    <div>
                      {/* Book header & cover thumbnail */}
                      <div className="flex gap-4">
                        <div
                          className="w-24 h-32 rounded-[3px_6px_6px_3px] shadow-md shrink-0 flex flex-col justify-between p-2 text-white relative overflow-hidden"
                          style={{ backgroundColor: book.coverColor || "#13110F" }}
                        >
                          <div className="text-[8px] font-mono uppercase tracking-wider opacity-80">
                            {book.publishedYear}
                          </div>
                          <div className="font-serif text-xs font-semibold leading-tight line-clamp-3">
                            {book.title}
                          </div>
                          <div className="text-[9px] font-mono text-[var(--color-accent)] font-bold">
                            Rp{book.rakyatPriceIdr.toLocaleString("id-ID")}
                          </div>
                        </div>

                        <div className="flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--color-accent)] font-semibold">
                              <span>
                                {book.isWeeklyBulletin ? "Buletin Mingguan" : "Edisi Rakyat"}
                              </span>
                            </div>
                            <h3 className="font-serif text-base font-semibold leading-snug text-foreground group-hover:text-[var(--color-accent)] transition-colors mt-0.5 line-clamp-2">
                              <Link to="/books/$slug" params={{ slug: book.slug }}>
                                {book.title}
                              </Link>
                            </h3>
                            <p className="text-xs text-muted-foreground font-sans mt-1">
                              {book.author}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-2">
                            <span>{book.pageCount} Hal</span>
                            <span>&bull;</span>
                            <span>{book.readingMinutes} Mnt</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-4 line-clamp-2 leading-relaxed">
                        {book.synopsis}
                      </p>

                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 dark:text-emerald-300">
                        <Store className="size-3 shrink-0" />
                        <span>Stok Gramedia & Gudang Tersedia</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold font-mono text-foreground">
                          Rp{book.rakyatPriceIdr.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground line-through">
                          Ritel: Rp{book.standardPriceIdr.toLocaleString("id-ID")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link
                            to="/read/$slug"
                            params={{ slug: book.slug }}
                            search={{ mode: "blueprint", chapter: 1 }}
                          >
                            Intisari
                          </Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link to="/books/$slug" params={{ slug: book.slug }}>
                            Detail
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 4: REVOLUSI HARGA KERTAS (HPP CALCULATOR & PEMOTONGAN MARGIN) */}
        <section id="revolusi-harga" className="py-16 md:py-24 border-b border-border/60 bg-muted/15">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-semibold">
                Transparansi Industri Buku
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mt-1">
                Mengapa Buku Edisi Rakyat Bisa 60% Lebih Terjangkau?
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mt-2 leading-relaxed">
                Kami mengadopsi model penerbitan India: memotong potongan distributor 45-50%,
                menggunakan kertas Newsprint 48.8 gsm yang enteng di mata, dan tetap membayar
                royalti penulis 12% secara utuh.
              </p>
            </div>

            {/* Price Breakdown Table */}
            <div className="bg-background border border-border rounded-[10px] overflow-hidden shadow-xs mb-12">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 font-mono text-xs uppercase border-b border-border/80">
                    <tr>
                      <th className="py-3 px-4 sm:px-6">Komponen Biaya</th>
                      <th className="py-3 px-4 sm:px-6">Toko Konvensional (Bookpaper 72 gsm)</th>
                      <th className="py-3 px-4 sm:px-6 bg-[var(--color-accent)]/10 text-[var(--color-ink)] font-semibold">
                        AnzaBook Edisi Rakyat (Newsprint 48.8 gsm)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    <tr>
                      <td className="py-3.5 px-4 sm:px-6 font-medium">Bahan Kertas Isi & Cover</td>
                      <td className="py-3.5 px-4 sm:px-6 text-muted-foreground font-mono">Rp18.500 (Bookpaper tebal)</td>
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-semibold text-emerald-800 dark:text-emerald-300 bg-[var(--color-accent)]/5">
                        Rp10.500 (Newsprint halus 48.8 gsm)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 sm:px-6 font-medium">Potongan Toko Buku Mall</td>
                      <td className="py-3.5 px-4 sm:px-6 text-muted-foreground font-mono">45% - 50% (Rp40.000 - Rp45.000)</td>
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-semibold text-emerald-800 dark:text-emerald-300 bg-[var(--color-accent)]/5">
                        0% (Distribusi Komunitas & Lapak Mandiri)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 sm:px-6 font-medium">Biaya Distributor Utama</td>
                      <td className="py-3.5 px-4 sm:px-6 text-muted-foreground font-mono">15% (Rp12.000)</td>
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-semibold text-emerald-800 dark:text-emerald-300 bg-[var(--color-accent)]/5">
                        5% (Hub Gudang Langsung)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 sm:px-6 font-medium">Royalti Penulis</td>
                      <td className="py-3.5 px-4 sm:px-6 text-muted-foreground font-mono">8% - 10% (Sering tertunda 6 bulan)</td>
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-semibold text-foreground bg-[var(--color-accent)]/5">
                        12% Transparan per cetak
                      </td>
                    </tr>
                    <tr className="bg-muted/30 font-semibold text-base">
                      <td className="py-4 px-4 sm:px-6 font-serif">Harga Jual Akhir ke Pembaca</td>
                      <td className="py-4 px-4 sm:px-6 font-mono text-muted-foreground">Rp85.000 - Rp95.000</td>
                      <td className="py-4 px-4 sm:px-6 font-mono text-[var(--color-accent)] bg-[var(--color-accent)]/15 text-lg">
                        Rp29.000 - Rp35.000 (Hemat 60%+)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SAAS MEMBERSHIP TIERS */}
            <div id="keanggotaan" className="mt-16">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                  Paket Keanggotaan Pustaka Digital
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Akses tanpa batas seluruh katalog digital, intisari 20 menit, dan diskon cetak fisik.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {/* 3 Bulan */}
                <div className="bg-background border border-border rounded-[10px] p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h4 className="font-serif text-lg font-bold">Paket Triwulan</h4>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">3 Bulan Akses Penuh</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-mono">Rp60.000</span>
                      <span className="text-xs text-muted-foreground font-mono">/ 3 bln</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">Rp20.000 per bulan</p>

                    <ul className="mt-6 space-y-2.5 text-xs text-foreground/90">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Akses seluruh buku digital & terjemahan</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Intisari 20 Menit & mode audio</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Pelacakan membaca Strava Share Studio</span>
                      </li>
                    </ul>
                  </div>

                  <Button asChild variant="outline" className="mt-8 w-full">
                    <Link to="/sign-up">Pilih Triwulan</Link>
                  </Button>
                </div>

                {/* 6 Bulan */}
                <div className="bg-background border-2 border-[var(--color-accent)] rounded-[10px] p-6 shadow-md flex flex-col justify-between relative">
                  <div className="absolute -top-3 right-6 bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px]">
                    Paling Populer
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-bold">Paket Semester</h4>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">6 Bulan Akses Penuh</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-mono">Rp108.000</span>
                      <span className="text-xs text-muted-foreground font-mono">/ 6 bln</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">Rp18.000 per bulan</p>

                    <ul className="mt-6 space-y-2.5 text-xs text-foreground/90">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Semua fitur Paket Triwulan</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Hemat 10% dibanding bulanan</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Prioritas reservasi stok buku fisik di Gramedia</span>
                      </li>
                    </ul>
                  </div>

                  <Button asChild className="mt-8 w-full shadow-xs">
                    <Link to="/sign-up">Pilih Semester</Link>
                  </Button>
                </div>

                {/* 12 Bulan */}
                <div className="bg-background border border-border rounded-[10px] p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h4 className="font-serif text-lg font-bold">Paket Tahunan</h4>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">12 Bulan Akses Penuh</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-mono">Rp192.000</span>
                      <span className="text-xs text-muted-foreground font-mono">/ tahun</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">Hanya Rp16.000 per bulan</p>

                    <ul className="mt-6 space-y-2.5 text-xs text-foreground/90">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Semua fitur Paket Semester</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Gratis 1 eksemplar buku cetak Edisi Rakyat</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Badge Profil &ldquo;Kolega Pustaka Rakyat&rdquo;</span>
                      </li>
                    </ul>
                  </div>

                  <Button asChild variant="outline" className="mt-8 w-full">
                    <Link to="/sign-up">Pilih Tahunan</Link>
                  </Button>
                </div>
              </div>
            </div>
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
                  Apakah kertas Newsprint 48.8 gsm mudah sobek atau tembus tinta pulpen?
                </h4>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Newsprint yang kami gunakan memiliki kepadatan serat khusus dengan opasitas
                  tinggi dan warna dasar krem hangat. Teks cetak tajam, nyaman dibaca tanpa silau
                  lampu, dan aman dicoret menggunakan pensil atau stabilo standar. Buku dirancang
                  untuk dibaca aktif, dilipat, dan dibawa bepergian tanpa rasa cemas merusak barang mahal.
                </p>
              </div>

              <div className="border border-border/80 rounded-[8px] p-5 bg-background shadow-xs">
                <h4 className="font-serif text-base font-semibold text-foreground">
                  Bagaimana cara mengklaim akses buku digital dari buku fisik yang saya beli di toko?
                </h4>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Setiap eksemplar buku cetak Edisi Rakyat dilengkapi stiker kode verifikasi unik
                  di halaman kolofon belakang. Cukup masuk ke AnzaBook, buka halaman buku tersebut,
                  dan masukkan kode pada tombol &ldquo;Klaim Buku Fisik&rdquo;. Akses digital penuh
                  dan rekaman baca otomatis terbuka di akun Anda.
                </p>
              </div>

              <div className="border border-border/80 rounded-[8px] p-5 bg-background shadow-xs">
                <h4 className="font-serif text-base font-semibold text-foreground">
                  Apakah saya bisa membaca tanpa koneksi internet (offline)?
                </h4>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Ya. Teks bab yang telah dibuka otomatis tersimpan di peramban perangkat Anda.
                  Mode Intisari 20 Menit juga dioptimalkan agar ringan dan dapat dibuka seketika
                  bahkan pada koneksi seluler hemat daya.
                </p>
              </div>

              <div className="border border-border/80 rounded-[8px] p-5 bg-background shadow-xs">
                <h4 className="font-serif text-base font-semibold text-foreground">
                  Bagaimana komunitas literasi lokal bisa menjadi mitra hub distribusi?
                </h4>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Kami membuka kemitraan langsung dengan lapak baca trotoar, taman bacaan masyarakat (TBM),
                  dan kolektif independen. Mitra hub menerima pasokan buku cetak rakyat dengan sistem
                  bagi hasil transparan tanpa ikatan konsinyasi berat warisan toko konvensional.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-12 bg-background border-t border-border/80 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <Brand />
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Membangun kedaulatan membaca Indonesia lewat kertas murah berkualitas
              dan pustaka digital merdeka.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-muted-foreground">
            <a href="#katalog" className="hover:text-foreground transition-colors">
              Katalog
            </a>
            <a href="#revolusi-harga" className="hover:text-foreground transition-colors">
              HPP Kertas
            </a>
            <a href="#keanggotaan" className="hover:text-foreground transition-colors">
              Langganan
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
            <span>&bull;</span>
            <span>&copy; 2026 AnzaBook</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
