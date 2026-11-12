import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Layers,
  PenTool,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/partner-program")({
  head: () => ({
    meta: [
      { title: "AnzaBook Partner Program | Penulis, Penerbit & Komunitas" },
      {
        name: "description",
        content:
          "Program kemitraan resmi AnzaBook untuk penulis independen, penerbit berdaulat, dan komunitas literasi. Nikmati bagi hasil royalti berbasis menit baca dan kas afiliasi 10%.",
      },
    ],
  }),
  component: PartnerProgramPage,
});

function PartnerProgramPage() {
  const { session } = Route.useRouteContext();

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "Bagaimana royalti dan bagi hasil dihitung di AnzaBook?",
      a: "Royalti dihitung berbasis menit membaca nyata (real read time) oleh anggota berbayar Nakama Member (minimal 30 detik interaksi pembacaan aktif). Dari setiap iuran keanggotaan Nakama, porsi mayoritas dialokasikan ke Royalty Pool bulanan yang dibagikan secara proporsional kepada para penulis dan penerbit mitra sesuai jumlah menit baca buku mereka.",
    },
    {
      q: "Siapa saja yang berhak mendaftar sebagai Penerbit Mitra?",
      a: "Setiap badan usaha penerbitan buku, baik penerbit independen (indie publisher), pers kampus, maupun penerbit berbadan hukum (PT/CV) yang tergabung dalam IKAPI. Penerbit mendapatkan dashboard khusus untuk mengunggah naskah, mengelola tim redaksi/editor, dan simulasi HPP cetak rakyat terbuka.",
    },
    {
      q: "Apakah penulis atau penerbit mempertahankan hak cipta penuh?",
      a: "Ya, 100%. Hak cipta intelektual (copyright) atas seluruh teks, ilustrasi, dan gagasan tetap sepenuhnya milik penulis dan penerbit terkait. AnzaBook bertindak semata-mata sebagai platform teknologi kurasi, ruang baca digital interaktif, dan jaringan cetak rakyat.",
    },
    {
      q: "Bagaimana cara kerja kas afiliasi 10% untuk komunitas literasi?",
      a: "Setiap komunitas literasi yang terdaftar di Partner Program memperoleh tautan unik kalender agenda (misal: anzabook.id/c/nama-komunitas). Setiap transaksi pembelian naskah berbayar atau pendaftaran Nakama Member baru melalui tautan komunitas Anda otomatis menyumbang 10% komisi langsung ke kas komunitas untuk mendanai operasional ruang baca.",
    },
    {
      q: "Apakah pendaftaran Partner Program dipungut biaya?",
      a: "Sama sekali tidak dipungut biaya (gratis). Visi AnzaBook adalah merawat ekosistem literasi yang adil, inklusif, dan bebas hambatan komersial yang manipulatif.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-amber-500/20 selection:text-foreground">
      {/* Top Header */}
      <SiteHeader session={session} />

      <main className="flex-1">
        {/* ================================================================= */}
        {/* 1. HERO SECTION (Inspired by Medium Partner Program)             */}
        {/* ================================================================= */}
        <section className="relative bg-[#111111] text-zinc-100 overflow-hidden border-b border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & CTA */}
            <div className="lg:col-span-7 space-y-6 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-700 bg-zinc-900/90 text-xs font-mono text-zinc-300">
                <BookOpen className="size-3.5 text-zinc-300" />
                <span>AnzaBook Partner Program</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
                AnzaBook Partner Program
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-zinc-400 max-w-xl leading-relaxed">
                AnzaBook Partner Program hadir bagi para penulis independen, penerbit mitra, dan komunitas literasi yang berkomitmen merawat kedalaman gagasan, memperluas jangkauan pembaca berkualitas, dan membangun ekosistem perbukuan yang adil serta berdaya di Indonesia.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="#tracks"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-zinc-900 hover:bg-zinc-200 font-medium text-xs sm:text-sm transition-colors cursor-pointer shadow-md"
                >
                  Join now (Gabung Program)
                </a>

                {session ? (
                  <Link
                    to="/app"
                    search={{ tab: "profile" }}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <span>Buka Studio Anda</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                ) : (
                  <Link
                    to="/sign-in"
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <span>Sudah punya akun? Masuk</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Right Column: Editorial Etching Illustration (Book & Botanical Sprout) */}
            <div className="lg:col-span-5 flex items-center justify-center relative">
              <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
                {/* Orbital Rings Background */}
                <div className="absolute inset-0 rounded-full border border-zinc-800/80 animate-pulse pointer-events-none" />
                <div className="absolute inset-8 rounded-full border border-dashed border-zinc-800/60 pointer-events-none" />
                <div className="absolute inset-20 rounded-full border border-zinc-800/40 pointer-events-none" />

                {/* SVG Artwork: Open Book + Sprouting Plant + Radiance */}
                <svg
                  className="w-72 sm:w-84 h-72 sm:h-84 text-emerald-500 drop-shadow-[0_10px_30px_rgba(16,185,129,0.15)]"
                  viewBox="0 0 320 320"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Subtle Etching Lines */}
                  <circle cx="160" cy="160" r="140" stroke="#27272a" strokeWidth="1" strokeDasharray="4 6" />
                  <circle cx="160" cy="160" r="110" stroke="#3f3f46" strokeWidth="1" />
                  <circle cx="160" cy="160" r="80" stroke="#27272a" strokeWidth="1" strokeDasharray="2 4" />

                  {/* Open Book Base */}
                  <path
                    d="M60 210C95 198 130 204 160 218C190 204 225 198 260 210V250C225 238 190 244 160 258C130 244 95 238 60 250V210Z"
                    fill="#18181b"
                    stroke="#52525b"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path d="M160 218V258" stroke="#71717a" strokeWidth="2" />
                  <path d="M75 220C100 212 130 216 155 226" stroke="#3f3f46" strokeWidth="1.5" />
                  <path d="M75 228C100 220 130 224 155 234" stroke="#3f3f46" strokeWidth="1.5" />
                  <path d="M245 220C220 212 190 216 165 226" stroke="#3f3f46" strokeWidth="1.5" />
                  <path d="M245 228C220 220 190 224 165 234" stroke="#3f3f46" strokeWidth="1.5" />

                  {/* Sprouting Plant (Botanical leaves directly matching the reference) */}
                  {/* Stem */}
                  <path
                    d="M160 218C160 170 162 130 160 85"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Left Big Leaf */}
                  <path
                    d="M160 165C130 150 110 115 125 85C150 95 160 130 160 165Z"
                    fill="#10b981"
                    stroke="#059669"
                    strokeWidth="2"
                  />
                  <path d="M132 105C142 125 152 145 160 165" stroke="#047857" strokeWidth="1.5" />

                  {/* Right Big Leaf */}
                  <path
                    d="M160 145C190 130 215 155 200 185C175 180 165 160 160 145Z"
                    fill="#10b981"
                    stroke="#059669"
                    strokeWidth="2"
                  />
                  <path d="M190 160C180 162 170 155 160 145" stroke="#047857" strokeWidth="1.5" />

                  {/* Top Bud / Small Leaf */}
                  <path
                    d="M160 85C150 65 170 50 175 70C170 80 165 82 160 85Z"
                    fill="#34d399"
                    stroke="#059669"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 2. VALUE PROPOSITION: QUALITY OVER CLICKBAIT                      */}
        {/* ================================================================= */}
        <section className="bg-background text-foreground py-16 sm:py-24 border-b border-border/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Left Column: Heading & Philosophy */}
            <div className="lg:col-span-5 space-y-4">
              <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                Quality over clickbait
              </h2>
              <div className="space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed pt-2">
                <p>
                  Di tengah industri konten serba cepat yang didikte oleh umpan klik (clickbait) dan kejaran impresi iklan tanpa arti, AnzaBook Partner Program mengambil sikap teguh untuk menghargai karya bermutu.
                </p>
                <p>
                  Sebagai mitra, saat karya terbaik Anda dibaca dan direnungkan oleh para anggota Nakama, sebagian dari iuran keanggotaan dibagikan secara adil dan transparan kepada Anda.
                </p>
                <p>
                  Berikut beberapa faktor utama yang kami pertimbangkan dalam menentukan kualitas dan nilai apresiasi:
                </p>
              </div>
            </div>

            {/* Right Column: 4 Key Pillars */}
            <div className="lg:col-span-7 divide-y divide-border/80">
              {/* Pillar 1 */}
              <div className="py-6 first:pt-0 space-y-1.5">
                <h3 className="font-serif font-bold text-base sm:text-lg text-foreground">
                  Member read time (Waktu Baca Nyata)
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Cerita dan buku yang Anda rilis memperoleh royalti saat anggota membaca selama 30 detik atau lebih, dan royalti terus bertambah seiring kedalaman waktu baca mereka. Bacaan panjang, bernalar kritis, dan penuh perenungan sangat kami apresiasi.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="py-6 space-y-1.5">
                <h3 className="font-serif font-bold text-base sm:text-lg text-foreground">
                  Positive interactions (Interaksi Bermakna)
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Apresiasi meningkat ketika pembaca memberikan respon aktif, menyoroti kutipan naskah, meninggalkan catatan marjinalia reflektif di pinggir halaman, atau menuliskan ulasan di rak buku mereka.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="py-6 space-y-1.5">
                <h3 className="font-serif font-bold text-base sm:text-lg text-foreground">
                  Follower bonus (Bonus Pembaca Setia)
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Saat pembaca mengikuti profil penulis, penerbit, atau komunitas Anda dan terus membaca rilisan terbaru Anda, Anda memperoleh bonus pembaca setia. Kami mendorong Anda merawat audiens dengan hubungan yang bermakna.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="py-6 last:pb-0 space-y-1.5">
                <h3 className="font-serif font-bold text-base sm:text-lg text-foreground">
                  Boost bonus (Kurasi Unggulan Redaksi)
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Naskah dengan bobot pemikiran tinggi yang mendapatkan kurasi khusus (Boost) dari tim kurator redaksi AnzaBook akan dipromosikan ke Buletin Mingguan dan rak utama pembaca, menghasilkan jangkauan bacaan yang jauh lebih luas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3. PARTNER TRACKS (Jembatan Formulir Penulis, Penerbit & Komunitas)*/}
        {/* ================================================================= */}
        <section id="tracks" className="py-16 sm:py-24 bg-muted/20 border-b border-border/70 scroll-mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Jalur Kemitraan Resmi
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Pilih Jalur Kolaborasi Anda
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Jembatan pendaftaran resmi untuk seluruh ekosistem literasi AnzaBook. Pilih peran Anda untuk memulai.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* TRACK 1: PENERBIT MITRA */}
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 flex flex-col justify-between space-y-6 hover:border-foreground/40 transition-colors shadow-xs">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-xl bg-muted/60 border border-border text-foreground flex items-center justify-center">
                      <Layers className="size-5" />
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-muted border border-border font-medium text-foreground">
                      Badan Usaha &amp; IKAPI
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground">
                      Penerbit Mitra
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Daftarkan badan usaha penerbitan Anda. Unggah katalog ber-ISBN, kelola tim editor &amp; penulis rekanan, serta manfaatkan jalur distribusi Phygital AnzaBook.
                    </p>
                  </div>

                  <ul className="space-y-2 text-xs text-muted-foreground pt-2">
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 text-foreground shrink-0 mt-0.5" />
                      <span>Formulir onboarding New Publication 2 kolom</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 text-foreground shrink-0 mt-0.5" />
                      <span>Lencana Penerbit Resmi &amp; verifikasi IKAPI</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 text-foreground shrink-0 mt-0.5" />
                      <span>Simulasi HPP cetak rakyat terbuka tanpa potongan 55%</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <Link
                    to="/publishers/new"
                    className="w-full h-10 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-opacity cursor-pointer"
                  >
                    <span>Daftarkan Penerbit Mitra</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>

              {/* TRACK 2: PENULIS RESMI */}
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 flex flex-col justify-between space-y-6 hover:border-foreground/40 transition-colors shadow-xs">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-xl bg-muted/60 border border-border text-foreground flex items-center justify-center">
                      <PenTool className="size-5" />
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-muted border border-border font-medium text-foreground">
                      Penulis &amp; Esais
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground">
                      Penulis Resmi
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Terbitkan esai reflektif, cerpen, fiksi, puisi, atau buku lengkap. Dapatkan royalti per menit baca dari iuran Nakama dan berinteraksi langsung lewat catatan marjinalia.
                    </p>
                  </div>

                  <ul className="space-y-2 text-xs text-muted-foreground pt-2">
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 text-foreground shrink-0 mt-0.5" />
                      <span>Lencana Penulis Terverifikasi di profil &amp; karya</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 text-foreground shrink-0 mt-0.5" />
                      <span>Hak cipta 100% milik penulis seutuhnya</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 text-foreground shrink-0 mt-0.5" />
                      <span>Royalti menit baca dari Nakama Royalty Pool</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <Link
                    to="/authors/new"
                    className="w-full h-10 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-opacity cursor-pointer"
                  >
                    <span>Daftar Jadi Penulis Resmi</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>

              {/* TRACK 3: KOMUNITAS LITERASI */}
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 flex flex-col justify-between space-y-6 hover:border-foreground/40 transition-colors shadow-xs">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-xl bg-muted/60 border border-border text-foreground flex items-center justify-center">
                      <Users className="size-5" />
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-muted border border-border font-medium text-foreground">
                      Ruang Baca &amp; Kolektif
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground">
                      Komunitas Literasi
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Kelola ruang baca, TBM, atau klub buku kotamu. Publikasikan agenda bedah buku, kelola tiket acara, dan peroleh kas afiliasi 10% untuk keberlanjutan komunitas.
                    </p>
                  </div>

                  <ul className="space-y-2 text-xs text-muted-foreground pt-2">
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 text-foreground shrink-0 mt-0.5" />
                      <span>Halaman publik kalender komunitas di anzabook.id/c/...</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 text-foreground shrink-0 mt-0.5" />
                      <span>Komisi kas 10% dari setiap pembelian &amp; langganan</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-3.5 text-foreground shrink-0 mt-0.5" />
                      <span>Sistem RSVP diskusi daring &amp; luring terintegrasi</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <Link
                    to="/communities/new"
                    className="w-full h-10 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-opacity cursor-pointer"
                  >
                    <span>Daftarkan Komunitas Literasi</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 4. JOIN NOW BANNER (Matching the screenshot horizontal strip)    */}
        {/* ================================================================= */}
        <section className="bg-background text-foreground py-14 sm:py-20 border-b border-border/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <a
              href="#tracks"
              className="group flex items-center justify-between py-4 text-foreground hover:text-muted-foreground transition-colors cursor-pointer"
            >
              <span className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                Join now
              </span>
              <ArrowRight className="size-8 sm:size-12 lg:size-16 stroke-[1.5] group-hover:translate-x-3 transition-transform" />
            </a>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 5. FAQ ACCORDION (Matching Medium Partner Program FAQ)            */}
        {/* ================================================================= */}
        <section className="py-16 sm:py-24 bg-background text-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 space-y-10">
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight">
              FAQ
            </h2>

            <div className="divide-y divide-border/80 border-t border-b border-border/80">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={faq.q} className="py-5 sm:py-6">
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between text-left gap-4 font-serif text-base sm:text-lg font-bold text-foreground hover:text-muted-foreground transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`size-4 sm:size-5 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
