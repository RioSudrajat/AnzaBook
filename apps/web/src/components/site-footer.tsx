import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Mail, MessageSquare, Send, Users, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppDownloadDialog } from "@/features/dashboard/components/app-download-dialog";

type ModalType =
  | "about"
  | "privacy"
  | "terms"
  | "feedback"
  | "community"
  | "submit"
  | "talent"
  | null;

export function SiteFooter() {
  const [downloadPlatform, setDownloadPlatform] = useState<"android" | "ios" | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("Katalog & Naskah");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const handleFeedbackSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setFeedbackMessage("");
      setActiveModal(null);
    }, 2000);
  };

  return (
    <>
      <footer className="relative bg-background border-t border-border/80 text-foreground overflow-hidden select-none">
        {/* Subtle Brand Watermark in Background */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none select-none overflow-hidden flex justify-center items-end"
          aria-hidden="true"
        >
          <span className="font-serif font-black text-[14vw] sm:text-[13vw] leading-none text-foreground/[0.03] tracking-tight translate-y-[20%]">
            AnzaBook
          </span>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-8 items-start">
            {/* Column 0: Logo & Copyright */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex flex-col justify-between self-stretch space-y-4">
              <div>
                <Brand size="default" />
                <p className="mt-3 text-xs text-muted-foreground font-sans leading-relaxed">
                  Ekosistem literasi yang merawat karya penulis dan memperluas akses membaca lewat digital, cetak rakyat terjangkau, serta sudut baca di Indonesia.
                </p>
              </div>

              {/* Desktop Copyright */}
              <div className="hidden lg:block mt-auto pt-6 text-xs text-muted-foreground font-sans leading-relaxed">
                &copy; Copyright AnzaBook, 2026.
              </div>
            </div>

            {/* Column 1: Aplikasi AnzaBook */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-sans font-medium text-muted-foreground tracking-normal">
                Aplikasi AnzaBook
              </h3>
              <div className="flex flex-col gap-2.5">
                {/* Download on the App Store badge */}
                <button
                  type="button"
                  onClick={() => setDownloadPlatform("ios")}
                  className="group flex items-center gap-2.5 px-3 py-2 rounded-lg bg-card/80 hover:bg-muted border border-border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-ring w-full max-w-[172px] text-left shadow-2xs"
                  aria-label="Unduh di App Store"
                >
                  <svg
                    className="size-5 shrink-0 fill-foreground"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.84.94-2.91-.91.04-2.02.61-2.67 1.38-.58.67-1.09 1.77-.95 2.82 1.02.08 2.06-.52 2.68-1.29z" />
                  </svg>
                  <div className="flex flex-col leading-none">
                    <span className="text-[8px] text-muted-foreground font-sans tracking-tight">
                      Download on the
                    </span>
                    <span className="text-[12px] font-semibold text-foreground font-sans tracking-tight mt-0.5">
                      App Store
                    </span>
                  </div>
                </button>

                {/* GET IT ON Google Play badge */}
                <button
                  type="button"
                  onClick={() => setDownloadPlatform("android")}
                  className="group flex items-center gap-2.5 px-3 py-2 rounded-lg bg-card/80 hover:bg-muted border border-border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-ring w-full max-w-[172px] text-left shadow-2xs"
                  aria-label="Unduh di Google Play"
                >
                  <svg
                    className="size-5 shrink-0"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M3.6 2.5C3.3 2.8 3.1 3.3 3.1 3.9v16.2c0 .6.2 1.1.5 1.4l.1.1 9.1-9.1v-.2L3.6 2.5z"
                      fill="#00E676"
                    />
                    <path
                      d="M15.8 15.3l-3-3v-.2l3-3 .1.1 3.6 2c1 .6 1 1.6 0 2.2l-3.7 1.9z"
                      fill="#FFD600"
                    />
                    <path
                      d="M12.8 12.1L3.6 21.6c.4.4 1 .4 1.7.1l10.5-6-3-3.6z"
                      fill="#FF3D00"
                    />
                    <path
                      d="M12.8 11.9l3-3.6-10.5-6C4.6 1.9 4 2 3.6 2.4l9.2 9.5z"
                      fill="#00B0FF"
                    />
                  </svg>
                  <div className="flex flex-col leading-none">
                    <span className="text-[7.5px] uppercase tracking-wider text-muted-foreground font-sans">
                      GET IT ON
                    </span>
                    <span className="text-[12px] font-semibold text-foreground font-sans tracking-tight mt-0.5">
                      Google Play
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Column 2: Bantuan dan Panduan */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-sans font-medium text-muted-foreground tracking-normal">
                Bantuan dan Panduan
              </h3>
              <ul className="space-y-2.5 text-xs font-sans text-muted-foreground">
                <li>
                  <a
                    href="mailto:halo@anzabook.id"
                    className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs"
                  >
                    Email
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveModal("privacy")}
                    className="hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs text-left"
                  >
                    Kebijakan Privasi
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveModal("terms")}
                    className="hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs text-left"
                  >
                    Ketentuan Penggunaan
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Buku Cetak (Edisi Rakyat, Edisi Standar, Edisi Premium) */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-sans font-medium text-muted-foreground tracking-normal">
                Buku Cetak
              </h3>
              <ul className="space-y-2.5 text-xs font-sans text-muted-foreground">
                <li>
                  <Link
                    to="/"
                    hash="revolusi-harga"
                    className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs"
                  >
                    Edisi Rakyat
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    hash="katalog"
                    className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs"
                  >
                    Edisi Standar
                  </Link>
                </li>
                <li>
                  <Link
                    to="/membership"
                    className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs"
                  >
                    Edisi Premium
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Jadi Bagian dari Kami */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-sans font-medium text-muted-foreground tracking-normal">
                Jadi Bagian dari Kami
              </h3>
              <ul className="space-y-2.5 text-xs font-sans text-muted-foreground">
                <li>
                  <Link
                    to="/about"
                    className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs text-left"
                  >
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveModal("feedback")}
                    className="hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs text-left"
                  >
                    Beri Feedback
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveModal("community")}
                    className="hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs text-left"
                  >
                    Gabung Komunitas
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveModal("submit")}
                    className="hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs text-left"
                  >
                    Kirim Naskah / Submit Cerita
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveModal("talent")}
                    className="hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs text-left"
                  >
                    Talent Pool
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 5: Ikuti Kami */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-sans font-medium text-muted-foreground tracking-normal">
                Ikuti Kami
              </h3>
              <ul className="space-y-2.5 text-xs font-sans text-muted-foreground">
                {/* Instagram */}
                <li>
                  <a
                    href="https://www.instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs"
                  >
                    <svg
                      className="size-3.5 shrink-0 rounded-xs"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient
                          id="footer-ig-grad-theme"
                          x1="0%"
                          y1="100%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor="#fdf497" />
                          <stop offset="20%" stopColor="#fdf497" />
                          <stop offset="40%" stopColor="#fd5949" />
                          <stop offset="60%" stopColor="#d6249f" />
                          <stop offset="100%" stopColor="#285AEB" />
                        </linearGradient>
                      </defs>
                      <rect width="24" height="24" rx="6" fill="url(#footer-ig-grad-theme)" />
                      <rect
                        x="5.5"
                        y="5.5"
                        width="13"
                        height="13"
                        rx="4"
                        stroke="white"
                        strokeWidth="1.6"
                        fill="none"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3.2"
                        stroke="white"
                        strokeWidth="1.6"
                        fill="none"
                      />
                      <circle cx="15.8" cy="8.2" r="0.9" fill="white" />
                    </svg>
                    <span>Instagram</span>
                  </a>
                </li>

                {/* Shopee */}
                <li>
                  <a
                    href="https://shopee.co.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs"
                  >
                    <svg
                      className="size-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect width="24" height="24" rx="5" fill="#EE4D2D" />
                      <path
                        d="M12 5.5c-1.8 0-3 1.2-3 2.5v1h6v-1c0-1.3-1.2-2.5-3-2.5zm-4.5 3.5h9l-1 9h-7l-1-9zm4.5 3c-1.2 0-2 .5-2 1.2 0 1.5 3 .8 3 2.2 0 .8-.8 1.4-1.8 1.4-1 0-1.8-.4-1.9-1.2h-.9c.1 1.2 1.2 2 2.8 2 1.5 0 2.7-.8 2.7-2.1 0-1.6-3-.9-3-2.3 0-.6.7-1 1.6-1 .8 0 1.5.3 1.6.9h.9c-.1-1.1-1.1-1.9-2.5-1.9z"
                        fill="white"
                        fillRule="evenodd"
                      />
                    </svg>
                    <span>Shopee</span>
                  </a>
                </li>

                {/* Spotify */}
                <li>
                  <a
                    href="https://open.spotify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs"
                  >
                    <svg
                      className="size-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="11" fill="#1DB954" />
                      <path
                        d="M16.5 15.2c-.2.3-.5.4-.8.2-2.3-1.4-5.2-1.7-8.6-.9-.3.1-.7-.1-.8-.4-.1-.3.1-.7.4-.8 3.7-.8 6.9-.5 9.5 1.1.3.2.4.6.3.8zm1.2-2.6c-.3.4-.8.5-1.1.3-2.6-1.6-6.6-2.1-9.7-1.1-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.5-1.1 7.9-.5 11 1.4.3.1.4.6.3.9zm.1-2.7C14.7 8.1 9.6 8 6.6 8.9c-.5.1-1-.1-1.2-.6-.1-.5.1-1 .6-1.2 3.6-1.1 9.2-.9 12.8 1.2.4.3.6.8.3 1.2-.2.5-.7.6-1.2.3z"
                        fill="black"
                      />
                    </svg>
                    <span>Spotify</span>
                  </a>
                </li>

                {/* TikTok */}
                <li>
                  <a
                    href="https://www.tiktok.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs"
                  >
                    <svg
                      className="size-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        width="24"
                        height="24"
                        rx="5"
                        fill="#000000"
                        stroke="currentColor"
                        strokeOpacity="0.2"
                        strokeWidth="1"
                      />
                      <path
                        d="M16.5 8.2c-.9-.6-1.5-1.6-1.7-2.7h-2.1v10.1c0 1.5-1.2 2.7-2.7 2.7s-2.7-1.2-2.7-2.7 1.2-2.7 2.7-2.7c.3 0 .6 0 .8.1v-2.2c-.3 0-.6-.1-.8-.1-2.7 0-4.9 2.2-4.9 4.9s2.2 4.9 4.9 4.9 4.9-2.2 4.9-4.9v-5.2c1.1.8 2.4 1.3 3.8 1.4v-2.1c-.8-.1-1.6-.4-2.2-.7z"
                        fill="white"
                      />
                    </svg>
                    <span>TikTok</span>
                  </a>
                </li>

                {/* Tokopedia */}
                <li>
                  <a
                    href="https://www.tokopedia.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs"
                  >
                    <svg
                      className="size-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect width="24" height="24" rx="5" fill="#03AC0E" />
                      <path
                        d="M12 4.5c-2.8 0-5 2.2-5 5v1.2H5.5c-.8 0-1.5.7-1.5 1.5l1 7c.1.7.7 1.3 1.5 1.3h11c.8 0 1.4-.6 1.5-1.3l1-7c0-.8-.7-1.5-1.5-1.5H17V9.5c0-2.8-2.2-5-5-5zm0 2c1.7 0 3 1.3 3 3v1.2H9V9.5c0-1.7 1.3-3 3-3zm-2.5 7.5a1.8 1.8 0 110 3.6 1.8 1.8 0 010-3.6zm5 0a1.8 1.8 0 110 3.6 1.8 1.8 0 010-3.6z"
                        fill="white"
                      />
                    </svg>
                    <span>Tokopedia</span>
                  </a>
                </li>

                {/* YouTube */}
                <li>
                  <a
                    href="https://www.youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-xs"
                  >
                    <svg
                      className="size-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect width="24" height="24" rx="5" fill="#FF0000" />
                      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="white" />
                    </svg>
                    <span>YouTube</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Mobile Copyright Footer Line */}
          <div className="lg:hidden mt-10 pt-6 border-t border-border/60 text-xs text-muted-foreground text-center font-sans">
            &copy; Copyright AnzaBook, 2026.
          </div>
        </div>
      </footer>

      {/* App Download Dialog Modal (Android & iOS) */}
      <AppDownloadDialog
        isOpen={downloadPlatform !== null}
        onClose={() => setDownloadPlatform(null)}
        platform={downloadPlatform}
      />

      {/* Information Modal: Tentang Kami, Privasi, Ketentuan, Komunitas, dll. */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 text-foreground"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="max-w-lg w-full bg-card border border-border rounded-xl p-6 sm:p-7 shadow-2xl relative space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="size-4" />
            </button>

            {/* Modal Content: Tentang Kami */}
            {activeModal === "about" && (
              <div className="space-y-3.5">
                <div className="inline-flex items-center px-2.5 py-1 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-xs font-mono font-medium">
                  <span>Kedaulatan Membaca</span>
                </div>
                <h3 className="font-serif text-2xl font-bold tracking-tight">
                  Tentang AnzaBook
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-sans">
                  <p>
                    AnzaBook adalah ekosistem literasi yang merawat karya penulis
                    dan memperluas akses membaca. Menghadirkan ragam novel fiksi dan
                    nonfiksi lewat akses digital dan cetak rakyat yang terjangkau,
                    serta merajut ruang temu komunitas dan sudut baca di Indonesia.
                  </p>
                  <p>
                    Kami berkomitmen menjaga hak cipta penulis dengan perlindungan
                    digital yang aman, menjunjung keadilan royalti, serta merobohkan
                    sekat pembatas bacaan bagi masyarakat luas.
                  </p>
                  <div className="pt-2">
                    <Button asChild size="sm" className="w-full sm:w-auto">
                      <Link to="/about" onClick={() => setActiveModal(null)}>
                        Buka Halaman Lengkap Tentang Kami
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Content: Kebijakan Privasi */}
            {activeModal === "privacy" && (
              <div className="space-y-3.5">
                <h3 className="font-serif text-2xl font-bold tracking-tight">
                  Kebijakan Privasi Pembaca
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-sans">
                  <p>
                    <strong>1. Bebas dari Pelacakan Iklan:</strong> Kami tidak
                    mengumpulkan data pribadi untuk dijual ke broker data atau
                    jaringan iklan. Aktivitas membaca Anda adalah ranah privat.
                  </p>
                  <p>
                    <strong>2. Catatan & Sorotan Teks:</strong> Catatan pinggir
                    (marginalia) dan sorotan naskah tersimpan secara aman dan
                    hanya dibagikan ke publik jika Anda sengaja menekan tombol
                    bagikan.
                  </p>
                  <p>
                    <strong>3. Perlindungan Hak Cipta & DRM Shield:</strong> DRM
                    pada aplikasi berjalan di sisi peramban untuk mencegah
                    scraping bot otomatis, tanpa melanggar privasi pengguna.
                  </p>
                </div>
              </div>
            )}

            {/* Modal Content: Ketentuan Penggunaan */}
            {activeModal === "terms" && (
              <div className="space-y-3.5">
                <h3 className="font-serif text-2xl font-bold tracking-tight">
                  Ketentuan Penggunaan
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-sans">
                  <p>
                    <strong>1. Lisensi Bacaan Personal:</strong> Naskah digital
                    disediakan untuk dinikmati secara pribadi atau bahan telaah
                    pendidikan. Penggandaan massal ilegal tidak diizinkan.
                  </p>
                  <p>
                    <strong>2. Etika Komunitas & Resensi:</strong> Setiap
                    pembaca bebas memberikan ulasan kritis, namun wajib
                    menjunjung tinggi etika diskusi yang konstruktif dan bebas
                    pelecehan.
                  </p>
                  <p>
                    <strong>3. Jaminan Mutu Edisi Fisik:</strong> Buku cetak
                    rakyat bergaransi tukar baru jika terdapat cacat penjilidan,
                    halaman tertukar, atau hasil cetak yang tidak terbaca.
                  </p>
                </div>
              </div>
            )}

            {/* Modal Content: Beri Feedback */}
            {activeModal === "feedback" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-5 text-[var(--color-accent)]" />
                  <h3 className="font-serif text-xl font-bold tracking-tight">
                    Beri Feedback untuk Redaksi
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Suara pembaca membentuk arah pengembangan kurasi dan cetak rakyat AnzaBook.
                </p>

                {feedbackSent ? (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-300 flex items-center gap-3">
                    <Check className="size-5 shrink-0" />
                    <span className="text-sm font-medium">
                      Terima kasih! Feedback Anda telah diterima redaksi AnzaBook.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                    <div>
                      <label className="text-xs font-mono text-muted-foreground block mb-1">
                        Kategori Masukan
                      </label>
                      <select
                        value={feedbackCategory}
                        onChange={(e) => setFeedbackCategory(e.target.value)}
                        className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <option value="Katalog & Naskah">Katalog & Naskah Baru</option>
                        <option value="Kualitas Cetak Rakyat">Kualitas Buku Cetak Rakyat</option>
                        <option value="Pengalaman E-Reader">Pengalaman Baca Digital (E-Reader)</option>
                        <option value="Saran Fitur">Usulan Fitur Baru</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-mono text-muted-foreground block mb-1">
                        Pesan Anda
                      </label>
                      <Textarea
                        rows={4}
                        placeholder="Tuliskan pengalaman, kendala, atau usulan naskah buku yang perlu kami terbitkan..."
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        required
                        className="text-xs leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveModal(null)}
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-[var(--color-accent)] text-white hover:opacity-90"
                      >
                        <Send className="size-3.5 mr-1" />
                        Kirim Feedback
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Modal Content: Gabung Komunitas */}
            {activeModal === "community" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-[var(--color-accent)]" />
                  <h3 className="font-serif text-xl font-bold tracking-tight">
                    Gabung Komunitas AnzaBook
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Kami percaya membaca paling bermakna saat dipercakapkan bersama. Bergabunglah dengan simpul literasi kami di berbagai kota:
                </p>
                <div className="space-y-2.5">
                  <a
                    href="https://t.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors text-xs space-y-1"
                  >
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      <span>Telegram Nakama Literasi</span>
                      <span className="text-[10px] font-mono text-[var(--color-accent)]">Aktif</span>
                    </div>
                    <p className="text-muted-foreground">
                      Diskusi buku mingguan, bedah naskah bersama kurator, dan info pra-pesan edisi cetak rakyat.
                    </p>
                  </a>

                  <a
                    href="https://discord.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors text-xs space-y-1"
                  >
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      <span>Discord Kolektif Pembaca</span>
                      <span className="text-[10px] font-mono text-[var(--color-accent)]">Komunitas</span>
                    </div>
                    <p className="text-muted-foreground">
                      Voice channel membaca bersama hening (Silent Reading Party) dan lokakarya penulisan.
                    </p>
                  </a>
                </div>
              </div>
            )}

            {/* Modal Content: Kirim Naskah */}
            {activeModal === "submit" && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <Mail className="size-5 text-[var(--color-accent)]" />
                  <h3 className="font-serif text-xl font-bold tracking-tight">
                    Penerbitan Terbuka & Kirim Naskah
                  </h3>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-sans">
                  <p>
                    AnzaBook mengundang penulis, pemikir, periset independen, dan pegiat literasi untuk menerbitkan naskah tanpa skema seleksi elitis.
                  </p>
                  <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1.5 border border-border/70 font-mono">
                    <p><strong>Fokus:</strong> Esai Kritis, Sastra Realis, Sejarah, Sains Populer, Ekonomi Politik.</p>
                    <p><strong>Panjang:</strong> 15.000 – 50.000 kata.</p>
                    <p><strong>Royalti:</strong> 12–15% dari harga jual riil, dibayarkan transparan tiap kuartal.</p>
                  </div>
                  <p className="text-xs">
                    Kirimkan proposal naskah beserta sinopsis dan 2 bab sampel ke{" "}
                    <a href="mailto:naskah@anzabook.id" className="text-[var(--color-accent)] underline font-medium">
                      naskah@anzabook.id
                    </a>{" "}
                    dengan subjek [Kirim Naskah] - Judul Buku - Nama Penulis.
                  </p>
                </div>
              </div>
            )}

            {/* Modal Content: Talent Pool */}
            {activeModal === "talent" && (
              <div className="space-y-3.5">
                <h3 className="font-serif text-xl font-bold tracking-tight">
                  AnzaBook Talent Pool
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Kami membuka kesempatan bagi pegiat kreatif untuk berkolaborasi dalam rantai produksi buku terjangkau:
                </p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="p-2.5 rounded-md border border-border bg-muted/30">
                    <p className="font-semibold text-foreground">1. Tipografer & Penata Letak Buku (Typesetter)</p>
                    <p className="text-[11px] mt-0.5">Berpengalaman menata layout buku hemat kertas dengan tipografi presisi.</p>
                  </div>
                  <div className="p-2.5 rounded-md border border-border bg-muted/30">
                    <p className="font-semibold text-foreground">2. Proofreader & Editor Salinan</p>
                    <p className="text-[11px] mt-0.5">Kecermatan tinggi dalam PUEBI dan ritme kalimat bahasa Indonesia.</p>
                  </div>
                  <div className="p-2.5 rounded-md border border-border bg-muted/30">
                    <p className="font-semibold text-foreground">3. Koordinator Simpul Lapak Baca Trotoar</p>
                    <p className="text-[11px] mt-0.5">Mengorganisir titik temu baca fisik di kota atau kabupaten Anda.</p>
                  </div>
                </div>
                <p className="text-xs pt-1">
                  Kirim portofolio atau perkenalan diri ke{" "}
                  <a href="mailto:karir@anzabook.id" className="text-[var(--color-accent)] underline font-medium">
                    karir@anzabook.id
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
