import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

export function AnzaPreloader() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    const hasSeen = sessionStorage.getItem("anzabook-preloader-v1");
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return !hasSeen && !prefersReducedMotion;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const svgPathRef = useRef<SVGPathElement>(null);

  const dismissPreloader = useCallback(() => {
    if (!containerRef.current) {
      setIsVisible(false);
      sessionStorage.setItem("anzabook-preloader-v1", "true");
      return;
    }

    gsap.to(containerRef.current, {
      y: "-100%",
      duration: 0.85,
      ease: "power4.inOut",
      onComplete: () => {
        setIsVisible(false);
        sessionStorage.setItem("anzabook-preloader-v1", "true");
      },
    });
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const tl = gsap.timeline({
      onComplete: () => {
        dismissPreloader();
      },
    });

    if (quoteRef.current && metaRef.current) {
      tl.fromTo(
        quoteRef.current,
        { filter: "blur(14px)", opacity: 0, y: 24 },
        {
          filter: "blur(0px)",
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          delay: 0.2,
        },
      );

      tl.fromTo(
        metaRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "-=0.4",
      );

      tl.to({}, { duration: 1.4 });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismissPreloader();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      tl.kill();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, dismissPreloader]);

  if (!isVisible) return null;

  return (
    <aside
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col justify-between bg-[var(--color-ink)] text-[var(--color-paper)] p-6 md:p-12 overflow-hidden select-none"
      aria-label="Prapemuat Literasi AnzaBook"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Bar: Brand + Skip Button */}
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="/icon.svg"
            alt=""
            width={28}
            height={28}
            className="size-7 rounded-[4px] invert"
          />
          <span className="font-serif text-sm font-semibold tracking-wide uppercase text-white/90">
            AnzaBook
          </span>
          <span className="text-white/40 text-xs font-mono">/ Pustaka Rakyat</span>
        </div>

        <button
          type="button"
          data-testid="skip-preloader"
          aria-label="Lewati prapemuat"
          onClick={dismissPreloader}
          className="cursor-pointer text-xs font-mono uppercase tracking-widest px-3.5 py-1.5 rounded-[4px] border border-white/20 hover:border-white/60 hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] active:translate-y-[1px]"
        >
          Lewati [Esc]
        </button>
      </div>

      {/* Middle: Literary Quote */}
      <div className="w-full max-w-3xl mx-auto my-auto text-center px-4">
        <div
          ref={quoteRef}
          className="font-serif text-2xl md:text-4xl lg:text-5xl font-medium tracking-tight leading-[1.3] text-balance text-[#F6F2E9]"
        >
          &ldquo;Buku tidak boleh menjadi barang mewah kaum ningrat. Dengan memotong
          perantara, kita kembalikan aksara ke tangan rakyat.&rdquo;
        </div>

        <div
          ref={metaRef}
          className="mt-6 md:mt-8 flex items-center justify-center gap-3 text-xs md:text-sm font-mono text-white/60 tracking-wider"
        >
          <span className="h-px w-8 bg-white/20" />
          <span>Sutan Sjahrir &bull; Manifesto Cetak Murah</span>
          <span className="h-px w-8 bg-white/20" />
        </div>
      </div>

      {/* Bottom Bar: Progress indicator */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between text-[11px] font-mono text-white/40 uppercase tracking-widest pt-4 border-t border-white/10">
        <span>Kedaulatan Membaca Indonesia</span>
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[var(--color-accent)] animate-ping" />
          <span>Memuat Pustaka...</span>
        </span>
      </div>

      {/* Decorative SVG curve curtain exit edge */}
      <svg
        className="absolute bottom-0 left-0 w-full pointer-events-none translate-y-[99%]"
        viewBox="0 0 1440 120"
        fill="currentColor"
        preserveAspectRatio="none"
      >
        <path
          ref={svgPathRef}
          d="M0,0 C480,120 960,120 1440,0 L1440,120 L0,120 Z"
          className="text-[var(--color-ink)]"
        />
      </svg>
    </aside>
  );
}
