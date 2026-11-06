import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Flame,
  Share2,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { z } from "zod";
import {
  splitChapterIntoPages,
  computeBookPagination,
  getGlobalPageNumber,
  getChapterAndPageFromGlobal,
} from "@starter/shared/chapter-pagination";
import { bookProgressPercent } from "@starter/shared/reading-progress";
import type { BookHighlightDto, HighlightColor } from "@starter/shared/types";
import type { SaveReadingProgressInput } from "@starter/shared/validators/reading";
import { Button } from "@/components/ui/button";
import {
  useBookHighlights,
  useBookReader,
  useCreateHighlight,
  useDeleteHighlight,
  useReadingProgress,
  useSaveReadingProgress,
} from "@/features/books/hooks";
import { booksKeys } from "@/features/books/queries";
import { ApiError } from "@/lib/api/client";
import { useCreateReadingSession } from "@/features/community/hooks";
import { AudiobookBar } from "@/features/reader/components/audiobook-bar";
import { DrmShield } from "@/features/reader/components/drm-shield";
import { GlossyProgressBar } from "@/features/reader/components/glossy-progress-bar";
import { HighlightPopover } from "@/features/reader/components/highlight-popover";
import { HighlightStoryDialog } from "@/features/reader/components/highlight-story-dialog";
import { HighlightsSidebar } from "@/features/reader/components/highlights-sidebar";
import { MarginaliaDrawer } from "@/features/reader/components/marginalia-drawer";
import { ReaderSidebarToc } from "@/features/reader/components/reader-sidebar-toc";
import { RatingDialog } from "@/features/reader/components/rating-dialog";
import { ReaderSlideView } from "@/features/reader/components/reader-slide-view";
import {
  type LanguageView,
  type ReaderFont,
  type ReaderTheme,
  type ReadingLayout,
  ReaderToolbar,
} from "@/features/reader/components/reader-toolbar";

const readSearchSchema = z.object({
  mode: z.enum(["full", "blueprint", "audio"]).optional(),
  chapter: z.coerce.number().int().min(1).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional(),
  drm: z.coerce.boolean().optional(),
});

export const Route = createFileRoute("/_protected/read/$slug")({
  validateSearch: readSearchSchema,
  component: ReaderPage,
});

