import type { CSSProperties } from "react";
import type { BookSummaryDto } from "@starter/shared/types";
import { cn } from "@/lib/utils";

type CoverBook = Pick<
  BookSummaryDto,
  | "title"
  | "author"
  | "coverColor"
  | "publishedYear"
  | "genres"
  | "pageCount"
>;

function CoverArtwork({ genre }: { genre?: string }) {
  const g = (genre || "").toLowerCase();

  // Motif 1: Sains, Biologi, Alam Semesta (Orbit, lintasan partikel, elips)
  if (g.includes("sains") || g.includes("biologi") || g.includes("alam")) {
    return (
      <svg
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-35 drop-shadow-sm"
        aria-hidden="true"
      >
        <ellipse
          cx="80"
          cy="60"
          rx="65"
          ry="26"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeDasharray="4 3"
          transform="rotate(-25 80 60)"
        />
        <ellipse
          cx="80"
          cy="60"
          rx="65"
          ry="26"
          stroke="currentColor"
          strokeWidth="1.8"
          transform="rotate(35 80 60)"
        />
        <circle cx="80" cy="60" r="14" fill="currentColor" fillOpacity="0.2" />
        <circle cx="80" cy="60" r="6" fill="var(--color-accent, #F06A24)" />
        <circle cx="34" cy="38" r="3" fill="currentColor" />
        <circle cx="126" cy="82" r="3" fill="currentColor" />
        <line
          x1="34"
          y1="38"
          x2="80"
          y2="60"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.5"
        />
      </svg>
    );
  }

  // Motif Khusus: Horor, Misteri, Thriller (Siluet portal lengkung & bulan sabit mistis)
  if (
    g.includes("horor") ||
    g.includes("misteri") ||
    g.includes("thriller") ||
    g.includes("hantu")
  ) {
    return (
      <svg
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-40 drop-shadow-sm"
        aria-hidden="true"
      >
        <path
          d="M48 95 V50 C48 32, 112 32, 112 50 V95"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M58 95 V54 C58 41, 102 41, 102 54 V95"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />
        <circle
          cx="80"
          cy="32"
          r="14"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M74 24 A 12 12 0 0 0 86 40 A 10 10 0 0 1 76 26 Z"
          fill="var(--color-accent, #F06A24)"
        />
        <circle cx="80" cy="70" r="3.5" fill="var(--color-accent, #F06A24)" />
        <line
          x1="30"
          y1="95"
          x2="130"
          y2="95"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }

  // Motif 2: Psikologi, Hubungan Sosial, Antropologi (Siluet kontur kepala & gelombang kognisi)
  if (
    g.includes("psikologi") ||
    g.includes("sosial") ||
    g.includes("antropologi") ||
    g.includes("cinta")
  ) {
    return (
      <svg
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-35 drop-shadow-sm"
        aria-hidden="true"
      >
        <path
          d="M50 95 C50 70, 60 55, 80 55 C100 55, 110 70, 110 95"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="80" cy="40" r="22" stroke="currentColor" strokeWidth="2" />
        <path
          d="M65 40 Q80 20 95 40 Q80 60 65 40 Z"
          fill="var(--color-accent, #F06A24)"
          fillOpacity="0.6"
        />
        <circle
          cx="80"
          cy="40"
          r="34"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <circle
          cx="80"
          cy="40"
          r="46"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />
      </svg>
    );
  }

  // Motif 3: Filsafat, Logika, Pemikiran Kritis (Labirin geometris & arsitektur klasik)
  if (g.includes("filsafat") || g.includes("logika") || g.includes("kritis")) {
    return (
      <svg
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-35 drop-shadow-sm"
        aria-hidden="true"
      >
        <rect
          x="30"
          y="20"
          width="100"
          height="80"
          rx="4"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <rect
          x="44"
          y="32"
          width="72"
          height="56"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeDasharray="3 2"
        />
        <circle
          cx="80"
          cy="60"
          r="18"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M80 20 V100" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
        <path d="M30 60 H130" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
        <circle cx="80" cy="60" r="5" fill="var(--color-accent, #F06A24)" />
      </svg>
    );
  }

  // Motif 4: Ekonomi, Manifesto, Sejarah, Politik (Komposisi Bauhaus / Geometris Konstruktivis)
  if (
    g.includes("ekonomi") ||
    g.includes("manifesto") ||
    g.includes("sejarah") ||
    g.includes("politik")
  ) {
    return (
      <svg
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-35 drop-shadow-sm"
        aria-hidden="true"
      >
        <path
          d="M25 95 L80 18 L135 95 Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="80"
          cy="70"
          r="24"
          fill="currentColor"
          fillOpacity="0.15"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <rect
          x="55"
          y="40"
          width="50"
          height="22"
          fill="var(--color-accent, #F06A24)"
          fillOpacity="0.4"
        />
        <line
          x1="20"
          y1="95"
          x2="140"
          y2="95"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }

  // Motif 5: Sastra, Tipografi, Cerpen, Esai & Default
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full opacity-35 drop-shadow-sm"
      aria-hidden="true"
    >
      <circle
        cx="80"
        cy="60"
        r="44"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="80"
        cy="60"
        r="30"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="4 3"
      />
      <path
        d="M40 60 Q80 25 120 60 Q80 95 40 60 Z"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <circle cx="80" cy="60" r="6" fill="var(--color-accent, #F06A24)" />
    </svg>
  );
}

export function BookCover({
  book,
  className,
  decorative = false,
  edition,
}: {
  book: CoverBook;
  className?: string;
  decorative?: boolean;
  edition?: { paperColor: string; label: string; priceIdr?: number | null };
}) {
  const primaryGenre = book.genres?.[0] || "";

  return (
    <div
      data-book-cover={book.title}
      role={decorative ? undefined : "img"}
      aria-label={
        decorative ? undefined : `Sampul ${book.title}, ${book.author}`
      }
      aria-hidden={decorative || undefined}
      className={cn(
        "relative isolate aspect-[7/10] @container rounded-[2%_5%_5%_2%] shadow-md select-none",
        className,
      )}
      style={
        {
          "--book-cover-color": book.coverColor || "var(--book-cover-base)",
        } as CSSProperties
      }
    >
      <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[inherit] bg-[var(--book-cover-color)] p-[7cqw] text-[var(--book-cover-text)]">
        {/* Subtle cover textures & spine crease */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[var(--book-cover-shade)] pointer-events-none"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[9%] bg-linear-to-r from-[var(--book-cover-spine)] via-[var(--book-cover-crease)] to-transparent pointer-events-none"
        />

        {/* Edition paper accent on the fore-edge */}
        {edition && (
          <span
            aria-hidden="true"
            className="absolute inset-y-[3%] right-0 w-[4%] rounded-r-sm"
            style={{ backgroundColor: edition.paperColor }}
          />
        )}

        {/* HEADER: Year/Tag on the left, AnzaBook brand mark on the right */}
        <div className="relative z-10 flex min-w-0 items-center justify-between gap-1 border-b border-current/15 pb-[2.5cqw]">
          <span className="font-mono text-[4.2cqw] font-semibold opacity-80">
            {book.publishedYear}
          </span>

          {/* AnzaBook Logo & Brand Name on Top Right */}
          <div className="flex items-center gap-[1.5cqw] text-[var(--book-cover-text)]">
            <svg
              viewBox="0 0 64 64"
              className="size-[4.4cqw] shrink-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect width="64" height="64" rx="14" fill="#13110F" />
              <path
                d="M14 50V16C14 12.5 17 9.5 20.5 9.5H25V50H14Z"
                fill="#F6F2E9"
              />
              <path
                d="M25 11.5H38C44 11.5 48 15 48 20C48 23.8 45.2 26.5 41.5 27.2C46.2 28 50 31.5 50 36.8C50 42.5 45 46.5 38 46.5H25V40.5H37C40.8 40.5 43.2 38.8 43.2 35.6C43.2 32.2 40.5 30.5 36.2 30.5H25V11.5Z"
                fill="#F06A24"
              />
            </svg>
            <span className="font-sans font-bold text-[3.8cqw] tracking-wider uppercase">
              AnzaBook
            </span>
          </div>
        </div>

        {/* CENTER BODY: Dynamic Visual Artwork + Title */}
        <div className="relative z-10 my-auto flex flex-col items-center text-center px-[2cqw]">
          {/* Visual Artwork Motif */}
          <div className="w-[85%] max-w-[120px] aspect-[4/3] my-[2cqw] flex items-center justify-center pointer-events-none">
            <CoverArtwork genre={primaryGenre} />
          </div>

          {/* Book Title */}
          <h4 className="font-serif text-[7.8cqw] leading-[1.15] font-bold tracking-tight text-[var(--book-cover-text)] line-clamp-3 break-words drop-shadow-xs">
            {book.title}
          </h4>

          {/* Subtle genre/category pill under title */}
          {primaryGenre && (
            <span className="mt-[2.5cqw] inline-block font-mono text-[3.4cqw] uppercase tracking-widest px-[2.5cqw] py-[0.5cqw] rounded-full bg-current/10 opacity-75">
              {primaryGenre}
            </span>
          )}
        </div>

        {/* FOOTER: Author Name centered at the bottom (No Price) */}
        <div className="relative z-10 text-center border-t border-current/20 pt-[3cqw] pb-[0.5cqw] px-[1cqw]">
          <p className="truncate text-[4.6cqw] font-serif font-semibold tracking-wide uppercase text-[var(--book-cover-text)]">
            {book.author}
          </p>
        </div>
      </div>
    </div>
  );
}
