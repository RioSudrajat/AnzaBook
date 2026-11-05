type ChapterItem = {
  id: string;
  chapterNumber: number;
  title: string;
  isSample: boolean;
};

type ReaderSidebarTocProps = {
  chapters: ChapterItem[];
  currentChapterNumber: number;
  onSelectChapter: (chapterNumber: number) => void;
};

export function ReaderSidebarToc({
  chapters,
  currentChapterNumber,
  onSelectChapter,
}: ReaderSidebarTocProps) {
  return (
    <nav
      aria-label="Daftar Bab Naskah"
      className="hidden lg:block fixed left-4 xl:left-8 top-1/3 -translate-y-8 z-20 w-44 xl:w-52 font-mono text-xs select-none"
    >
      <div className="space-y-3.5">
        {chapters.map((chap) => {
          const isActive = chap.chapterNumber === currentChapterNumber;
          const formattedNumber = String(chap.chapterNumber).padStart(2, "0");

          return (
            <button
              key={chap.id}
              type="button"
              onClick={() => onSelectChapter(chap.chapterNumber)}
              className={`w-full text-left flex items-center gap-2 group transition-all cursor-pointer ${
                isActive
                  ? "text-foreground font-bold translate-x-1"
                  : "text-muted-foreground/60 hover:text-foreground/90 font-normal"
              }`}
              title={chap.title}
            >
              {/* Horizontal Dash Prefix matching SS 2 & SS 4 */}
              <span
                className={`transition-all ${
                  isActive
                    ? "text-[var(--color-accent)] font-bold tracking-tighter"
                    : "opacity-40 group-hover:opacity-80"
                }`}
              >
                {isActive ? "——" : "—"}
              </span>

              <span className="text-[11px] opacity-75 shrink-0">
                {formattedNumber}
              </span>

              <span className="font-serif text-[11px] leading-tight truncate">
                {chap.title}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