function splitParagraphs(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Helper to render text with interactive fluorescent stabilo marks
function renderHighlightedText(
  text: string,
  highlights: BookHighlightDto[],
  onFlexHighlight: (h: BookHighlightDto) => void,
) {
  if (!highlights.length || !text) return text;

  type Match = { start: number; end: number; highlight: BookHighlightDto };
  const matches: Match[] = [];

  for (const h of highlights) {
    const rawQuery = h.selectedText ? h.selectedText.trim() : "";
    if (rawQuery.length < 2) continue;

    let idx = text.indexOf(rawQuery);
    if (idx !== -1) {
      while (idx !== -1) {
        matches.push({
          start: idx,
          end: idx + rawQuery.length,
          highlight: h,
        });
        idx = text.indexOf(rawQuery, idx + 1);
      }
    } else {
      // Fallback: match with whitespace tolerance for line breaks or spacing variations
      try {
        const escaped = rawQuery
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\s+/g, "\\s+");
        const regex = new RegExp(escaped, "g");
        let regMatch: RegExpExecArray | null;
        while ((regMatch = regex.exec(text)) !== null) {
          matches.push({
            start: regMatch.index,
            end: regMatch.index + regMatch[0].length,
            highlight: h,
          });
        }
      } catch {
        // Ignore regex compilation issues
      }
    }
  }

  if (!matches.length) return text;

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Filter overlapping matches
  const nonOverlapping: Match[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      nonOverlapping.push(m);
      lastEnd = m.end;
    }
  }

  const elements: React.ReactNode[] = [];
  let cursor = 0;

  nonOverlapping.forEach((m, i) => {
    if (m.start > cursor) {
      elements.push(text.slice(cursor, m.start));
    }

    const h = m.highlight;
    const colorBg =
      h.color === "green"
        ? "bg-emerald-300 dark:bg-emerald-400/50 text-neutral-900 dark:text-emerald-100 font-medium px-1 py-0.5 rounded-[3px] shadow-[0_1px_3px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/30"
        : h.color === "coral"
          ? "bg-rose-300 dark:bg-rose-400/50 text-neutral-900 dark:text-rose-100 font-medium px-1 py-0.5 rounded-[3px] shadow-[0_1px_3px_rgba(244,63,94,0.25)] ring-1 ring-rose-400/30"
          : h.color === "blue"
            ? "bg-sky-300 dark:bg-sky-400/50 text-neutral-900 dark:text-sky-100 font-medium px-1 py-0.5 rounded-[3px] shadow-[0_1px_3px_rgba(14,165,233,0.25)] ring-1 ring-sky-400/30"
            : "bg-amber-300 dark:bg-amber-400/50 text-neutral-900 dark:text-amber-100 font-medium px-1 py-0.5 rounded-[3px] shadow-[0_1px_3px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30";

    elements.push(
      <mark
        key={`${h.id}-${i}`}
        id={`highlight-${h.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onFlexHighlight(h);
        }}
        className={`rounded-xs cursor-pointer transition-all hover:brightness-105 active:scale-98 ${colorBg}`}
        title="Stabilo AnzaBook: Klik untuk Flex kutipan ini ke Instagram Story atau WhatsApp"
      >
        {text.slice(m.start, m.end)}
      </mark>,
    );

    cursor = m.end;
  });

  if (cursor < text.length) {
    elements.push(text.slice(cursor));
  }

  return elements;
}

function ReaderPage() {
  const { slug } = Route.useParams();
  const { chapter } = Route.useSearch();
  return <ReaderBook key={`${slug}:${chapter ?? ""}`} />;
}

const paragraphsPerPage = 5;

function slideChapterPercent(pageIndex: number, pageCount: number) {
  return Math.min(99, Math.round(((pageIndex + 1) / pageCount) * 100));
}

function chapterSection(chapterNumber: number) {
  return document.getElementById(`chapter-sec-${chapterNumber}`);
}

function ReaderBook() {
  const { user } = Route.useRouteContext().session;
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requestedChapter = search.chapter ?? 1;

  const {
    data: payload,
    isLoading,
    isError,
    error,
    refetch,
  } = useBookReader(slug, {
    mode: "full",
    chapter: requestedChapter,
    continuous: true,
  });

  const bookId = payload?.book?.id || "";
  const scope = payload?.hasFullAccess ? "full" : "preview";

  const { data: savedProgress, isPending: progressPending } =
    useReadingProgress(bookId, scope);
  const previewCheckpoint = useReadingProgress(
    scope === "full" && !savedProgress ? bookId : "",
    "preview",
  );
  const saveProgressMutation = useSaveReadingProgress(bookId, scope);
  const { data: bookHighlights = [] } = useBookHighlights(bookId);
  const createHighlightMutation = useCreateHighlight(bookId);
  const deleteHighlightMutation = useDeleteHighlight(bookId);

  // Local optimistic highlights to ensure immediate instant stabilo rendering
  const [optimisticHighlights, setOptimisticHighlights] = useState<
    BookHighlightDto[]
  >([]);

  // Combined merged highlights (optimistic + fetched from server)
  const allHighlights = [
    ...optimisticHighlights.filter(
      (oh) =>
        !bookHighlights.some(
          (bh) => bh.id === oh.id || bh.selectedText === oh.selectedText,
        ),
    ),
    ...bookHighlights,
  ];

  // Reader Settings State
  const [theme, setTheme] = useState<ReaderTheme>("manila");
  const [fontFamily, setFontFamily] = useState<ReaderFont>("serif");
  const [fontSize, setFontSize] = useState<number>(18);
  // Default language: Bahasa Indonesia (not split)
  const [languageView, setLanguageView] = useState<LanguageView>("id");
  const [readingLayout, setReadingLayout] = useState<ReadingLayout>("scroll");
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isDrmEnabled, setIsDrmEnabled] = useState<boolean>(
    search.drm ?? false,
  );
  const [isHighlightsOpen, setIsHighlightsOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [slideDirection, setSlideDirection] = useState(0);

  const [slidePosition, setSlidePosition] = useState({
    chapter: requestedChapter,
    page: 0,
  });
  const [scrollPosition, setScrollPosition] = useState({
    chapter: requestedChapter,
    percent: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [expiredAccess, setExpiredAccess] = useState<string | null>(null);

  // Marginalia & Finish Modal State
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number>(0);
  const [marginaliaParagraph, setMarginaliaParagraph] = useState<number | null>(
    null,
  );
  const [isFinishModalOpen, setIsFinishModalOpen] = useState<boolean>(false);
  const [sessionSummary, setSessionSummary] = useState<{
    durationMinutes: number;
    pagesRead: number;
    wpm: number;
  } | null>(null);

  // Highlight Story Dialog State
  const [storyDialogData, setStoryDialogData] = useState<{
    isOpen: boolean;
    text: string;
    color: HighlightColor;
    note?: string;
  }>({
    isOpen: false,
    text: "",
    color: "yellow",
  });

  const readerCanvasRef = useRef<HTMLDivElement>(null);
  const paywallRef = useRef<HTMLElement>(null);
  const startTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const pendingCheckpoint = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const createSessionMutation = useCreateReadingSession();
  const hasRestoredRef = useRef(false);
  const { mutate: saveProgress, mutateAsync: saveProgressAsync } =
    saveProgressMutation;

  useEffect(() => {
    startTimeRef.current = Date.now();
    return () => clearTimeout(pendingCheckpoint.current);
  }, []);

  const selectedChapter =
    readingLayout === "scroll" ? scrollPosition.chapter : slidePosition.chapter;
  const chapter =
    payload?.chapters?.find((item) => item.chapterNumber === selectedChapter) ??
    payload?.currentChapter;
  const activeChapterNum = chapter?.chapterNumber ?? requestedChapter;
  const activeChapterContent =
    languageView === "en" && chapter?.contentEn
      ? chapter.contentEn
      : chapter?.contentId;

  const accessibleChapters =
    payload?.chapters && payload.chapters.length > 0
      ? payload.chapters
      : chapter
        ? [chapter]
        : [];
  const bookPagination = computeBookPagination(
    accessibleChapters,
    languageView,
    paragraphsPerPage,
  );
  const currentChapterPagination =
    bookPagination.chapters.find((c) => c.chapterNumber === activeChapterNum) ??
    bookPagination.chapters[0];
  const pageCount = currentChapterPagination?.pageCount ?? 1;

  const chapterPages = splitChapterIntoPages(activeChapterContent);
  const slidePageIndex =
    slidePosition.chapter === activeChapterNum
      ? Math.max(0, Math.min(pageCount - 1, slidePosition.page))
      : 0;
  const currentPageObj = chapterPages[slidePageIndex] ?? chapterPages[0];
  const globalPageNumber = getGlobalPageNumber(
    activeChapterNum,
    slidePageIndex,
    bookPagination,
  );
  const totalPages = bookPagination.totalPages;

  const chapterParagraphs = splitParagraphs(chapter?.contentId);
  const chapterParagraphCount = chapterParagraphs.length;
  const progress =
    savedProgress ?? (scope === "full" ? previewCheckpoint.data : null);
  const waitingForCheckpoint =
    search.chapter === undefined &&
    (progressPending ||
      (scope === "full" && !savedProgress && previewCheckpoint.isPending));

  useEffect(() => {
    if (!payload || hasRestoredRef.current) return;
    if (waitingForCheckpoint) return;
    const checkpoint = search.chapter === undefined ? progress : null;
    const savedChapter = payload.chapters?.find(
      (item) => item.chapterNumber === checkpoint?.lastChapterNumber,
    );
    const frame = requestAnimationFrame(() => {
      hasRestoredRef.current = true;
      if (savedChapter && checkpoint?.layout === "slide") {
        setReadingLayout("slide");
        if (checkpoint.lastPageNumber) {
          const resolved = getChapterAndPageFromGlobal(
            checkpoint.lastPageNumber,
            bookPagination,
          );
          setSlidePosition({
            chapter: resolved.chapterNumber,
            page: resolved.localPageIndex,
          });
        } else {
          setSlidePosition({
            chapter: savedChapter.chapterNumber,
            page: 0,
          });
        }
        return;
      }
      if (
        !savedChapter &&
        requestedChapter === payload.chapters?.[0]?.chapterNumber
      )
        return;

      const target = savedChapter?.chapterNumber ?? requestedChapter;
      const section = chapterSection(target);
      if (!section) return;
      setScrollPosition({
        chapter: target,
        percent: checkpoint?.lastScrollPercent ?? 0,
      });
      if (
        payload.hasFullAccess &&
        checkpoint === savedProgress &&
        savedChapter &&
        savedChapter.id === payload.chapters?.at(-1)?.id &&
        checkpoint?.layout === "scroll" &&
        checkpoint.lastScrollPercent === 100
      ) {
        window.scrollTo({ top: document.documentElement.scrollHeight });
        return;
      }
      const marker = section.querySelector(
        `[data-reader-paragraph="${checkpoint?.lastParagraphIndex}"]`,
      );
      if (marker && (checkpoint?.lastScrollPercent ?? 0) > 0) {
        marker.scrollIntoView({ block: "start" });
      } else if (
        savedChapter &&
        checkpoint?.layout === "scroll" &&
        checkpoint.lastScrollPercent > 0
      ) {
        const top = section.getBoundingClientRect().top + window.scrollY;
        const length = Math.max(
          0,
          section.clientHeight - window.innerHeight * 0.6,
        );
        window.scrollTo({
          top: top + (length * checkpoint.lastScrollPercent) / 100,
        });
      } else {
        section.scrollIntoView({ block: "start" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [
    bookPagination,
    payload,
    progress,
    requestedChapter,
    savedProgress,
    search.chapter,
    waitingForCheckpoint,
  ]);

  useEffect(() => {
    const deadline = payload?.accessExpiresAt;
    if (!deadline) return;
    const expiresAt = Date.parse(deadline);
    let timer: ReturnType<typeof setTimeout>;
    function checkAccess() {
      clearTimeout(timer);
      const remaining = expiresAt - Date.now();
      if (remaining > 0) {
        timer = setTimeout(checkAccess, Math.min(remaining, 2_147_483_647));
        return;
      }
      setExpiredAccess(deadline ?? null);
      clearTimeout(pendingCheckpoint.current);
      queryClient.removeQueries({
        queryKey: booksKeys.readers(),
        type: "inactive",
      });
      void refetch();
    }
    checkAccess();
    window.addEventListener("focus", checkAccess);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", checkAccess);
    };
  }, [payload?.accessExpiresAt, queryClient, refetch]);

  const capturePosition = useCallback(
    (page = slidePageIndex): SaveReadingProgressInput | null => {
      if (!chapter || !hasRestoredRef.current) return null;
      let positionChapter = chapter;
      let paragraphCount = chapterParagraphCount;
      const currentGlobal = getGlobalPageNumber(
        positionChapter.chapterNumber,
        page,
        bookPagination,
      );
      let percent =
        readingLayout === "slide"
          ? Math.min(
              99,
              Math.round((currentGlobal / bookPagination.totalPages) * 100),
            )
          : slideChapterPercent(page, pageCount);
      let paragraph = page * paragraphsPerPage;
      if (readingLayout === "scroll") {
        const sections = readerCanvasRef.current?.querySelectorAll<HTMLElement>(
          "section[data-chapter-number]",
        );
        if (!sections?.length) return null;
        const finalSection = sections[sections.length - 1];
        const viewportMarker = window.innerHeight * 0.36;
        const scrollRoot = document.scrollingElement;
        const scrollTop = scrollRoot?.scrollTop ?? 0;
        const maxScroll = scrollRoot
          ? scrollRoot.scrollHeight - scrollRoot.clientHeight
          : 0;
        const atBookEnd =
          payload?.hasFullAccess &&
          maxScroll > 0 &&
          scrollTop > 0 &&
          maxScroll - scrollTop <= 1;
        let body = sections[0];
        for (const section of sections) {
          if (section.getBoundingClientRect().top > viewportMarker) break;
          body = section;
        }
        if (atBookEnd) body = finalSection;
        const visibleChapter = payload?.chapters?.find(
          (item) => item.chapterNumber === Number(body.dataset.chapterNumber),
        );
        if (visibleChapter) {
          positionChapter = visibleChapter;
          if (visibleChapter !== chapter)
            paragraphCount = splitParagraphs(visibleChapter.contentId).length;
        }
        const rect = body.getBoundingClientRect();
        if (atBookEnd) {
          percent = 100;
        } else if (payload?.hasFullAccess && body === finalSection) {
          // A short final chapter may never reach the top before scrolling ends.
          const chapterStart = Math.max(
            0,
            scrollTop +
              rect.top -
              parseFloat(getComputedStyle(body).scrollMarginTop),
          );
          const range = Math.max(1, maxScroll - chapterStart);
          percent = Math.min(
            99,
            Math.max(0, Math.floor(((scrollTop - chapterStart) / range) * 100)),
          );
        } else {
          const range = Math.max(1, rect.height - viewportMarker);
          percent = Math.min(
            100,
            Math.max(0, Math.round((-rect.top / range) * 100)),
          );
        }
        paragraph = 0;
        for (const marker of body.querySelectorAll<HTMLElement>(
          "[data-reader-paragraph]",
        )) {
          if (
            atBookEnd ||
            marker.getBoundingClientRect().top <= viewportMarker
          ) {
            paragraph = Number(marker.dataset.readerParagraph);
          }
        }
      }
      const lastParagraphIndex = Math.min(
        paragraph,
        Math.max(0, paragraphCount - 1),
      );
      return {
        lastChapterId: positionChapter.id,
        lastChapterNumber: positionChapter.chapterNumber,
        lastPageNumber:
          readingLayout === "slide"
            ? currentGlobal
            : Math.floor(lastParagraphIndex / paragraphsPerPage) + 1,
        lastScrollPercent: percent,
        lastParagraphIndex,
        layout: readingLayout,
        capturedAt: Date.now(),
      };
    },
    [
      bookPagination,
      chapter,
      chapterParagraphCount,
      pageCount,
      payload?.chapters,
      payload?.hasFullAccess,
      readingLayout,
      slidePageIndex,
    ],
  );

  const queueCheckpoint = useCallback(
    (position: SaveReadingProgressInput) => {
      clearTimeout(pendingCheckpoint.current);
      pendingCheckpoint.current = setTimeout(
        () => saveProgress(position),
        1800,
      );
    },
    [saveProgress],
  );

  useEffect(() => {
    if (!chapter || readingLayout !== "scroll") return;
    const handleScroll = () => {
      const position = capturePosition();
      if (
        !position ||
        savingRef.current ||
        (expiredAccess !== null && expiredAccess === payload?.accessExpiresAt)
      )
        return;
      setScrollPosition((previous) =>
        previous.chapter === position.lastChapterNumber &&
        previous.percent === position.lastScrollPercent
          ? previous
          : {
              chapter: position.lastChapterNumber,
              percent: position.lastScrollPercent,
            },
      );
      queueCheckpoint(position);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [
    capturePosition,
    chapter,
    expiredAccess,
    payload?.accessExpiresAt,
    queueCheckpoint,
    readingLayout,
  ]);

  function turnPage(page: number, dir = 0) {
    if (dir !== 0) setSlideDirection(dir);
    setSlidePosition({ chapter: activeChapterNum, page });
    const position = capturePosition(page);
    if (position) queueCheckpoint(position);
    window.scrollTo({ top: 0 });
  }

  function changeReadingLayout(layout: ReadingLayout) {
    if (layout === readingLayout) return;
    const position = capturePosition();
    if (layout === "slide") {
      if (position?.lastPageNumber) {
        const resolved = getChapterAndPageFromGlobal(
          position.lastPageNumber,
          bookPagination,
        );
        setSlidePosition({
          chapter: resolved.chapterNumber,
          page: resolved.localPageIndex,
        });
      } else {
        setSlidePosition({
          chapter: position?.lastChapterNumber ?? activeChapterNum,
          page: 0,
        });
      }
      setReadingLayout(layout);
      window.scrollTo({ top: 0 });
      return;
    }
    setScrollPosition({ chapter: activeChapterNum, percent: 0 });
    setReadingLayout(layout);
    requestAnimationFrame(() => {
      const section = chapterSection(activeChapterNum);
      const marker = section?.querySelector(
        `[data-reader-paragraph="${position?.lastParagraphIndex}"]`,
      );
      (slidePageIndex > 0 && marker ? marker : section)?.scrollIntoView({
        block: "start",
      });
    });
  }

  async function handleSelectChapter(ch: number) {
    if (ch === activeChapterNum) return;
    if (!payload?.hasFullAccess) {
      paywallRef.current?.focus();
      return;
    }
    if (readingLayout === "scroll") {
      chapterSection(ch)?.scrollIntoView({ block: "start" });
      return;
    }
    const position = capturePosition();
    clearTimeout(pendingCheckpoint.current);
    if (position) {
      try {
        await saveProgressAsync(position);
      } catch {
        setSaveError(true);
        return;
      }
    }
    setSaveError(false);
    setSlideDirection(ch > activeChapterNum ? 1 : -1);
    setSlidePosition({ chapter: ch, page: 0 });
    window.scrollTo({ top: 0 });
  }

  // Handle Flexing a specific highlight
  const handleFlexHighlight = (h: BookHighlightDto) => {
    setStoryDialogData({
      isOpen: true,
      text: h.selectedText,
      color: h.color,
      note: h.note || undefined,
    });
  };

  // Handle Selecting a highlight in sidebar: scroll directly to that text
  const handleSelectHighlight = (h: BookHighlightDto) => {
    const el = document.getElementById(`highlight-${h.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-4", "ring-amber-400", "ring-offset-2");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-amber-400", "ring-offset-2");
      }, 2500);
    } else {
      handleSelectChapter(h.chapterNumber);
    }
  };

  // Handle saving highlight with optimistic immediate update
  const handleSaveHighlight = async (data: {
    selectedText: string;
    color: HighlightColor;
    note?: string;
    chapterNumber?: number;
  }) => {
    const targetChapter = data.chapterNumber ?? activeChapterNum;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optHighlight: BookHighlightDto = {
      id: tempId,
      userId: user.id,
      bookId,
      chapterId: null,
      chapterNumber: targetChapter,
      pageNumber: slidePageIndex + 1,
      selectedText: data.selectedText.trim(),
      color: data.color,
      note: data.note || null,
      createdAt: new Date().toISOString(),
    };

    // 1. Instantly show highlight in text and increment counter
    setOptimisticHighlights((prev) => [optHighlight, ...prev]);

    // 2. Persist to API
    try {
      const saved = await createHighlightMutation.mutateAsync({
        bookId,
        chapterNumber: targetChapter,
        pageNumber: slidePageIndex + 1,
        selectedText: data.selectedText.trim(),
        color: data.color,
        note: data.note,
      });

      // Replace temp highlight with server result
      setOptimisticHighlights((prev) =>
        prev.map((h) => (h.id === tempId ? saved : h)),
      );
    } catch (err) {
      console.error("Gagal menyimpan stabilo ke server:", err);
    }
  };

  // Handle deleting highlight
  const handleDeleteHighlight = async (id: string) => {
    setOptimisticHighlights((prev) => prev.filter((h) => h.id !== id));
    try {
      await deleteHighlightMutation.mutateAsync(id);
    } catch (err) {
      console.error("Gagal menghapus stabilo:", err);
    }
  };

  async function saveSession(
    destination: "home" | "membership" | "summary",
    finishedBook = false,
  ) {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setSaveError(false);
    clearTimeout(pendingCheckpoint.current);

    try {
      const position = capturePosition();
      if (bookId && position) {
        const finalChapter =
          payload?.allChapters.at(-1)?.chapterNumber ===
          position.lastChapterNumber;
        const finalPage =
          readingLayout === "slide" && slidePageIndex === pageCount - 1;
        if (
          destination === "summary" &&
          finalChapter &&
          (finishedBook || finalPage) &&
          scope === "full"
        ) {
          position.lastScrollPercent = 100;
        }
        await saveProgressAsync(position);
        if (startTimeRef.current) {
          const durationSeconds = Math.min(
            28_800,
            Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
          );
          const positionChapter = payload?.chapters?.find(
            (item) => item.chapterNumber === position.lastChapterNumber,
          );
          const words = splitParagraphs(
            positionChapter?.contentId ?? chapter?.contentId,
          )
            .slice(0, (position.lastParagraphIndex ?? 0) + 1)
            .join(" ")
            .split(/\s+/)
            .filter(Boolean).length;
          const pagesRead = Math.max(1, Math.ceil(words / 250));
          const wpm = Math.max(
            30,
            Math.min(1200, Math.round((words * 60) / durationSeconds)),
          );
          sessionIdRef.current ??= crypto.randomUUID();
          await createSessionMutation.mutateAsync({
            sessionId: sessionIdRef.current,
            bookId,
            pagesRead,
            durationSeconds,
            avgWpm: wpm,
            mode: "full",
          });
          sessionIdRef.current = null;
          startTimeRef.current = 0;
          setSessionSummary({
            durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
            pagesRead,
            wpm,
          });
        }
      }
      if (destination === "home") {
        await navigate({ to: "/app", search: { tab: "home" } });
      } else if (destination === "membership") {
        await navigate({ to: "/membership", search: { book: slug } });
      } else {
        setIsFinishModalOpen(true);
      }
    } catch {
      setSaveError(true);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  function handleUpgrade(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    void saveSession("membership");
  }

  function closeSessionSummary() {
    setIsFinishModalOpen(false);
    startTimeRef.current = Date.now();
  }

  const isLocked =
    error instanceof ApiError && error.code === "FORBIDDEN_DIGITAL_ACCESS";
  const isExpired =
    expiredAccess !== null && expiredAccess === payload?.accessExpiresAt;
  const isMissing = error instanceof ApiError && error.status === 404;

  if (
    isLoading ||
    (payload && !isError && !isExpired && waitingForCheckpoint)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-muted-foreground animate-pulse">
            Memuat Naskah Buku...
          </p>
        </div>
      </div>
    );
  }

  if (isLocked || isExpired) {
    return (
      <main
        id="main-content"
        className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <h1 className="font-serif text-3xl font-semibold">Bab ini terkunci</h1>
        <p className="text-muted-foreground">
          Buka cuplikan atau aktifkan akses untuk lanjut membaca naskah lengkap.
        </p>
        <Button asChild size="lg">
          <Link to="/read/$slug" params={{ slug }} search={{ chapter: 1 }}>
            Baca cuplikan
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/membership" search={{ book: slug }}>
            Jadi Nakama
          </Link>
        </Button>
        <Link
          to="/app"
          search={{ tab: "home" }}
          className="rounded-sm px-3 py-3 text-sm underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Keluar ke Home
        </Link>
      </main>
    );
  }

  if (isError || !payload) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <h2 className="font-serif text-2xl font-bold mb-2">
          {isMissing ? "Naskah tidak ditemukan" : "Naskah belum bisa dimuat"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {isMissing
            ? "Buka detail buku untuk melihat bab yang tersedia."
            : "Periksa koneksi, lalu coba buka naskah lagi."}
        </p>
        {!isMissing && (
          <Button className="mb-3" onClick={() => void refetch()}>
            Coba lagi
          </Button>
        )}
        <Button asChild>
          <Link to="/books/$slug" params={{ slug }}>
            Kembali ke Halaman Buku
          </Link>
        </Button>
      </div>
    );
  }

  const { book, allChapters, watermark } = payload;
  const currentChapter = chapter ?? payload.currentChapter;
  const chaptersList = payload.chapters ?? [currentChapter];
  const isPremiumPreview =
    !payload.hasFullAccess && book.accessTier === "premium";
  const chapterIndex = allChapters.findIndex(
    (item) => item.chapterNumber === activeChapterNum,
  );
  const nextChapter = payload.hasFullAccess
    ? allChapters[chapterIndex + 1]?.chapterNumber
    : undefined;
  const previousChapter = payload.hasFullAccess
    ? allChapters[chapterIndex - 1]?.chapterNumber
    : undefined;
  const hasNextChapter = nextChapter !== undefined;
  const hasPrevChapter = previousChapter !== undefined;

  function goToPreviousSlide() {
    setSlideDirection(-1);
    if (slidePageIndex > 0) {
      turnPage(slidePageIndex - 1, -1);
    } else if (hasPrevChapter && previousChapter !== undefined) {
      const prevSummary = bookPagination.chapters.find(
        (c) => c.chapterNumber === previousChapter,
      );
      const targetPage = prevSummary ? Math.max(0, prevSummary.pageCount - 1) : 0;
      setSlidePosition({ chapter: previousChapter, page: targetPage });
      const position = capturePosition(targetPage);
      if (position) queueCheckpoint(position);
      window.scrollTo({ top: 0 });
    }
  }

  function goToNextSlide() {
    setSlideDirection(1);
    if (slidePageIndex < pageCount - 1) {
      turnPage(slidePageIndex + 1, 1);
    } else if (hasNextChapter && nextChapter !== undefined) {
      setSlidePosition({ chapter: nextChapter, page: 0 });
      const position = capturePosition(0);
      if (position) queueCheckpoint(position);
      window.scrollTo({ top: 0 });
    }
  }

  // Theme styling
  const themeClass =
    theme === "manila"
      ? "bg-[#FAF6EE] text-[#1C1917]"
      : theme === "sepia"
        ? "bg-[#F4ECD8] text-[#2A2218]"
        : "bg-[#13110F] text-[#EDE8DF]";

  const fontClass =
    fontFamily === "serif"
      ? "font-serif"
      : fontFamily === "sans"
        ? "font-sans"
        : "font-sans tracking-wide";

  const chapterPercent =
    readingLayout === "slide"
      ? Math.min(100, Math.round((globalPageNumber / totalPages) * 100))
      : scrollPosition.percent;
  const currentPercent = payload.hasFullAccess
    ? readingLayout === "slide"
      ? Math.min(100, Math.round((globalPageNumber / totalPages) * 100))
      : bookProgressPercent(chapterIndex, allChapters.length, chapterPercent)
    : chapterPercent;

  return (
    <DrmShield watermarkText={watermark} enabled={isDrmEnabled}>
      <div
        className={`${
          readingLayout === "slide"
            ? "h-screen max-h-screen overflow-hidden"
            : "min-h-screen"
        } flex flex-col transition-colors duration-300 ${themeClass}`}
      >
        {/* Sticky Header: Reader Toolbar + Audio Player (stacked in single sticky container so they NEVER overlap) */}
        <div className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-md border-b border-border shadow-xs transition-colors">
          <ReaderToolbar
            bookTitle={book.title}
            readingLayout={readingLayout}
            onReadingLayoutChange={changeReadingLayout}
            languageView={languageView}
            onLanguageViewChange={setLanguageView}
            theme={theme}
            onThemeChange={setTheme}
            fontFamily={fontFamily}
            onFontFamilyChange={setFontFamily}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            currentChapter={activeChapterNum}
            allChapters={allChapters}
            onSelectChapter={handleSelectChapter}
            onFinishSession={() => void saveSession("summary")}
            onExit={() => void saveSession("home")}
            isSaving={isSaving}
            isAudioOpen={isAudioOpen}
            onToggleAudio={
              currentChapter.audioUrl
                ? () => setIsAudioOpen(!isAudioOpen)
                : undefined
            }
            isDrmEnabled={isDrmEnabled}
            onToggleDrm={() => setIsDrmEnabled((prev) => !prev)}
            isHighlightsOpen={isHighlightsOpen}
            onToggleHighlights={() => setIsHighlightsOpen(!isHighlightsOpen)}
            highlightCount={allHighlights.length}
            onShare={() => {
              const firstHighlight = allHighlights[0];
              setStoryDialogData({
                isOpen: true,
                text: firstHighlight
                  ? firstHighlight.selectedText
                  : book.synopsis.slice(0, 180),
                color: firstHighlight ? firstHighlight.color : "yellow",
                note: firstHighlight?.note || undefined,
              });
            }}
          />

          {/* Floating Audio Player when Opened */}
          {isAudioOpen && currentChapter.audioUrl && (
            <div className="border-t border-border/70 bg-card/60 backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
              <AudiobookBar
                key={currentChapter.id}
                audioUrl={currentChapter.audioUrl}
                totalDurationSeconds={
                  currentChapter.audioDurationSeconds || 900
                }
                activeParagraphIndex={activeParagraphIndex}
                totalParagraphs={chapterParagraphCount}
                onParagraphChange={(idx) => {
                  setActiveParagraphIndex(idx);
                  chapterSection(currentChapter.chapterNumber)
                    ?.querySelector(`[data-reader-paragraph="${idx}"]`)
                    ?.scrollIntoView({ block: "center" });
                }}
                onClose={() => setIsAudioOpen(false)}
              />
            </div>
          )}
        </div>

        {/* Left Dynamic TOC Sidebar (Only rendered in Scroll Mode; hidden in Slide Mode so it never obstructs the book spread) */}
        {readingLayout === "scroll" && (
          <ReaderSidebarToc
            chapters={allChapters}
            currentChapterNumber={activeChapterNum}
            onSelectChapter={handleSelectChapter}
          />
        )}

        {/* Centered Document Reader Canvas */}
        <main
          id="main-content"
          ref={readerCanvasRef}
          className={`w-full mx-auto transition-all ${
            readingLayout === "slide"
              ? "max-w-[1440px] px-3 sm:px-6 lg:px-8 py-1 sm:py-2 flex-1 h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] overflow-hidden flex flex-col justify-between"
              : "max-w-2xl sm:max-w-[700px] px-4 sm:px-6 py-10 pb-40"
          }`}
        >
          {saveError && (
            <p
              role="alert"
              className="mb-6 rounded-md border border-destructive/40 p-3 text-sm"
            >
              Posisi atau sesi belum tersimpan. Periksa koneksi lalu coba lagi.
            </p>
          )}
          {readingLayout === "scroll" ? (
            /* Continuous Scroll Mode Across All Accessible Chapters */
            <div className="space-y-16">
              {chaptersList.map((chap, chapIdx) => {
                const idPars = splitParagraphs(chap.contentId);
                const enPars = splitParagraphs(chap.contentEn);
                const paragraphs = languageView === "en" ? enPars : idPars;
                const highlights = allHighlights.filter(
                  (item) => item.chapterNumber === chap.chapterNumber,
                );
                const fadeParagraph = isPremiumPreview
                  ? paragraphs.length - 1
                  : -1;

                return (
                  <section
                    key={chap.id}
                    id={`chapter-sec-${chap.chapterNumber}`}
                    data-chapter-number={chap.chapterNumber}
                    className="relative scroll-mt-24"
                  >
                    {/* Chapter Header or Divider (SS 4) */}
                    {chapIdx === 0 ? (
                      <header className="mb-12 text-center pb-8 border-b border-current/15">
                        <div className="text-xs font-mono uppercase tracking-[0.2em] opacity-60 mb-2">
                          CHAPTER {chap.chapterNumber}
                        </div>
                        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                          {chap.title}
                        </h1>
                      </header>
                    ) : (
                      /* Chapter Divider with 4 beads (SS 4) */
                      <div
                        id={`chapter-${chap.chapterNumber}`}
                        className="pt-20 pb-12 text-center select-none"
                      >
                        <div className="flex items-center justify-center gap-3 mb-8 text-current/30">
                          <div className="w-16 h-px bg-current/20" />
                          <div className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-current/40" />
                            <span className="size-2 rounded-full bg-current/70" />
                            <span className="size-2 rounded-full bg-current/70" />
                            <span className="size-1.5 rounded-full bg-current/40" />
                          </div>
                          <div className="w-16 h-px bg-current/20" />
                        </div>
                        <div className="text-xs font-mono uppercase tracking-[0.2em] opacity-60 mb-3">
                          CHAPTER {chap.chapterNumber}
                        </div>
                        <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                          {chap.title}
                        </h2>
                      </div>
                    )}

                    {/* Paragraphs of this chapter (Pure typography, NO cards, NO wrapper boxes) */}
                    {languageView === "split" ? (
                      /* Bilingual Split View (ID left, EN right) */
                      <div className="space-y-6">
                        {idPars.map((idText, pIdx) => {
                          const enText = enPars[pIdx] || "";
                          return (
                            <div
                              key={pIdx}
                              data-reader-paragraph={pIdx}
                              className="scroll-mt-28"
                            >
                              {/* Page Divider every 3 paragraphs (SS 3) */}
                              {pIdx > 0 && pIdx % 3 === 0 && (
                                <div
                                  className="py-8 my-4 text-center select-none text-current/35 font-mono tracking-[0.6em] text-sm"
                                  aria-hidden="true"
                                >
                                  ***
                                </div>
                              )}

                              <div
                                data-preview-fade={
                                  pIdx === fadeParagraph || undefined
                                }
                                className="grid grid-cols-1 md:grid-cols-2 gap-6 py-1 select-text"
                              >
                                <p
                                  className={`leading-relaxed text-justify ${fontClass}`}
                                  style={{
                                    fontSize: `${fontSize}px`,
                                    lineHeight: 1.85,
                                  }}
                                >
                                  {renderHighlightedText(
                                    idText,
                                    highlights,
                                    handleFlexHighlight,
                                  )}
                                </p>
                                <p
                                  className={`border-t md:border-t-0 md:border-l border-current/15 pt-2 md:pt-0 md:pl-6 opacity-75 italic leading-relaxed text-justify ${fontClass}`}
                                  style={{
                                    fontSize: `${fontSize - 1}px`,
                                    lineHeight: 1.8,
                                  }}
                                >
                                  {enText}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Single Column Clean Literary View (Default: ID) */
                      <div
                        className={`${fontClass}`}
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
                      >
                        {splitChapterIntoPages(
                          languageView === "en"
                            ? chap.contentEn
                            : chap.contentId,
                        ).map((pg, pgIdx, allPgs) => (
                          <div key={pgIdx} className="space-y-4">
                            {pgIdx > 0 && (
                              <div
                                className="py-12 my-8 text-center select-none flex items-center justify-center gap-4 text-current/30"
                                aria-hidden="true"
                              >
                                <div className="w-16 h-px bg-current/20" />
                                <span className="text-xs tracking-[0.6em] opacity-60 select-none">
                                  ✦ &nbsp; ✦ &nbsp; ✦
                                </span>
                                <div className="w-16 h-px bg-current/20" />
                              </div>
                            )}

                            {pg.paragraphs.map((text, localIdx) => {
                              const pIdx =
                                allPgs
                                  .slice(0, pgIdx)
                                  .reduce(
                                    (acc, p) => acc + p.paragraphs.length,
                                    0,
                                  ) + localIdx;
                              return (
                                <div
                                  key={pIdx}
                                  data-reader-paragraph={pIdx}
                                  className="scroll-mt-28"
                                >
                                  <p
                                    data-preview-fade={
                                      pIdx === fadeParagraph || undefined
                                    }
                                    className="leading-relaxed text-justify mb-6 select-text"
                                  >
                                    {renderHighlightedText(
                                      text,
                                      highlights,
                                      handleFlexHighlight,
                                    )}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}

              {/* End of Reading Completion Section */}
              {payload.hasFullAccess && (
                <div className="pt-16 border-t border-current/15 text-center space-y-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Akhir buku
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsRatingOpen(true)}
                      size="default"
                      className="gap-2 font-mono text-xs hover:bg-muted shadow-xs"
                    >
                      <Star className="size-4 text-amber-500" />
                      Beri Rating
                    </Button>
                    <Button
                      onClick={() => void saveSession("summary", true)}
                      disabled={isSaving}
                      size="default"
                      className="gap-2 font-mono text-xs bg-[var(--color-accent)] text-white hover:brightness-110 shadow-md"
                    >
                      <CheckCircle2 className="size-4" />
                      Simpan sesi baca
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Slide Mode (2-Page Open Book Spread on Desktop / 1-Page on Mobile) */
            <ReaderSlideView
              chapterNumber={currentChapter.chapterNumber}
              chapterTitle={currentChapter.title}
              isFirstPageOfChapter={slidePageIndex === 0}
              paragraphs={currentPageObj.paragraphs}
              globalPageNumber={globalPageNumber}
              totalPages={totalPages}
              onPrevPage={goToPreviousSlide}
              onNextPage={goToNextSlide}
              canPrev={slidePageIndex > 0 || hasPrevChapter}
              canNext={slidePageIndex < pageCount - 1 || hasNextChapter}
              onFinishSession={() => void saveSession("summary")}
              onOpenRating={() => setIsRatingOpen(true)}
              fontClass={fontClass}
              fontSize={fontSize}
              isPremiumPreview={isPremiumPreview}
              highlights={allHighlights.filter(
                (item) => item.chapterNumber === currentChapter.chapterNumber,
              )}
              renderHighlights={renderHighlightedText}
              onFlexHighlight={handleFlexHighlight}
              direction={slideDirection}
            />
          )}
          {!payload.hasFullAccess && readingLayout === "scroll" && (
            <section
              ref={paywallRef}
              tabIndex={-1}
              aria-labelledby="preview-end"
              className="mt-10 space-y-4 pt-4 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <p className="font-mono text-xs font-semibold tracking-widest uppercase">
                Cuplikan
              </p>
              <h2
                id="preview-end"
                className="font-serif text-3xl font-semibold"
              >
                Akhir cuplikan
              </h2>
              <p className="mx-auto max-w-sm text-base leading-relaxed">
                {book.digitalPolicy === "print_claim_only"
                  ? "Klaim kode dari buku cetak untuk membuka naskah lengkap."
                  : "Jadi Nakama untuk melanjutkan buku ini dan membuka koleksi Premium."}
              </p>
              <Button asChild size="lg" className="min-h-11">
                {book.digitalPolicy === "print_claim_only" ? (
                  <Link to="/books/$slug" params={{ slug }}>
                    Buka detail dan klaim kode
                  </Link>
                ) : (
                  <Link
                    to="/membership"
                    search={{ book: slug }}
                    onClick={handleUpgrade}
                  >
                    Jadi Nakama
                  </Link>
                )}
              </Button>
            </section>
          )}
        </main>

        {/* Floating Glossy Glassmorphism Progress Bar at Bottom (Only in Scroll Mode) */}
        {readingLayout === "scroll" && (
          <GlossyProgressBar
            currentChapter={activeChapterNum}
            totalChapters={allChapters.length}
            currentPercent={currentPercent}
            onOpenRating={() => setIsRatingOpen(true)}
          />
        )}

        {/* Book Rating & Review Dialog */}
        <RatingDialog
          isOpen={isRatingOpen}
          onClose={() => setIsRatingOpen(false)}
          bookId={book.id}
          bookTitle={book.title}
          bookSlug={slug}
        />

        {/* Floating Text Highlight Popover (Selective Text Blocking) */}
        <HighlightPopover
          containerRef={readerCanvasRef}
          onSaveHighlight={handleSaveHighlight}
        />

        {/* Highlights Notes Sidebar Drawer (Matches SS 5) */}
        <HighlightsSidebar
          isOpen={isHighlightsOpen}
          onClose={() => setIsHighlightsOpen(false)}
          highlights={allHighlights}
          allChapters={allChapters}
          onSelectHighlight={handleSelectHighlight}
          onFlexHighlight={handleFlexHighlight}
          onDeleteHighlight={handleDeleteHighlight}
        />

        {/* 9:16 Flex Your Reading Story Generator Dialog */}
        <HighlightStoryDialog
          isOpen={storyDialogData.isOpen}
          onClose={() =>
            setStoryDialogData((prev) => ({ ...prev, isOpen: false }))
          }
          bookTitle={book.title}
          bookAuthor={book.author}
          chapterNumber={activeChapterNum}
          highlightText={storyDialogData.text}
          color={storyDialogData.color}
          note={storyDialogData.note}
          readerName={user.name}
        />

        {/* Marginalia Comments Drawer */}
        <MarginaliaDrawer
          slug={slug}
          chapterId={currentChapter.id}
          paragraphIndex={marginaliaParagraph ?? 0}
          isOpen={marginaliaParagraph !== null}
          onClose={() => setMarginaliaParagraph(null)}
        />

        {/* Finish Session Celebration Modal */}
        {isFinishModalOpen && sessionSummary && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="finish-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 text-foreground"
          >
            <div className="max-w-md w-full bg-card border border-border rounded-[12px] p-6 shadow-2xl relative">
              <button
                type="button"
                onClick={closeSessionSummary}
                className="absolute right-4 top-4 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                aria-label="Tutup"
              >
                <X className="size-4" />
              </button>

              <div className="text-center">
                <div className="size-14 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center mx-auto mb-3">
                  <Trophy className="size-7" />
                </div>

                <h3 id="finish-title" className="font-serif text-xl font-bold">
                  Sesi Membaca Tercatat!
                </h3>
                <p className="text-xs text-muted-foreground mt-1 font-sans">
                  Pencapaian membaca Anda untuk <strong>{book.title}</strong>{" "}
                  telah disimpan di linimasa profil.
                </p>

                {/* Telemetry Highlights */}
                <div className="mt-5 grid grid-cols-3 gap-2 p-3 rounded-[8px] bg-muted/40 border border-border font-mono text-center">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Durasi
                    </span>
                    <span className="font-bold text-sm text-foreground">
                      {sessionSummary.durationMinutes} mnt
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Halaman
                    </span>
                    <span className="font-bold text-sm text-foreground">
                      {sessionSummary.pagesRead} hal
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Kecepatan
                    </span>
                    <span className="font-bold text-sm text-[var(--color-accent)] flex items-center justify-center gap-0.5">
                      <Flame className="size-3" />
                      {sessionSummary.wpm} WPM
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-2.5">
                  <Button
                    asChild
                    className="gap-2 font-mono text-xs bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90"
                  >
                    <Link to="/app" search={{ tab: "library" }}>
                      <Share2 className="size-3.5" />
                      Flex Your Reading di My Library
                    </Link>
                  </Button>

                  {hasNextChapter ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        closeSessionSummary();
                        if (nextChapter !== undefined)
                          void handleSelectChapter(nextChapter);
                      }}
                      className="font-mono text-xs"
                    >
                      Lanjut ke Bab {nextChapter}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      asChild
                      className="font-mono text-xs"
                    >
                      <Link to="/app" search={{ tab: "home" }}>
                        Kembali ke Home
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DrmShield>
  );
}
