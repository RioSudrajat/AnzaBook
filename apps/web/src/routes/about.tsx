import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Compass,
  HeartHandshake,
  MapPin,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      {
        title: "Tentang AnzaBook & Manifesto Literasi",
      },
      {
        name: "description",
        content:
          "Visi dan Misi AnzaBook: Aksara Tanpa Penjara Pikiran. Mendemokratisasi akses membaca dan merawat karya penulis dalam ekosistem literasi yang adil dan terhubung.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { session } = Route.useRouteContext();

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] selection:bg-[var(--color-accent)] selection:text-[var(--color-accent-ink)] flex flex-col justify-between">
      {/* Header Navigasi */}
      <SiteHeader session={session} />

      <main id="main-content" className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-14 md:pt-20 pb-16 border-b border-border/60 overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] border border-border/80 bg-background/80 text-xs font-mono mb-6 shadow-2xs">
              <BookOpen className="size-3.5 text-[var(--color-accent)]" />
              <span>Manifesto & Ekosistem AnzaBook</span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.15] text-balance">
              Membebaskan Aksara, Merawat Karya Penulis
            </h1>

            {/* Sub-headline */}
            <p className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-normal leading-relaxed text-balance">
              AnzaBook lahir dari sebuah keyakinan sederhana: membaca cerita yang
              baik dan bernalar kritis tidak boleh terhalang oleh sekat biaya,
              dan karya para penulis tidak boleh disandera oleh pembajakan.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="shadow-xs">
                <Link to="/" hash="katalog">
                  <span>Jelajahi Katalog Buku</span>
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#visi-misi">Pelajari Visi & Misi</a>
              </Button>
            </div>
          </div>
        </section>

        {/* THE MANIFESTO: REFLEKSI & CERITA */}
        <section className="py-16 md:py-24 border-b border-border/60 bg-card/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              {/* Kolom Kiri: Statement Besar */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-semibold">
                  Aksara Tanpa Penjara Pikiran
                </span>
                <blockquote className="font-serif text-2xl sm:text-3xl font-bold leading-snug tracking-tight text-foreground">
                  &ldquo;Aksara tidak boleh dipenjara oleh dinding elitisme, sekat
                  biaya, maupun kesunyian rak pajangan. Setiap gagasan berhak
                  menemukan pembacanya.&rdquo;
                </blockquote>
                <p className="text-xs text-muted-foreground font-mono">
                  &mdash; Manifesto AnzaBook untuk Kedaulatan Membaca
                </p>
              </div>

              {/* Kolom Kanan: Narasi Editorial */}
              <div className="lg:col-span-7 space-y-5 text-base text-muted-foreground leading-relaxed font-sans">
                <p>
                  Selama ini, dunia buku kerap terjebak di antara dua kutub yang
                  merugikan: buku-buku bagus dijual dengan harga tinggi akibat
                  rantai distribusi yang berbelit, atau buku beredar luas lewat
                  saluran bajakan yang merampas hak hidup para penulisnya.
                </p>
                <p>
                  Kami menghadirkan jalan ketiga. Melalui kurasi{" "}
                  <strong className="text-foreground font-medium">
                    ragam novel fiksi dan nonfiksi
                  </strong>
                  , AnzaBook menghubungkan pembaca dengan karya-karya yang jujur
                  memotret realitas kehidupan sekaligus mengasah empati. Kami
                  membuka akses digital yang lentur dan menghadirkan opsi{" "}
                  <strong className="text-foreground font-medium">
                    cetak rakyat yang terjangkau
                  </strong>{" "}
                  tanpa mengorbankan martabat royalti sang pencipta karya.
                </p>
                <p>
                  Bagi kami, membaca bukan sekadar transaksi beli-putus, melainkan
                  sebuah percakapan yang hidup—dari tangan penulis, ke ruang temu
                  komunitas, hingga ke sudut-sudut baca ternyaman di seluruh
                  Indonesia.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* VISI & 4 PILAR MISI */}
        <section id="visi-misi" className="py-16 md:py-24 border-b border-border/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            {/* Bagian Visi Utama */}
            <div className="p-8 sm:p-10 md:p-12 rounded-2xl border border-border/80 bg-card/60 shadow-xs relative overflow-hidden">
              <div className="relative z-10 max-w-3xl">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-xs font-mono font-medium mb-4">
                  <Compass className="size-3.5" />
                  <span>Visi Utama AnzaBook</span>
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.25]">
                  &ldquo;Mendemokratisasi akses membaca dan melindungi hak karya
                  penulis dalam ekosistem literasi yang adil, inklusif, dan
                  terhubung—dari layar digital, cetak rakyat, hingga ruang temu
                  komunitas di seluruh penjuru negeri.&rdquo;
                </h2>
              </div>
            </div>

            {/* Bagian 4 Pilar Misi */}
            <div className="space-y-8">
              <div className="max-w-2xl">
                <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Empat Pilar Misi Kami
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Langkah nyata yang kami bangun setiap hari demi mewujudkan ruang
                  literasi yang sehat dan berkeadilan.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {/* Pilar 1: Akses Membaca Tanpa Sekat */}
                <div className="p-7 rounded-xl border border-border/80 bg-card/30 flex flex-col justify-between space-y-4 hover:border-border transition-colors">
                  <div className="size-11 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <BookOpen className="size-5.5" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-serif text-xl font-bold tracking-tight text-foreground">
                      1. Akses Membaca Tanpa Sekat
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                      Menghadirkan ragam novel fiksi dan nonfiksi pilihan melalui
                      akses digital yang fleksibel serta opsi cetak rakyat yang
                      terjangkau bagi seluruh lapisan masyarakat, tanpa terhalang
                      biaya mahal.
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-mono text-muted-foreground border-t border-border/40">
                    Keterjangkauan &bull; Pilihan Format Digital & Cetak
                  </div>
                </div>

                {/* Pilar 2: Perlindungan Hak & Martabat Penulis */}
                <div className="p-7 rounded-xl border border-border/80 bg-card/30 flex flex-col justify-between space-y-4 hover:border-border transition-colors">
                  <div className="size-11 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-5.5" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-serif text-xl font-bold tracking-tight text-foreground">
                      2. Perlindungan Hak & Martabat Penulis
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                      Menjaga karya dari ancaman pembajakan melalui proteksi baca
                      digital yang aman, sekaligus menjamin transparansi serta
                      keadilan royalti demi kesejahteraan berkelanjutan para
                      penulis.
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-mono text-muted-foreground border-t border-border/40">
                    Anti-Pembajakan &bull; Royalti Adil & Transparan
                  </div>
                </div>

                {/* Pilar 3: Panggung Komunitas & Temu Kreator */}
                <div className="p-7 rounded-xl border border-border/80 bg-card/30 flex flex-col justify-between space-y-4 hover:border-border transition-colors">
                  <div className="size-11 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <Users className="size-5.5" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-serif text-xl font-bold tracking-tight text-foreground">
                      3. Panggung Komunitas & Temu Kreator
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                      Menyediakan wadah kolaboratif bagi penulis dan komunitas
                      pembaca untuk menggelar peluncuran buku, diskusi dan bedah
                      karya, hingga sesi berkarya bersama langsung di dalam
                      ekosistem.
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-mono text-muted-foreground border-t border-border/40">
                    Grand Launching &bull; Bedah Buku &bull; Nulis Bareng
                  </div>
                </div>

                {/* Pilar 4: Merajut Sudut Baca Publik */}
                <div className="p-7 rounded-xl border border-border/80 bg-card/30 flex flex-col justify-between space-y-4 hover:border-border transition-colors">
                  <div className="size-11 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <MapPin className="size-5.5" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-serif text-xl font-bold tracking-tight text-foreground">
                      4. Merajut Sudut Baca Publik
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                      Menghubungkan pembaca dengan suaka baca publik,
                      perpustakaan ramah, dan tempat-tempat membaca ternyaman di
                      berbagai kota, menjadikan membaca sebagai gaya hidup yang
                      hangat dan terhubung.
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-mono text-muted-foreground border-t border-border/40">
                    Peta Suaka Membaca &bull; Sudut Baca di Indonesia
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ROADMAP MASA DEPAN: KOMUNITAS & SUDUT BACA */}
        <section className="py-16 md:py-24 border-b border-border/60 bg-card/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-semibold">
                Ekosistem Masa Depan
              </span>
              <h3 className="font-serif text-3xl font-bold tracking-tight text-foreground">
                Bukan Sekadar Toko Buku, Melainkan Habitat Membaca
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kami terus mengembangkan fitur-fitur baru agar pembaca, penulis,
                dan komunitas dapat berinteraksi secara organik.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Feature 1: Ruang Acara Penulis & Komunitas */}
              <div className="p-8 rounded-xl border border-border/80 bg-card/40 space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-muted text-xs font-mono text-foreground font-medium">
                  <HeartHandshake className="size-3.5 text-[var(--color-accent)]" />
                  <span>Agenda & Peluncuran Karya</span>
                </div>
                <h4 className="font-serif text-xl font-bold text-foreground">
                  Ruang Acara Penulis & Komunitas
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Penulis dapat menyelenggarakan sesi peluncuran buku mandiri
                  secara langsung, dan komunitas literasi lokal dapat
                  menginisiasi bedah buku, diskusi gagasan, hingga kegiatan nulis
                  bareng dengan kemudahan registrasi.
                </p>
              </div>

              {/* Feature 2: Peta Sudut Baca Ternyaman */}
              <div className="p-8 rounded-xl border border-border/80 bg-card/40 space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-muted text-xs font-mono text-foreground font-medium">
                  <MapPin className="size-3.5 text-[var(--color-accent)]" />
                  <span>Peta Temu Literasi</span>
                </div>
                <h4 className="font-serif text-xl font-bold text-foreground">
                  Peta Sudut Baca Ternyaman
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Menemukan suaka baca yang tenang tidak lagi sulit. Kami
                  mengkurasi sudut baca publik, perpustakaan komunitas yang
                  ramah, hingga kafe buku yang tenang di kotamu lengkap dengan
                  ulasan sesama pembaca.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* JEMBATAN TRANSPARANSI INDUSTRI BUKU */}
        <section className="py-16 md:py-20 border-b border-border/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-background text-xs font-mono text-muted-foreground">
              <Scale className="size-3.5 text-[var(--color-accent)]" />
              <span>Keterbukaan Produksi</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Kejujuran adalah Fondasi Literasi Kami
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Kami memegang komitmen penuh atas transparansi ekonomi perbukuan.
              Ingin memahami bagaimana rincian produksi cetak rakyat dirancang
              dan rantai distribusi dipangkas demi keadilan harga?
            </p>
            <div className="pt-2">
              <Button asChild variant="outline" size="lg">
                <Link to="/" hash="revolusi-harga">
                  <span>Buka Section Transparansi Industri Buku</span>
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CALL TO ACTION BOTTOM */}
        <section className="py-16 bg-card/40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h3 className="font-serif text-3xl font-bold tracking-tight text-foreground">
              Mulailah Membaca Hari Ini
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Temukan cerita nyata yang membuka wawasan dan fiksi yang merawat
              imajinasi di AnzaBook.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/" hash="katalog">Buka Katalog Buku</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link to="/sign-up">Daftar Akun Gratis</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Navigasi */}
      <SiteFooter />
    </div>
  );
}
