import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Star } from "lucide-react";
import { z } from "zod";
import {
  encodeZeroWidthFingerprint,
  stripZeroWidthCharacters,
} from "@starter/shared/drm-steganography";
import {
  splitChapterIntoPages,
  computeBookPagination,
  getChapterAndPageFromGlobal,
} from "@starter/shared/chapter-pagination";
import { resolveReaderDrmPolicy } from "@starter/shared/validators/drm";
import type {
  BookChapterSummaryDto,
  BookDistributionModel,
  BookHighlightDto,
  BookReaderChapterDto,
  BookReaderPayloadDto,
  BookSummaryDto,
  HighlightColor,
  ManuscriptChapterDto,
  ReadingSessionDto,
} from "@starter/shared/types";
import type { SaveReadingProgressInput } from "@starter/shared/validators/reading";
import type { PublishSessionPostInput } from "@starter/shared/validators/social";
import { Button } from "@/components/ui/button";
import { getBookReader } from "@/features/books/api";
import {
  useBookHighlights,
  useBookReader,
  useCreateHighlight,
  useDeleteHighlight,
  useReaderDrmStatus,
  useReadingProgress,
  useRecordDrmEvent,
  useSaveReadingProgress,
  useSubmitReaderDrmAppeal,
} from "@/features/books/hooks";
import { IS_DRM_TOGGLE_ENABLED } from "@/lib/env";
import { booksKeys } from "@/features/books/queries";
import { bookPagePath } from "@/features/books/book-share";
import { Brand } from "@/components/brand";
import { BookShareDialog } from "@/features/books/components/book-share-dialog";
import {
  findSlide,
  slideParagraphText,
  useSlidePagination,
  type SlidePosition,
  type SlideSpread,
} from "@/features/reader/slide-pagination";
import { ApiError } from "@/lib/api/client";
import {
  useCreateReadingSession,
  useReadingSessions,
} from "@/features/community/hooks";
import { AudiobookBar } from "@/features/reader/components/audiobook-bar";
import {
  DrmShield,
  type DrmShieldTriggerEvent,
} from "@/features/reader/components/drm-shield";
import { GlossyProgressBar } from "@/features/reader/components/glossy-progress-bar";
import { HighlightPopover } from "@/features/reader/components/highlight-popover";
import { HighlightStoryDialog } from "@/features/reader/components/highlight-story-dialog";
import { HighlightsSidebar } from "@/features/reader/components/highlights-sidebar";
import { FlexReadingDialog } from "@/features/share/components/flex-reading-dialog";
import { extractSurroundingContext } from "@/features/share/card-helpers";
import { MarginaliaDrawer } from "@/features/reader/components/marginalia-drawer";
import {
  PostReadingExitSheet,
  type PostReadingSessionSummary,
} from "@/features/reader/components/post-reading-exit-sheet";
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
import { useActiveReadingTimer } from "@/features/reader/hooks/use-active-reading-timer";
import {
  buildBookWordMap,
  computeBookWordWeightedPercent,
  computeSessionMetrics,
  computeStandardPageForPosition,
  shouldShowExitPrompt,
  type ChapterTextSource,
  type ReadingAnchor,
} from "@/features/reader/session-metrics";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import {
  PageBreak,
  ChapterBreak,
  NakamaPaywall,
  SubstackButton,
  AudioEmbed,
  VideoEmbed,
  CalloutBox,
  FinancialChart,
  LatexBlock,
  Collapsible,
  PoetryBlock,
  PollBlock,
  PredictionMarket,
  RecipeBlock,
  AudienceGated,
  FootnoteBlock,
  ThinDivider,
  MediumDivider,
} from "@/features/reader/editor/extensions";
import { SubstackEditorToolbar } from "@/features/reader/editor/components/substack-editor-toolbar";
import { ReaderBookHeader } from "@/features/reader/components/reader-book-header";
import { ManuscriptConfigDialog } from "@/features/reader/components/manuscript-config-dialog";
import { PublishManuscriptDialog } from "@/features/publisher/components/publish-manuscript-dialog";
import { canReviewManuscripts } from "@/features/publisher/publisher-helpers";
import {
  buildUnifiedDocFromChapters,
  extractChaptersFromJson,
  type ExtractedChapter,
} from "@/features/reader/editor/manuscript-json";
import {
  useEditPublisherManuscript,
  useManuscript,
  useMyManagedPublishers,
  useReviewPublisherManuscript,
  useSubmitManuscriptDraft,
  useTogglePostSession,
  useUpdateManuscript,
} from "@/features/social/hooks";
import "@/features/reader/editor/components/editor-styles.css";

const readSearchSchema = z.object({
  mode: z.enum(["full", "blueprint", "audio"]).optional(),
  chapter: z.coerce.number().int().min(1).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional(),
  drm: z.coerce.boolean().optional(),
  editorial: z.enum(["preview", "edit"]).optional(),
  publisherSlug: z.string().optional(),
  targetPublisherId: z.string().optional(),
});

export const Route = createFileRoute("/_protected/read/$slug")({
  validateSearch: readSearchSchema,
  component: ReaderPage,
});

function splitParagraphs(text?: string | null): string[] {
  if (!text) return [];
  if (!text.includes("<")) {
    return text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  // Content is HTML from Tiptap or rich editor
  if (typeof document !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    doc
      .querySelectorAll(
        '[data-type="chapter-break"], [data-type="page-break"], .tiptap-chapter-break, .tiptap-page-break',
      )
      .forEach((el) => el.remove());

    const paras: string[] = [];
    doc.body
      .querySelectorAll("p, h1, h2, h3, h4, blockquote, li")
      .forEach((el) => {
        const t = el.textContent?.trim();
        if (t) paras.push(t);
      });
    if (paras.length > 0) return paras;
    const fallback = doc.body.textContent?.trim();
    return fallback ? [fallback] : [];
  }
  return text
    .replace(/<[^>]*>/g, "\n\n")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Helper to embed an invisible zero-width forensic session fingerprint inside prose
function DrmStegoFingerprint({ fingerprint }: { fingerprint: string }) {
  if (!fingerprint) return null;
  return (
    <span aria-hidden="true" data-drm-fp="true" className="select-text">
      {fingerprint}
    </span>
  );
}

// Helper to render text with interactive fluorescent stabilo marks
function renderHighlightedText(
  text: string,
  highlights: BookHighlightDto[],
  onFlexHighlight: (h: BookHighlightDto) => void,
  range?: { start: number; end: number },
) {
  const start = range?.start ?? 0;
  const end = range?.end ?? text.length;
  if (!highlights.length || !text) return text.slice(start, end);

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

  if (!matches.length) return text.slice(start, end);

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
  let cursor = start;

  nonOverlapping.forEach((m, i) => {
    const matchStart = Math.max(start, m.start);
    const matchEnd = Math.min(end, m.end);
    if (matchStart >= matchEnd) return;
    if (matchStart > cursor) elements.push(text.slice(cursor, matchStart));

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
        style={range ? { paddingInline: 0, fontWeight: "inherit" } : undefined}
        title="Stabilo AnzaBook: Klik untuk Flex kutipan ini ke Instagram Story atau WhatsApp"
      >
        {text.slice(matchStart, matchEnd)}
      </mark>,
    );

    cursor = matchEnd;
  });

  if (cursor < end) elements.push(text.slice(cursor, end));

  return elements;
}

function ReaderPage() {
  const { slug } = Route.useParams();
  const { chapter } = Route.useSearch();
  return <ReaderBook key={`${slug}:${chapter ?? ""}`} />;
}

const paragraphsPerPage = 5;

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
  const [anchorChapter, setAnchorChapter] = useState(requestedChapter);
  const [extraChapters, setExtraChapters] = useState<BookReaderChapterDto[]>(
    [],
  );
  const stableBookPayloadRef = useRef<
    (BookReaderPayloadDto & { watermark: string }) | null
  >(null);
  const prefetchingChaptersRef = useRef<Set<number>>(new Set());
  const pendingChapterNavRef = useRef<{
    chapter: number;
    layout: ReadingLayout;
  } | null>(null);

  const isManuscript =
    slug.startsWith("manuscript-") || slug.startsWith("manu-");
  const manuscriptId = isManuscript
    ? slug.replace(/^manuscript-/, "").replace(/^manu-/, "")
    : "";

  const {
    data: manuscript,
    isLoading: isManuscriptLoading,
    refetch: refetchManuscript,
  } = useManuscript(manuscriptId);

  const updateManuscriptMutation = useUpdateManuscript();
  const editPublisherManuscriptMutation = useEditPublisherManuscript();
  const submitDraftMutation = useSubmitManuscriptDraft();
  const reviewPublisherMutation = useReviewPublisherManuscript();
  const { data: myManagedPublishers = [] } =
    useMyManagedPublishers(isManuscript);

  const {
    data: bookPayload,
    isLoading: isBookLoading,
    isError: isBookError,
    error: bookError,
    refetch: refetchBook,
  } = useBookReader(isManuscript ? "" : slug, {
    mode: "full",
    chapter: anchorChapter,
    continuous: true,
    windowSize: 2,
  });
  if (bookPayload) {
    stableBookPayloadRef.current = bookPayload;
  }
  const resolvedBookPayload = bookPayload ?? stableBookPayloadRef.current;

  const manuscriptPayload:
    (BookReaderPayloadDto & { watermark: string }) | null = useMemo(() => {
    if (!manuscript) return null;
    const chaps: ManuscriptChapterDto[] =
      manuscript.chapters && manuscript.chapters.length > 0
        ? manuscript.chapters
        : [
            {
              id: "ch-1",
              manuscriptId: manuscript.id,
              chapterNumber: 1,
              titleId: "Bab 1: Permulaan",
              contentId: "Tuliskan naskah Anda di sini...",
              contentEn: null,
              blueprintContent: "",
              estimatedMinutes: 5,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];

    return {
      book: {
        id: manuscript.id,
        slug: `manuscript-${manuscript.id}`,
        title: manuscript.title || "Naskah Tanpa Judul",
        author: user.name || "Penulis",
        coverUrl: manuscript.coverUrl || "template",
        synopsis: manuscript.synopsis || "",
        readingMinutes: 15,
        pageCount: (manuscript as { pageCount?: number }).pageCount || 10,
        totalChapters: chaps.length,
        accessTier: "free" as const,
        digitalPolicy:
          (manuscript.proposedDigitalPolicy as BookDistributionModel) ||
          "nakama_or_purchase",
        authorUserId: manuscript.authorUserId,
        publisherId: manuscript.publisherId,
      } as unknown as BookSummaryDto,
      mode: "full" as const,
      currentChapter: {
        id: chaps[0].id || "1",
        chapterNumber: chaps[0].chapterNumber || 1,
        title: chaps[0].titleId || "Bab 1",
        contentId: chaps[0].contentId || "",
        contentEn: chaps[0].contentEn || null,
        blueprintContent: chaps[0].blueprintContent || "",
        audioUrl: null,
        audioDurationSeconds: null,
      },
      chapters: chaps.map((c) => ({
        id: c.id || String(c.chapterNumber),
        chapterNumber: c.chapterNumber,
        title: c.titleId,
        contentId: c.contentId,
        contentEn: c.contentEn || null,
        blueprintContent: c.blueprintContent || "",
        audioUrl: null,
        audioDurationSeconds: null,
      })),
      allChapters: chaps.map((c) => ({
        id: c.id || String(c.chapterNumber),
        chapterNumber: c.chapterNumber,
        title: c.titleId,
        isSample: true,
      })),
      hasFullAccess: true,
      accessExpiresAt: null,
      watermark: "DRAF EDITORIAL ANZA",
    };
  }, [manuscript, user.name]);

  const payload = isManuscript ? manuscriptPayload : resolvedBookPayload;
  const isLoading = isManuscript
    ? isManuscriptLoading
    : isBookLoading && !resolvedBookPayload;
  const isError = isManuscript ? false : isBookError;
  const error = isManuscript ? null : bookError;
  const refetch = isManuscript ? refetchManuscript : refetchBook;

  const bookAuthorUserId = (
    payload?.book as { authorUserId?: string | null } | undefined
  )?.authorUserId;
  const isAuthorOwner = Boolean(
    (isManuscript && manuscript?.authorUserId === user.id) ||
    (!isManuscript && bookAuthorUserId && bookAuthorUserId === user.id),
  );
  const managedTargetPublisher = manuscript?.publisherId
    ? myManagedPublishers.find((pub) => pub.id === manuscript.publisherId)
    : undefined;
  const isPublisherCurator = Boolean(
    isManuscript &&
    managedTargetPublisher &&
    canReviewManuscripts(managedTargetPublisher.role),
  );
  const activePublisherSlug =
    search.publisherSlug || managedTargetPublisher?.slug || "";
  const isAuthorOrPublisher = Boolean(isAuthorOwner || isPublisherCurator);

  const [editMode, setEditMode] = useState<"preview" | "edit">(
    search.editorial ??
      (isManuscript && manuscript?.status === "draft" ? "edit" : "preview"),
  );
  const [editorialTitle, setEditorialTitle] = useState("");
  const [editorialCoverUrl, setEditorialCoverUrl] = useState<string | null>(
    null,
  );
  const [editorialCoverColor, setEditorialCoverColor] =
    useState<string>("#181614");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [editorialNotes, setEditorialNotes] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const coverInitializedRef = useRef(false);

  useEffect(() => {
    if (!payload?.book) return;
    const book = payload.book;
    queueMicrotask(() => {
      if (book.title && !editorialTitle) {
        setEditorialTitle(book.title);
      }
      if (!coverInitializedRef.current) {
        if (book.coverUrl) {
          setEditorialCoverUrl(book.coverUrl);
        }
        if (book.coverColor) {
          setEditorialCoverColor(book.coverColor);
        }
        coverInitializedRef.current = true;
      }
    });
  }, [payload?.book, editorialTitle]);

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
  const togglePostSessionMutation = useTogglePostSession();
  const { data: sessionsData } = useReadingSessions();

  const [createdSession, setCreatedSession] =
    useState<ReadingSessionDto | null>(null);
  const createdSessionId = createdSession?.id ?? null;
  const [isSessionComposerOpen, setIsSessionComposerOpen] = useState(false);
  const [isSessionPosted, setIsSessionPosted] = useState(false);

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

  const initialEditorContent = useMemo(() => {
    return buildUnifiedDocFromChapters(
      payload?.chapters || [],
      editorialTitle || payload?.book?.title || "Bab 1: Permulaan",
    );
  }, [payload?.chapters, payload?.book?.title, editorialTitle]);

  // Live Chapter State derived from Tiptap JSON AST (Industry Standard)
  const [liveChapters, setLiveChapters] = useState<ExtractedChapter[]>(() => {
    return extractChaptersFromJson(initialEditorContent);
  });

  const syncLiveChaptersFromEditor = useCallback((ed: Editor | null) => {
    if (!ed) return;
    const json = ed.getJSON();
    const chaps = extractChaptersFromJson(json);
    setLiveChapters(chaps);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder:
          "Mulai menulis naskah Anda di sini (mendukung paragraf, heading, kutipan, pemisah)...",
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      PageBreak,
      ChapterBreak,
      NakamaPaywall,
      SubstackButton,
      AudioEmbed,
      VideoEmbed,
      CalloutBox,
      FinancialChart,
      LatexBlock,
      Collapsible,
      PoetryBlock,
      PollBlock,
      PredictionMarket,
      RecipeBlock,
      AudienceGated,
      FootnoteBlock,
      ThinDivider,
      MediumDivider,
    ],
    content: initialEditorContent,
    editable: editMode === "edit",
    onUpdate({ editor: currentEditor }) {
      if (isAuthorOrPublisher) {
        syncLiveChaptersFromEditor(currentEditor);
      }
    },
  });

  useEffect(() => {
    if (editor && isAuthorOrPublisher) {
      queueMicrotask(() => {
        syncLiveChaptersFromEditor(editor);
      });
    }
  }, [editor, isAuthorOrPublisher, syncLiveChaptersFromEditor]);

  // Derived effective chapters: prioritizes live editor chapters for authors/publishers
  const displayChapters = useMemo(() => {
    if (isAuthorOrPublisher && liveChapters.length > 0) {
      return liveChapters.map((c) => ({
        id: `live-toc-${c.chapterNumber}`,
        chapterNumber: c.chapterNumber,
        title: c.title,
        isSample: true,
      }));
    }
    return payload?.allChapters || [];
  }, [isAuthorOrPublisher, liveChapters, payload?.allChapters]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editMode === "edit");
    }
  }, [editor, editMode]);

  const isPublisherReview = Boolean(
    isPublisherCurator &&
    isManuscript &&
    manuscript &&
    (manuscript.status === "pending_review" ||
      manuscript.status === "in_editing" ||
      manuscript.status === "revision_requested"),
  );

  const handleSaveDraft = async () => {
    if (!isManuscript || !manuscriptId || !editor) return;
    setIsSavingDraft(true);
    try {
      const fullDocJson = editor.getJSON();
      const extracted = extractChaptersFromJson(fullDocJson);
      const chapterPayload = extracted.map((chap) => ({
        chapterNumber: chap.chapterNumber,
        titleId: chap.title,
        contentId: JSON.stringify(chap.doc),
        blueprintContent: JSON.stringify(chap.doc),
        estimatedMinutes: Math.max(
          1,
          Math.ceil(
            chap.plainTextParagraphs.join(" ").split(/\s+/).length / 200,
          ),
        ),
      }));
      const baseFields = {
        title: editorialTitle.trim() || undefined,
        coverUrl:
          editorialCoverUrl === "template"
            ? null
            : editorialCoverUrl !== undefined
              ? editorialCoverUrl
              : undefined,
        chapters: chapterPayload,
      };

      if (isPublisherCurator && activePublisherSlug) {
        await editPublisherManuscriptMutation.mutateAsync({
          slug: activePublisherSlug,
          idOrSlug: manuscriptId,
          input: {
            ...baseFields,
            editorialNotes: editorialNotes.trim() || undefined,
          },
        });
      } else {
        await updateManuscriptMutation.mutateAsync({
          idOrSlug: manuscriptId,
          input: baseFields,
        });
      }
      await refetchManuscript();
    } catch (err) {
      console.error("Failed to save manuscript draft", err);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Reader Settings State
  const [theme, setTheme] = useState<ReaderTheme>("manila");
  const [fontFamily, setFontFamily] = useState<ReaderFont>("serif");
  const [fontSize, setFontSize] = useState<number>(16);
  // Default language: Bahasa Indonesia (not split)
  const [languageView, setLanguageView] = useState<LanguageView>("id");
  const [readingLayout, setReadingLayout] = useState<ReadingLayout>("scroll");
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [drmToggleState, setDrmToggleState] = useState<boolean>(
    IS_DRM_TOGGLE_ENABLED ? (search.drm ?? true) : true,
  );
  const drmPolicy = resolveReaderDrmPolicy({
    toggleAvailable: IS_DRM_TOGGLE_ENABLED,
    requestedDrm: search.drm,
    toggleState: drmToggleState,
    isAuthorEditing: isAuthorOrPublisher && editMode === "edit",
  });
  const { mutate: recordDrmEvent } = useRecordDrmEvent();
  const { data: readerDrmStatus, refetch: refetchDrmStatus } =
    useReaderDrmStatus();
  const submitAppealMutation = useSubmitReaderDrmAppeal();
  const [appealMessageInput, setAppealMessageInput] = useState("");
  const [appealFeedback, setAppealFeedback] = useState<string | null>(null);
  const [suspendedNow, setSuspendedNow] = useState(false);
  const lastDrmLogRef = useRef<Map<string, number>>(new Map());
  const [isHighlightsOpen, setIsHighlightsOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [share, setShare] = useState<{
    url: string;
    trigger: HTMLButtonElement;
  } | null>(null);

  const [slidePosition, setSlidePosition] = useState<SlidePosition>({
    chapter: requestedChapter,
    paragraph: -1,
    offset: 0,
  });
  const [scrollPosition, setScrollPosition] = useState({
    chapter: requestedChapter,
    percent: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [expiredAccess, setExpiredAccess] = useState<string | null>(null);

  // Marginalia & Exit Prompt State
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number>(0);
  const [marginaliaParagraph, setMarginaliaParagraph] = useState<number | null>(
    null,
  );
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isExitPromptOpen, setIsExitPromptOpen] = useState<boolean>(false);
  const [sessionSummary, setSessionSummary] =
    useState<PostReadingSessionSummary | null>(null);
  const [postSessionError, setPostSessionError] = useState<string | null>(null);
  const [hasRestoredSessionAnchor, setHasRestoredSessionAnchor] =
    useState(false);

  // Quote Composer Dialog State
  const [storyDialogData, setStoryDialogData] = useState<{
    isOpen: boolean;
    highlight: BookHighlightDto | null;
  }>({
    isOpen: false,
    highlight: null,
  });

  const readerCanvasRef = useRef<HTMLDivElement>(null);
  const paywallRef = useRef<HTMLElement>(null);
  const chapterCacheRef = useRef<Map<number, ChapterTextSource>>(new Map());
  const sessionStartAnchorRef = useRef<ReadingAnchor | null>(null);
  const sessionHighlightsCountRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const pendingCheckpoint = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const createSessionMutation = useCreateReadingSession();
  const hasRestoredRef = useRef(false);
  const { mutate: saveProgress, mutateAsync: saveProgressAsync } =
    saveProgressMutation;

  const isLocked =
    error instanceof ApiError && error.code === "FORBIDDEN_DIGITAL_ACCESS";
  const isDrmSuspendedError =
    error instanceof ApiError && error.code === "READER_SUSPENDED";
  const isReaderSuspended =
    !isAuthorOrPublisher &&
    !isManuscript &&
    (suspendedNow ||
      isDrmSuspendedError ||
      (readerDrmStatus?.status !== undefined &&
        readerDrmStatus.status !== "active"));
  const isExpired =
    expiredAccess !== null && expiredAccess === payload?.accessExpiresAt;
  const isMissing = error instanceof ApiError && error.status === 404;

  const isTimerPaused =
    !hasRestoredSessionAnchor ||
    isSaving ||
    isExitPromptOpen ||
    isSessionComposerOpen ||
    isRatingOpen ||
    Boolean(share) ||
    storyDialogData.isOpen ||
    isConfigDialogOpen ||
    isPublishDialogOpen ||
    isExpired ||
    isLocked ||
    isReaderSuspended;

  const {
    getActiveSeconds,
    recordActivity: recordReadingActivity,
    reset: resetActiveTimer,
  } = useActiveReadingTimer({
    isPaused: isTimerPaused,
    isAudioPlaying,
  });

  useEffect(() => {
    return () => clearTimeout(pendingCheckpoint.current);
  }, []);

  const loadedChapters = useMemo(() => {
    const base = payload?.chapters?.length
      ? payload.chapters
      : payload?.currentChapter
        ? [payload.currentChapter]
        : [];
    if (extraChapters.length === 0) return base;
    const byChapter = new Map<number, BookReaderChapterDto>();
    for (const item of base) {
      byChapter.set(item.chapterNumber, item);
    }
    for (const item of extraChapters) {
      if (!byChapter.has(item.chapterNumber)) {
        byChapter.set(item.chapterNumber, item);
      }
    }
    return Array.from(byChapter.values()).sort(
      (a, b) => a.chapterNumber - b.chapterNumber,
    );
  }, [extraChapters, payload?.chapters, payload?.currentChapter]);

  const accessibleChapters = useMemo(() => {
    if (isAuthorOrPublisher && liveChapters.length > 0) {
      return liveChapters.map((c) => ({
        id: `live-chap-${c.chapterNumber}`,
        chapterNumber: c.chapterNumber,
        title: c.title,
        contentId: JSON.stringify(c.doc),
        contentEn: null,
        blueprintContent: JSON.stringify(c.doc),
        audioUrl: null,
        audioDurationSeconds: null,
      }));
    }
    return loadedChapters;
  }, [isAuthorOrPublisher, liveChapters, loadedChapters]);

  useEffect(() => {
    for (const ch of accessibleChapters) {
      chapterCacheRef.current.set(ch.chapterNumber, {
        chapterNumber: ch.chapterNumber,
        contentId: ch.contentId,
        contentEn: ch.contentEn,
      });
    }
  }, [accessibleChapters]);

  const allChapterNumbers = useMemo(
    () => displayChapters.map((c) => c.chapterNumber),
    [displayChapters],
  );

  const bookWordMap = useMemo(
    () => buildBookWordMap(accessibleChapters, languageView, allChapterNumbers),
    [accessibleChapters, languageView, allChapterNumbers],
  );

  const prefetchChapter = useCallback(
    async (targetChapter: number) => {
      if (isManuscript || isAuthorOrPublisher || !payload?.hasFullAccess) {
        return;
      }
      const existsInBook = payload.allChapters.some(
        (c) => c.chapterNumber === targetChapter,
      );
      if (!existsInBook) return;
      if (
        loadedChapters.some((c) => c.chapterNumber === targetChapter) ||
        prefetchingChaptersRef.current.has(targetChapter)
      ) {
        return;
      }

      prefetchingChaptersRef.current.add(targetChapter);
      try {
        const nextPayload = await getBookReader(slug, {
          mode: "full",
          chapter: targetChapter,
          continuous: false,
        });
        const nextChapterObj =
          nextPayload.chapters?.find(
            (c) => c.chapterNumber === targetChapter,
          ) ?? nextPayload.currentChapter;
        if (nextChapterObj) {
          setExtraChapters((prev) =>
            prev.some((c) => c.chapterNumber === nextChapterObj.chapterNumber)
              ? prev
              : [...prev, nextChapterObj],
          );
        }
      } catch {
        // Silent fallback on background prefetch (rate limit or offline) so active reading stays uninterrupted.
      } finally {
        prefetchingChaptersRef.current.delete(targetChapter);
      }
    },
    [isAuthorOrPublisher, isManuscript, loadedChapters, payload, slug],
  );

  const selectedChapter =
    readingLayout === "scroll" ? scrollPosition.chapter : slidePosition.chapter;
  const chapter =
    accessibleChapters.find(
      (item: BookReaderChapterDto) => item.chapterNumber === selectedChapter,
    ) ??
    accessibleChapters[0] ??
    payload?.currentChapter;
  const activeChapterNum = chapter?.chapterNumber ?? requestedChapter;

  const handleDrmSecurityTrigger = useCallback(
    (event: DrmShieldTriggerEvent) => {
      if (!drmPolicy.isEnabled || !payload?.watermark) return;
      const now = Date.now();
      // Group PrintScreen keydown+keyup as one physical trigger while allowing distinct actions.
      const dedupKey =
        event.eventType === "screenshot_shortcut" &&
        event.triggerDetail.startsWith("PrintScreen")
          ? "screenshot_shortcut:PrintScreen"
          : `${event.eventType}:${event.triggerDetail}`;
      const last = lastDrmLogRef.current.get(dedupKey) ?? 0;
      if (now - last < 1500) return;
      lastDrmLogRef.current.set(dedupKey, now);

      recordDrmEvent(
        {
          bookSlug: slug,
          chapterNumber: activeChapterNum,
          eventType: event.eventType,
          triggerDetail: event.triggerDetail,
          watermarkCode: payload.watermark,
          clientOs: event.clientOs,
        },
        {
          onSuccess: (result) => {
            if (result.suspensionTriggered) {
              setSuspendedNow(true);
              void refetchDrmStatus();
            }
          },
        },
      );
    },
    [
      activeChapterNum,
      drmPolicy.isEnabled,
      payload?.watermark,
      recordDrmEvent,
      refetchDrmStatus,
      slug,
    ],
  );
  const fontClass =
    fontFamily === "serif"
      ? "font-serif"
      : fontFamily === "sans"
        ? "font-sans"
        : "[font-family:var(--font-reader-accessible)] tracking-wide";
  const { spreads, setProbe } = useSlidePagination(
    accessibleChapters,
    readingLayout === "slide",
    languageView === "en",
    fontClass,
    fontSize,
  );
  const slideIndex = findSlide(spreads, slidePosition);
  const activeSpread =
    readingLayout === "slide" ? spreads[slideIndex] : undefined;

  const chapterParagraphs = splitParagraphs(chapter?.contentId);
  const chapterParagraphCount = chapterParagraphs.length;
  const progress =
    savedProgress ?? (scope === "full" ? previewCheckpoint.data : null);
  const waitingForCheckpoint =
    search.chapter === undefined &&
    (progressPending ||
      (scope === "full" && !savedProgress && previewCheckpoint.isPending));
  const checkpointTargetOutOfWindow =
    search.chapter === undefined &&
    !isAuthorOrPublisher &&
    !isManuscript &&
    !waitingForCheckpoint &&
    Boolean(payload?.hasFullAccess) &&
    Boolean(progress?.lastChapterNumber) &&
    !loadedChapters.some(
      (item: BookReaderChapterDto) =>
        item.chapterNumber === progress?.lastChapterNumber,
    ) &&
    Boolean(
      payload?.allChapters.some(
        (item: BookChapterSummaryDto) =>
          item.chapterNumber === progress?.lastChapterNumber,
      ),
    );

  useEffect(() => {
    if (!payload || hasRestoredRef.current) return;
    if (waitingForCheckpoint) return;
    const checkpoint = search.chapter === undefined ? progress : null;
    if (checkpointTargetOutOfWindow && checkpoint?.lastChapterNumber) {
      const targetChapter = checkpoint.lastChapterNumber;
      if (targetChapter !== anchorChapter) {
        const frame = requestAnimationFrame(() => {
          setExtraChapters([]);
          setAnchorChapter(targetChapter);
        });
        return () => cancelAnimationFrame(frame);
      }
      return;
    }
    const savedChapter = loadedChapters.find(
      (item: BookReaderChapterDto) =>
        item.chapterNumber === checkpoint?.lastChapterNumber,
    );
    const frame = requestAnimationFrame(() => {
      hasRestoredRef.current = true;
      const finalizeSessionRestore = (anchor: ReadingAnchor) => {
        sessionStartAnchorRef.current = anchor;
        sessionHighlightsCountRef.current = 0;
        setHasRestoredSessionAnchor(true);
        requestAnimationFrame(() => resetActiveTimer());
      };

      if (savedChapter && checkpoint?.layout === "slide") {
        setReadingLayout("slide");
        const legacyPage = getChapterAndPageFromGlobal(
          checkpoint.lastPageNumber ?? 1,
          computeBookPagination(
            accessibleChapters,
            languageView,
            paragraphsPerPage,
          ),
        );
        const content =
          languageView === "en" && savedChapter.contentEn
            ? savedChapter.contentEn
            : savedChapter.contentId;
        const legacyTextIndex =
          legacyPage.chapterNumber === savedChapter.chapterNumber
            ? splitChapterIntoPages(content)
                .slice(0, legacyPage.localPageIndex)
                .reduce((count, page) => count + page.paragraphs.length, 0)
            : 0;
        const readableParagraphs = splitParagraphs(content).flatMap(
          (raw, index) => (slideParagraphText(raw) ? [index] : []),
        );
        const savedIndex =
          checkpoint.lastParagraphIndex ??
          readableParagraphs[legacyTextIndex] ??
          -1;
        const restoredParagraph =
          readableParagraphs.find((index) => index >= savedIndex) ?? savedIndex;
        setSlidePosition({
          chapter: savedChapter.chapterNumber,
          paragraph: restoredParagraph,
          offset: 0,
        });
        finalizeSessionRestore({
          chapterNumber: savedChapter.chapterNumber,
          paragraphIndex: Math.max(0, restoredParagraph),
          scrollPercent: checkpoint?.lastScrollPercent ?? 0,
        });
        return;
      }
      if (
        !savedChapter &&
        requestedChapter === loadedChapters[0]?.chapterNumber
      ) {
        finalizeSessionRestore({
          chapterNumber: requestedChapter,
          paragraphIndex: 0,
          scrollPercent: 0,
        });
        return;
      }

      const target = savedChapter?.chapterNumber ?? requestedChapter;
      const section = chapterSection(target);
      if (!section) {
        finalizeSessionRestore({
          chapterNumber: target,
          paragraphIndex: checkpoint?.lastParagraphIndex ?? 0,
          scrollPercent: checkpoint?.lastScrollPercent ?? 0,
        });
        return;
      }
      const userAlreadyScrolledPastStart =
        target === loadedChapters[0]?.chapterNumber &&
        (checkpoint?.lastScrollPercent ?? 0) === 0 &&
        window.scrollY >= 80;
      if (!userAlreadyScrolledPastStart) {
        setScrollPosition({
          chapter: target,
          percent: checkpoint?.lastScrollPercent ?? 0,
        });
      }
      finalizeSessionRestore({
        chapterNumber: target,
        paragraphIndex: checkpoint?.lastParagraphIndex ?? 0,
        scrollPercent: checkpoint?.lastScrollPercent ?? 0,
      });
      if (
        payload.hasFullAccess &&
        checkpoint === savedProgress &&
        savedChapter &&
        savedChapter.chapterNumber ===
          payload.allChapters.at(-1)?.chapterNumber &&
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
      } else if (
        target !== loadedChapters[0]?.chapterNumber ||
        window.scrollY < 80
      ) {
        section.scrollIntoView({ block: "start" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [
    accessibleChapters,
    anchorChapter,
    checkpointTargetOutOfWindow,
    languageView,
    loadedChapters,
    payload,
    progress,
    requestedChapter,
    resetActiveTimer,
    savedProgress,
    search.chapter,
    waitingForCheckpoint,
  ]);

  useEffect(() => {
    if (
      readingLayout !== "slide" ||
      !hasRestoredSessionAnchor ||
      !activeSpread ||
      !sessionStartAnchorRef.current ||
      sessionStartAnchorRef.current.slideIndex !== undefined
    ) {
      return;
    }
    if (
      activeSpread.chapter.chapterNumber ===
      sessionStartAnchorRef.current.chapterNumber
    ) {
      sessionStartAnchorRef.current.slideIndex = slideIndex;
      sessionStartAnchorRef.current.scrollPercent = Math.min(
        99,
        Math.round(
          (activeSpread.chapterPage / activeSpread.chapterPages) * 100,
        ),
      );
    }
  }, [activeSpread, hasRestoredSessionAnchor, readingLayout, slideIndex]);

  useEffect(() => {
    const pending = pendingChapterNavRef.current;
    if (!pending) return;
    const isLoaded = loadedChapters.some(
      (item: BookReaderChapterDto) => item.chapterNumber === pending.chapter,
    );
    if (!isLoaded) return;

    const targetChapter = pending.chapter;
    const targetLayout = pending.layout;
    const frame = requestAnimationFrame(() => {
      pendingChapterNavRef.current = null;
      hasRestoredRef.current = true;
      if (targetLayout === "slide") {
        setSlidePosition({ chapter: targetChapter, paragraph: -1, offset: 0 });
        window.scrollTo({ top: 0 });
        return;
      }
      setScrollPosition({ chapter: targetChapter, percent: 0 });
      chapterSection(targetChapter)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [loadedChapters]);

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

  const captureSlidePosition = useCallback(
    (spread: SlideSpread | undefined): SaveReadingProgressInput | null => {
      if (!spread || !hasRestoredRef.current) return null;
      const { chapter, position, chapterPage, chapterPages } = spread;
      const paragraphCount = splitParagraphs(chapter.contentId).length;
      const paragraph = Math.min(
        Math.max(0, position.paragraph),
        Math.max(0, paragraphCount - 1),
      );
      return {
        lastChapterId: chapter.id,
        lastChapterNumber: chapter.chapterNumber,
        lastPageNumber: Math.floor(paragraph / paragraphsPerPage) + 1,
        lastScrollPercent: Math.min(
          99,
          Math.round((chapterPage / chapterPages) * 100),
        ),
        lastParagraphIndex: paragraphCount ? paragraph : undefined,
        layout: "slide",
        capturedAt: Date.now(),
      };
    },
    [],
  );

  const capturePosition = useCallback((): SaveReadingProgressInput | null => {
    if (readingLayout === "slide") return captureSlidePosition(activeSpread);
    if (!chapter || !hasRestoredRef.current) return null;
    let positionChapter = chapter;
    let paragraphCount = chapterParagraphCount;
    let percent = 0;
    let paragraph = 0;
    const sections = readerCanvasRef.current?.querySelectorAll<HTMLElement>(
      "section[data-chapter-number]",
    );
    if (!sections?.length) return null;
    const finalSection = sections[sections.length - 1];
    const finalSectionChapterNum = Number(finalSection.dataset.chapterNumber);
    const bookFinalChapterNum = payload?.allChapters.at(-1)?.chapterNumber;
    const isRenderedFinalChapter =
      bookFinalChapterNum !== undefined &&
      finalSectionChapterNum === bookFinalChapterNum;
    const viewportMarker = window.innerHeight * 0.36;
    const scrollRoot = document.scrollingElement;
    const scrollTop = scrollRoot?.scrollTop ?? 0;
    const maxScroll = scrollRoot
      ? scrollRoot.scrollHeight - scrollRoot.clientHeight
      : 0;
    const atBookEnd =
      Boolean(payload?.hasFullAccess) &&
      isRenderedFinalChapter &&
      maxScroll > 0 &&
      scrollTop > 0 &&
      maxScroll - scrollTop <= 1;
    let body = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top > viewportMarker) break;
      body = section;
    }
    if (atBookEnd) body = finalSection;
    const visibleChapter = loadedChapters.find(
      (item: BookReaderChapterDto) =>
        item.chapterNumber === Number(body.dataset.chapterNumber),
    );
    if (visibleChapter) {
      positionChapter = visibleChapter;
      if (visibleChapter !== chapter)
        paragraphCount = splitParagraphs(visibleChapter.contentId).length;
    }
    const rect = body.getBoundingClientRect();
    if (atBookEnd) {
      percent = 100;
    } else if (
      payload?.hasFullAccess &&
      body === finalSection &&
      isRenderedFinalChapter
    ) {
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
      if (atBookEnd || marker.getBoundingClientRect().top <= viewportMarker) {
        paragraph = Number(marker.dataset.readerParagraph);
      }
    }
    const lastParagraphIndex = Math.min(
      paragraph,
      Math.max(0, paragraphCount - 1),
    );
    return {
      lastChapterId: positionChapter.id,
      lastChapterNumber: positionChapter.chapterNumber,
      lastPageNumber: Math.floor(lastParagraphIndex / paragraphsPerPage) + 1,
      lastScrollPercent: percent,
      lastParagraphIndex,
      layout: readingLayout,
      capturedAt: Date.now(),
    };
  }, [
    captureSlidePosition,
    chapter,
    chapterParagraphCount,
    loadedChapters,
    payload?.allChapters,
    payload?.hasFullAccess,
    readingLayout,
    activeSpread,
  ]);

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
      // Live Chapter Detection for Editorial Mode (Updates left TOC active indicator on scroll)
      if (isAuthorOrPublisher) {
        const chapterBreaks = Array.from(
          document.querySelectorAll<HTMLElement>('[data-type="chapter-break"]'),
        );
        let detected = 1;
        const viewportMarker = window.innerHeight * 0.36;
        for (const cb of chapterBreaks) {
          const num = Number(cb.getAttribute("data-chapter-number")) || 1;
          if (cb.getBoundingClientRect().top <= viewportMarker) {
            detected = num;
          }
        }
        if (detected !== activeChapterNum) {
          setScrollPosition((previous) => ({
            ...previous,
            chapter: detected,
          }));
        }
      }

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
      if (
        !isAuthorOrPublisher &&
        !isManuscript &&
        payload?.hasFullAccess &&
        loadedChapters.length > 0
      ) {
        const lastLoaded =
          loadedChapters[loadedChapters.length - 1].chapterNumber;
        const bookLast =
          payload.allChapters.at(-1)?.chapterNumber ?? lastLoaded;
        if (
          lastLoaded < bookLast &&
          (position.lastChapterNumber >= lastLoaded ||
            (position.lastChapterNumber >= lastLoaded - 1 &&
              position.lastScrollPercent >= 65))
        ) {
          void prefetchChapter(lastLoaded + 1);
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [
    activeChapterNum,
    capturePosition,
    chapter,
    expiredAccess,
    isAuthorOrPublisher,
    isManuscript,
    loadedChapters,
    payload?.allChapters,
    payload?.accessExpiresAt,
    payload?.hasFullAccess,
    prefetchChapter,
    queueCheckpoint,
    readingLayout,
  ]);

  function turnPage(target: SlideSpread) {
    recordReadingActivity();
    setSlidePosition(target.position);
    const position = captureSlidePosition(target);
    if (position) queueCheckpoint(position);
    if (
      !isAuthorOrPublisher &&
      !isManuscript &&
      payload?.hasFullAccess &&
      loadedChapters.length > 0 &&
      spreads.length > 0
    ) {
      const targetIndex = spreads.findIndex(
        (item) =>
          item.position.chapter === target.position.chapter &&
          item.position.paragraph === target.position.paragraph &&
          item.position.offset === target.position.offset,
      );
      const lastLoaded =
        loadedChapters[loadedChapters.length - 1].chapterNumber;
      const bookLast = payload.allChapters.at(-1)?.chapterNumber ?? lastLoaded;
      if (
        lastLoaded < bookLast &&
        targetIndex >= Math.max(0, spreads.length - 4)
      ) {
        void prefetchChapter(lastLoaded + 1);
      }
    }
  }

  function changeReadingLayout(layout: ReadingLayout) {
    if (layout === readingLayout) return;
    const position = capturePosition();
    if (layout === "slide") {
      setSlidePosition({
        chapter: position?.lastChapterNumber ?? activeChapterNum,
        paragraph: position?.lastParagraphIndex ?? -1,
        offset: 0,
      });
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
      ((position?.lastParagraphIndex ?? 0) > 0
        ? (marker ?? section)
        : section
      )?.scrollIntoView({
        block: "start",
      });
    });
  }

  async function handleSelectChapter(ch: number) {
    if (isAuthorOrPublisher) {
      if (readingLayout === "slide") {
        setSlidePosition({ chapter: ch, paragraph: -1, offset: 0 });
        return;
      }
      setScrollPosition((prev) => ({ ...prev, chapter: ch }));
      if (ch === 1) {
        const chap1Break = document.querySelector(
          '[data-type="chapter-break"][data-chapter-number="1"]',
        );
        if (chap1Break) {
          chap1Break.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        const canvas =
          document.querySelector(".tiptap-editorial-canvas") ||
          document.querySelector("header");
        if (canvas) {
          canvas.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      const targetEl = document.querySelector(
        `[data-type="chapter-break"][data-chapter-number="${ch}"]`,
      );
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    if (ch === activeChapterNum) return;
    if (!payload?.hasFullAccess) {
      paywallRef.current?.focus();
      return;
    }

    const isAlreadyLoaded = loadedChapters.some(
      (item: BookReaderChapterDto) => item.chapterNumber === ch,
    );

    if (readingLayout === "slide") {
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
      if (isAlreadyLoaded) {
        setSlidePosition({ chapter: ch, paragraph: -1, offset: 0 });
        window.scrollTo({ top: 0 });
        return;
      }
    } else if (isAlreadyLoaded) {
      chapterSection(ch)?.scrollIntoView({ block: "start" });
      return;
    }

    pendingChapterNavRef.current = { chapter: ch, layout: readingLayout };
    const lastLoadedNum = loadedChapters.at(-1)?.chapterNumber ?? 0;
    if (ch === lastLoadedNum + 1) {
      void prefetchChapter(ch);
    } else {
      setExtraChapters([]);
      setAnchorChapter(ch);
    }
  }

  // Handle opening unified Quote Composer for a highlight
  const handleFlexHighlight = (h: BookHighlightDto) => {
    setStoryDialogData({
      isOpen: true,
      highlight: h,
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
    paragraphIndex?: number;
    openComposer?: boolean;
  }) => {
    const cleanSelectedText = stripZeroWidthCharacters(
      data.selectedText,
    ).trim();
    if (!cleanSelectedText) return;
    const targetChapter = data.chapterNumber ?? activeChapterNum;
    const targetParagraph = data.paragraphIndex ?? activeParagraphIndex;
    const sessionWordMap = buildBookWordMap(
      Array.from(chapterCacheRef.current.values()),
      languageView,
      allChapterNumbers,
    );
    const computedPageNumber =
      readingLayout === "slide" && activeSpread
        ? activeSpread.chapterPage
        : computeStandardPageForPosition(
            sessionWordMap,
            targetChapter,
            targetParagraph,
          );
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optHighlight: BookHighlightDto = {
      id: tempId,
      userId: user.id,
      bookId,
      chapterId: null,
      chapterNumber: targetChapter,
      pageNumber: computedPageNumber,
      selectedText: cleanSelectedText,
      color: data.color,
      note: data.note || null,
      createdAt: new Date().toISOString(),
    };

    // 1. Instantly show highlight in text and increment counter
    setOptimisticHighlights((prev) => [optHighlight, ...prev]);
    if (!data.openComposer) {
      setIsHighlightsOpen(true);
    }
    setMarginaliaParagraph(null);

    // 2. Persist to API
    try {
      const saved = await createHighlightMutation.mutateAsync({
        bookId,
        chapterNumber: targetChapter,
        pageNumber: computedPageNumber,
        selectedText: cleanSelectedText,
        color: data.color,
        note: data.note,
      });

      sessionHighlightsCountRef.current += 1;

      const hydratedHighlight: BookHighlightDto = {
        ...saved,
        bookTitle: saved.bookTitle ?? book.title,
        bookCoverUrl: saved.bookCoverUrl ?? book.coverUrl,
      };
      // Replace temp highlight with server result
      setOptimisticHighlights((prev) =>
        prev.map((h) => (h.id === tempId ? hydratedHighlight : h)),
      );

      if (data.openComposer) {
        setStoryDialogData({
          isOpen: true,
          highlight: hydratedHighlight,
        });
      }
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
    destination: "exit" | "home" | "membership" | "summary",
    finishedBook = false,
  ) {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setSaveError(false);
    clearTimeout(pendingCheckpoint.current);

    try {
      const position = capturePosition();
      const activeSeconds = Math.min(28_800, getActiveSeconds());
      let openExitSheet = destination === "summary";

      if (bookId && position) {
        const finalChapter =
          payload?.allChapters.at(-1)?.chapterNumber ===
          position.lastChapterNumber;
        const finalPage =
          readingLayout === "slide" && slideIndex === spreads.length - 1;
        if (
          destination === "summary" &&
          finalChapter &&
          (finishedBook || finalPage) &&
          scope === "full"
        ) {
          position.lastScrollPercent = 100;
        }
        await saveProgressAsync(position);

        const sessionWordMap = buildBookWordMap(
          Array.from(chapterCacheRef.current.values()),
          languageView,
          allChapterNumbers,
        );
        const endAnchor: ReadingAnchor = {
          chapterNumber: position.lastChapterNumber,
          paragraphIndex: position.lastParagraphIndex ?? 0,
          scrollPercent: position.lastScrollPercent,
          slideIndex: readingLayout === "slide" ? slideIndex : undefined,
        };
        const startAnchor: ReadingAnchor = sessionStartAnchorRef.current ?? {
          ...endAnchor,
        };
        const metrics = computeSessionMetrics({
          map: sessionWordMap,
          start: startAnchor,
          end: endAnchor,
          activeSeconds,
          hasFullAccess: Boolean(payload?.hasFullAccess),
        });

        const hasMeaningfulSession = shouldShowExitPrompt({
          activeSeconds: metrics.activeSeconds,
          hasForwardProgress: metrics.hasForwardProgress,
        });

        if (destination === "exit") {
          openExitSheet = hasMeaningfulSession;
        }

        const shouldRecordSession =
          destination === "summary" || hasMeaningfulSession;

        let resolvedSessionId: string | null = null;
        if (shouldRecordSession) {
          sessionIdRef.current ??= crypto.randomUUID();
          const persistedSession = await createSessionMutation.mutateAsync({
            sessionId: sessionIdRef.current,
            bookId,
            wordsRead: metrics.wordsRead,
            pagesRead: metrics.pagesRead,
            durationSeconds: Math.max(1, metrics.activeSeconds),
            avgWpm: metrics.apiAvgWpm,
            startProgressPercent: metrics.startProgressPercent,
            endProgressPercent: metrics.endProgressPercent,
            startChapterNumber: metrics.startChapterNumber,
            endChapterNumber: metrics.endChapterNumber,
            highlightsCount: sessionHighlightsCountRef.current,
            mode: isAudioPlaying ? "audio" : "full",
          });

          resolvedSessionId = persistedSession?.id ?? null;
          if (persistedSession?.id) {
            setCreatedSession({
              ...persistedSession,
              bookTitle:
                persistedSession.bookTitle ||
                editorialTitle ||
                payload?.book?.title ||
                book.title,
              bookCoverUrl: persistedSession.bookCoverUrl ?? book.coverUrl,
              startChapterNumber:
                persistedSession.startChapterNumber ??
                metrics.startChapterNumber,
              endChapterNumber:
                persistedSession.endChapterNumber ?? metrics.endChapterNumber,
              startProgressPercent:
                persistedSession.startProgressPercent ??
                metrics.startProgressPercent,
              endProgressPercent:
                persistedSession.endProgressPercent ??
                metrics.endProgressPercent,
            });
            setIsSessionPosted(Boolean(persistedSession.isPosted));
          }
          sessionIdRef.current = null;
        } else {
          setCreatedSession(null);
        }

        setPostSessionError(null);
        setSessionSummary({
          sessionId: resolvedSessionId,
          bookTitle: editorialTitle || payload?.book?.title || "Buku",
          bookAuthor: payload?.book?.author || user.name || "Penulis",
          activeSeconds: metrics.activeSeconds,
          wordsRead: metrics.wordsRead,
          pagesRead: metrics.pagesRead,
          rawWpm: metrics.rawWpm,
          tempo: metrics.tempo,
          startProgressPercent: metrics.startProgressPercent,
          endProgressPercent: metrics.endProgressPercent,
          startChapterNumber: metrics.startChapterNumber,
          endChapterNumber: metrics.endChapterNumber,
          highlightsCount: sessionHighlightsCountRef.current,
        });
      }

      if (destination === "membership") {
        await navigate({ to: "/membership", search: { book: slug } });
      } else if (destination === "home") {
        await navigate({ to: "/app", search: { tab: "home" } });
      } else if (openExitSheet) {
        setIsExitPromptOpen(true);
      } else {
        await navigate({ to: "/app", search: { tab: "home" } });
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

  function handleResumeReading() {
    setIsExitPromptOpen(false);
    setPostSessionError(null);
    const pos = capturePosition();
    sessionStartAnchorRef.current = pos
      ? {
          chapterNumber: pos.lastChapterNumber,
          paragraphIndex: pos.lastParagraphIndex ?? 0,
          scrollPercent: pos.lastScrollPercent,
          slideIndex: readingLayout === "slide" ? slideIndex : undefined,
        }
      : null;
    sessionHighlightsCountRef.current = 0;
    sessionIdRef.current = null;
    resetActiveTimer();
  }

  async function handlePublishSession(input: PublishSessionPostInput) {
    if (!createdSessionId) return;
    setPostSessionError(null);
    try {
      const updated = await togglePostSessionMutation.mutateAsync({
        sessionId: createdSessionId,
        ...input,
      });
      setIsSessionPosted(updated.isPosted);
      setCreatedSession((prev) =>
        prev && prev.id === updated.id
          ? {
              ...prev,
              isPosted: updated.isPosted,
              title: updated.title,
              note: updated.note,
              postConfig: updated.postConfig,
            }
          : prev,
      );
    } catch (err) {
      setPostSessionError(
        err instanceof Error
          ? err.message
          : "Gagal membagikan sesi ke linimasa. Coba lagi.",
      );
    }
  }

  const hiddenFingerprint = useMemo(
    () =>
      drmPolicy.isEnabled && payload?.watermark
        ? encodeZeroWidthFingerprint(payload.watermark)
        : "",
    [drmPolicy.isEnabled, payload?.watermark],
  );

  const lastLoadedChapterNum = loadedChapters.at(-1)?.chapterNumber ?? 0;
  const bookLastChapterNum = payload?.allChapters.at(-1)?.chapterNumber;
  const hasMoreChapters =
    !isAuthorOrPublisher &&
    !isManuscript &&
    Boolean(payload?.hasFullAccess) &&
    bookLastChapterNum !== undefined &&
    lastLoadedChapterNum < bookLastChapterNum;
  const hasReachedBookEnd = Boolean(payload?.hasFullAccess) && !hasMoreChapters;

  if (
    isLoading ||
    (payload &&
      !isError &&
      !isExpired &&
      (waitingForCheckpoint ||
        (!hasRestoredRef.current && checkpointTargetOutOfWindow)))
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

  if (isReaderSuspended) {
    const suspension = readerDrmStatus?.latestSuspension ?? null;
    const status = readerDrmStatus?.status ?? "suspended";
    const canAppeal = status === "suspended" || status === "rejected";
    const statusText =
      status === "appeal_pending"
        ? "Peninjauan Diajukan"
        : status === "rejected"
          ? "Peninjauan Ditolak"
          : "Pembekuan Aktif";

    return (
      <main
        id="main-content"
        className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center px-4 py-12"
      >
        <section
          aria-labelledby="drm-suspended-title"
          className="w-full rounded-[10px] border border-border bg-card overflow-hidden"
        >
          {/* Editorial Masthead Bar: Authentic AnzaBook Logo + Plain Monospace Status Indicator */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <Brand asLink={false} size="sm" />
            <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wider text-destructive tabular-nums">
              <span
                className="size-1.5 shrink-0 rounded-full bg-destructive"
                aria-hidden="true"
              />
              {statusText}
            </span>
          </header>

          {/* Main Content Sheet */}
          <div className="p-6 sm:p-7 space-y-6 text-left">
            <div className="space-y-2.5 border-b border-border/70 pb-5 text-center">
              <h1
                id="drm-suspended-title"
                className="font-serif text-2xl font-semibold tracking-tight text-foreground"
              >
                Akses E-Reader Dibekukan Sementara
              </h1>
              <p className="mx-auto max-w-md text-sm text-muted-foreground leading-relaxed">
                Sistem keamanan DRM mendeteksi{" "}
                <strong className="font-semibold text-foreground tabular-nums">
                  {suspension?.triggerCount ?? 7} /{" "}
                  {readerDrmStatus?.strikeLimit ?? 7} pelanggaran prioritas
                  tinggi
                </strong>{" "}
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  (siklus ke-{suspension?.cycleNumber ?? 1})
                </span>
                . Akses baca ditahan sementara untuk melindungi hak cipta
                penulis dan penerbit.
              </p>
            </div>

            {suspension?.reviewNote && (
              <div className="border-l-2 border-destructive pl-3.5 py-0.5 text-xs space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Catatan Admin
                </span>
                <p className="text-foreground leading-relaxed">
                  {suspension.reviewNote}
                </p>
              </div>
            )}

            {status === "appeal_pending" ? (
              <div className="border-l-2 border-[var(--color-accent)] pl-3.5 py-0.5 text-xs space-y-1.5">
                <p className="font-semibold text-foreground">
                  Permintaan Peninjauan Terkirim
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Tim Admin AnzaBook sedang meninjau laporan Anda. Klik periksa
                  status setelah Admin menyetujui pemulihan akses baca.
                </p>
                {suspension?.appealMessage && (
                  <p className="pt-1 italic text-muted-foreground">
                    &ldquo;{suspension.appealMessage}&rdquo;
                  </p>
                )}
              </div>
            ) : canAppeal ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAppealFeedback(null);
                  try {
                    await submitAppealMutation.mutateAsync({
                      appealMessage: appealMessageInput.trim(),
                    });
                    setAppealMessageInput("");
                    setAppealFeedback(
                      "Permintaan peninjauan berhasil dikirim ke Admin.",
                    );
                  } catch (err) {
                    setAppealFeedback(
                      err instanceof Error
                        ? err.message
                        : "Gagal mengirim permintaan peninjauan.",
                    );
                  }
                }}
                className="space-y-3"
              >
                <label
                  htmlFor="drm-appeal-message"
                  className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
                >
                  Ajukan Peninjauan Akses ke Admin
                </label>
                <textarea
                  id="drm-appeal-message"
                  aria-label="Alasan Peninjauan Akses"
                  value={appealMessageInput}
                  onChange={(e) => setAppealMessageInput(e.target.value)}
                  minLength={10}
                  maxLength={1000}
                  required
                  rows={3}
                  placeholder="Jelaskan kronologi aktivitas Anda agar Admin dapat meninjau pemulihan akses E-Reader..."
                  className="w-full resize-none rounded-[6px] border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
                {appealFeedback && (
                  <p className="text-xs text-muted-foreground">
                    {appealFeedback}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={
                    submitAppealMutation.isPending ||
                    appealMessageInput.trim().length < 10
                  }
                  className="w-full min-h-11 font-mono text-xs bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold hover:brightness-105 disabled:bg-[var(--color-accent)]/45 disabled:text-[var(--color-accent-ink)]/80 disabled:opacity-100"
                >
                  {submitAppealMutation.isPending
                    ? "Mengirim..."
                    : "Ajukan Peninjauan Akses"}
                </Button>
              </form>
            ) : null}
          </div>

          {/* Ruled Footer Utility Actions */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-3.5">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 font-mono text-xs"
              onClick={async () => {
                lastDrmLogRef.current.clear();
                setSuspendedNow(false);
                await queryClient.invalidateQueries({
                  queryKey: booksKeys.readers(),
                });
                await Promise.all([refetchDrmStatus(), refetchBook()]);
              }}
            >
              Periksa Status Akses
            </Button>
            <Link
              to="/app"
              search={{ tab: "home" }}
              className="inline-flex min-h-11 items-center rounded-sm px-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              Kembali ke Home
            </Link>
          </footer>
        </section>
      </main>
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
  const chaptersList =
    loadedChapters.length > 0 ? loadedChapters : [currentChapter];
  const isPremiumPreview =
    !payload.hasFullAccess && book.accessTier === "premium";
  const chapterIndex = allChapters.findIndex(
    (item: BookChapterSummaryDto) => item.chapterNumber === activeChapterNum,
  );
  const nextChapter = payload.hasFullAccess
    ? allChapters[chapterIndex + 1]?.chapterNumber
    : undefined;
  const currentPercent = computeBookWordWeightedPercent(
    bookWordMap,
    activeChapterNum,
    scrollPosition.percent,
    Boolean(payload.hasFullAccess),
  );

  return (
    <DrmShield
      watermarkText={watermark}
      enabled={drmPolicy.isEnabled}
      theme={theme}
      onSecurityTrigger={handleDrmSecurityTrigger}
    >
      <div
        data-theme={theme}
        className={`${
          readingLayout === "slide"
            ? "h-dvh min-h-[26rem] overflow-clip"
            : "min-h-screen"
        } flex flex-col bg-background text-foreground transition-colors duration-300`}
      >
        {/* Sticky Header: Reader Toolbar + Audio Player (stacked in single sticky container so they NEVER overlap) */}
        <div className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-md border-b border-border/40 transition-colors">
          <ReaderToolbar
            bookTitle={editorialTitle || book.title}
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
            allChapters={displayChapters}
            onSelectChapter={handleSelectChapter}
            onFinishSession={() => void saveSession("summary")}
            onExit={() => void saveSession("exit")}
            isSaving={isSaving}
            isAudioOpen={isAudioOpen}
            onToggleAudio={
              currentChapter.audioUrl
                ? () => {
                    if (isAudioOpen) setIsAudioPlaying(false);
                    setIsAudioOpen(!isAudioOpen);
                  }
                : undefined
            }
            isDrmEnabled={drmPolicy.isEnabled}
            onToggleDrm={
              drmPolicy.showToggle
                ? () => setDrmToggleState((prev) => !prev)
                : undefined
            }
            isHighlightsOpen={isHighlightsOpen}
            onToggleHighlights={() => setIsHighlightsOpen(!isHighlightsOpen)}
            highlightCount={allHighlights.length}
            onShare={(event) =>
              setShare({
                url: new URL(bookPagePath(slug), window.location.origin).href,
                trigger: event.currentTarget,
              })
            }
            isAuthorOrPublisher={isAuthorOrPublisher}
            editMode={editMode}
            onEditModeChange={setEditMode}
            onSaveDraft={handleSaveDraft}
            onSubmitDraft={
              isPublisherReview
                ? () => setIsPublishDialogOpen(true)
                : () => setIsConfigDialogOpen(true)
            }
            submitDraftLabel={
              isPublisherReview ? "Review & Terbitkan" : "Ajukan Naskah"
            }
            isSavingDraft={isSavingDraft}
          />

          {/* Substack-Style Rich Formatting Toolbar (Active when in Edit Mode) */}
          {isAuthorOrPublisher && editMode === "edit" && (
            <SubstackEditorToolbar editor={editor} />
          )}

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
                  recordReadingActivity();
                  setActiveParagraphIndex(idx);
                  chapterSection(currentChapter.chapterNumber)
                    ?.querySelector(`[data-reader-paragraph="${idx}"]`)
                    ?.scrollIntoView({ block: "center" });
                }}
                onPlaybackStateChange={setIsAudioPlaying}
                onClose={() => {
                  setIsAudioPlaying(false);
                  setIsAudioOpen(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Left Dynamic TOC Sidebar (Only rendered in Scroll Mode; hidden in Slide Mode so it never obstructs the book spread) */}
        {readingLayout === "scroll" && (
          <ReaderSidebarToc
            chapters={displayChapters}
            currentChapterNumber={activeChapterNum}
            onSelectChapter={handleSelectChapter}
          />
        )}

        {/* Centered Document Reader Canvas */}
        <main
          id="main-content"
          ref={readerCanvasRef}
          className={`w-full mx-auto ${
            readingLayout === "slide"
              ? "max-w-[1440px] px-4 sm:px-6 lg:px-8 py-1 sm:py-2 flex min-h-0 flex-1 flex-col"
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
              {/* Header Buku (Author, Judul Besar Serif, Bab, Cover) - Sesuai SS 2 */}
              <ReaderBookHeader
                authorOrPublisher={book.author || user.name || "Penulis"}
                title={editorialTitle || book.title}
                totalChapters={displayChapters.length}
                coverUrl={
                  editorialCoverUrl !== undefined
                    ? editorialCoverUrl
                    : book.coverUrl
                }
                coverColor={editorialCoverColor || book.coverColor}
                publishedYear={book.publishedYear}
                genres={book.genres}
                pageCount={book.pageCount}
                isEditMode={isAuthorOrPublisher && editMode === "edit"}
                onTitleChange={setEditorialTitle}
                onCoverUrlChange={setEditorialCoverUrl}
                onCoverColorChange={setEditorialCoverColor}
              />

              {/* JIKA AUTHOR / PUBLISHER: RENDER TIPTAP WYSIWYG KANVAS (EDIT ATAU PREVIEW) */}
              {isAuthorOrPublisher ? (
                <div
                  className={`tiptap-editorial-canvas relative font-serif text-[18px] leading-[1.85] text-justify min-h-[500px] ${
                    editMode === "preview"
                      ? "is-preview-reading-mode select-text"
                      : ""
                  }`}
                >
                  <EditorContent editor={editor} />
                </div>
              ) : (
                chaptersList.map(
                  (chap: BookReaderChapterDto, chapIdx: number) => {
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
                            <h1 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight">
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
                            <h2 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight mb-3">
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
                                      <DrmStegoFingerprint
                                        fingerprint={hiddenFingerprint}
                                      />
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
                            style={{
                              fontSize: `${fontSize}px`,
                              lineHeight: 1.85,
                            }}
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
                                      {text.trim().startsWith("<") ? (
                                        <div
                                          className="leading-relaxed mb-6 select-text"
                                          dangerouslySetInnerHTML={{
                                            __html: text,
                                          }}
                                        />
                                      ) : (
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
                                          <DrmStegoFingerprint
                                            fingerprint={hiddenFingerprint}
                                          />
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  },
                )
              )}

              {/* End of Reading Completion Section / Seamless Chapter Prefetch Footer */}
              {payload.hasFullAccess && hasMoreChapters && (
                <div className="pt-12 border-t border-current/10 text-center space-y-3">
                  <p className="text-xs font-mono text-muted-foreground">
                    Menyiapkan Bab {lastLoadedChapterNum + 1} agar baca tetap
                    mengalir...
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void prefetchChapter(lastLoadedChapterNum + 1)
                    }
                    className="font-mono text-xs"
                  >
                    Muat Bab {lastLoadedChapterNum + 1}
                  </Button>
                </div>
              )}

              {hasReachedBookEnd && (
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
              spreads={spreads}
              index={slideIndex}
              onMeasure={setProbe}
              onTurn={turnPage}
              onFinishSession={() => void saveSession("summary")}
              onOpenRating={() => setIsRatingOpen(true)}
              fontClass={fontClass}
              fontSize={fontSize}
              coverColor={book.coverColor}
              isPremiumPreview={isPremiumPreview}
              allChapterNumbers={allChapterNumbers}
              hasFullAccess={Boolean(payload?.hasFullAccess)}
              renderFragment={(fragment, chapterNumber) => (
                <>
                  {renderHighlightedText(
                    fragment.source,
                    allHighlights.filter(
                      (item) => item.chapterNumber === chapterNumber,
                    ),
                    handleFlexHighlight,
                    fragment,
                  )}
                  <DrmStegoFingerprint fingerprint={hiddenFingerprint} />
                </>
              )}
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
                {book.digitalPolicy === "print_code_only"
                  ? "Klaim kode dari buku cetak untuk membuka naskah lengkap."
                  : "Jadi Nakama untuk melanjutkan buku ini dan membuka koleksi Premium."}
              </p>
              <Button asChild size="lg" className="min-h-11">
                {book.digitalPolicy === "print_code_only" ? (
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
            totalChapters={displayChapters.length}
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

        {share && (
          <BookShareDialog
            slug={slug}
            title={book.title}
            url={share.url}
            trigger={share.trigger}
            onClose={() => setShare(null)}
          />
        )}

        {/* Unified Quote Post & Share Composer */}
        {(() => {
          const hl = storyDialogData.highlight;
          const matchedChapter = hl
            ? loadedChapters.find(
                (item) => item.chapterNumber === hl.chapterNumber,
              )
            : null;
          const surroundingContext = hl
            ? extractSurroundingContext(
                matchedChapter?.contentId ?? currentChapter.contentId,
                hl.selectedText,
              )
            : null;

          return (
            <HighlightStoryDialog
              isOpen={storyDialogData.isOpen && Boolean(hl)}
              theme={theme}
              onClose={() =>
                setStoryDialogData((prev) => ({ ...prev, isOpen: false }))
              }
              highlightId={hl?.id}
              bookTitle={hl?.bookTitle ?? book.title}
              bookAuthor={book.author}
              bookSlug={slug}
              bookCoverUrl={hl?.bookCoverUrl ?? book.coverUrl}
              bookCoverColor={book.coverColor}
              chapterNumber={hl?.chapterNumber ?? activeChapterNum}
              pageNumber={hl?.pageNumber ?? activeSpread?.chapterPage}
              highlightText={hl?.selectedText ?? ""}
              color={hl?.color ?? "yellow"}
              note={hl?.note}
              surroundingContext={surroundingContext}
              isPosted={hl?.isPosted}
              postCaption={hl?.postCaption}
              postConfig={hl?.postConfig}
              readerName={user.name}
              onPublishedChange={(result) => {
                setOptimisticHighlights((prev) =>
                  prev.map((item) =>
                    item.id === result.id
                      ? {
                          ...item,
                          isPosted: result.isPosted,
                          postCaption: result.postCaption,
                          postConfig: result.postConfig,
                        }
                      : item,
                  ),
                );
                setStoryDialogData((prev) =>
                  prev.highlight && prev.highlight.id === result.id
                    ? {
                        ...prev,
                        highlight: {
                          ...prev.highlight,
                          isPosted: result.isPosted,
                          postCaption: result.postCaption,
                          postConfig: result.postConfig,
                        },
                      }
                    : prev,
                );
              }}
            />
          );
        })()}

        <FlexReadingDialog
          isOpen={isSessionComposerOpen}
          theme={theme}
          onClose={() => {
            setIsSessionComposerOpen(false);
            handleResumeReading();
          }}
          session={createdSession}
          bookTitle={book.title}
          bookAuthor={book.author}
          bookSlug={slug}
          bookCoverUrl={book.coverUrl}
          bookCoverColor={book.coverColor}
          streakDays={sessionsData?.summary?.currentStreakDays ?? null}
          recentSessions={
            sessionsData?.data ?? (createdSession ? [createdSession] : [])
          }
          userName={user.name}
          onPublishedChange={(result) => {
            setIsSessionPosted(result.isPosted);
            setCreatedSession((prev) =>
              prev && prev.id === result.id
                ? {
                    ...prev,
                    isPosted: result.isPosted,
                    title: result.title,
                    note: result.note,
                    postConfig: result.postConfig,
                  }
                : prev,
            );
          }}
        />

        {/* Marginalia Comments Drawer */}
        <MarginaliaDrawer
          slug={slug}
          chapterId={currentChapter.id}
          paragraphIndex={marginaliaParagraph ?? 0}
          isOpen={marginaliaParagraph !== null}
          onClose={() => setMarginaliaParagraph(null)}
        />

        {/* Post-Reading Session Summary & Optional Share Sheet */}
        <PostReadingExitSheet
          isOpen={isExitPromptOpen}
          theme={theme}
          summary={sessionSummary}
          isPosted={isSessionPosted}
          isSubmittingPost={togglePostSessionMutation.isPending}
          postError={postSessionError}
          nextChapter={nextChapter}
          onSkipAndExit={() =>
            void navigate({ to: "/app", search: { tab: "home" } })
          }
          onResumeReading={handleResumeReading}
          onContinueNextChapter={(targetChapter) => {
            handleResumeReading();
            void handleSelectChapter(targetChapter);
          }}
          onPublishSession={handlePublishSession}
          onOpenExternalComposer={() => {
            setIsExitPromptOpen(false);
            setIsSessionComposerOpen(true);
          }}
        />
        {/* Author Manuscript Submission & Configuration Dialog */}
        {isAuthorOwner && (
          <ManuscriptConfigDialog
            isOpen={isConfigDialogOpen}
            onClose={() => setIsConfigDialogOpen(false)}
            initialData={{
              title: editorialTitle || book.title,
              synopsis: manuscript?.synopsis || book.synopsis || "",
              category: manuscript?.category || "",
              sourceLanguage: manuscript?.sourceLanguage || "id",
              targetAudience: manuscript?.targetAudience || "general",
              authorNotes: manuscript?.authorNotes || "",
              isbn: manuscript?.isbn || "",
              estimatedPages: manuscript?.estimatedPages || 180,
              publisherId:
                search.targetPublisherId || manuscript?.publisherId || "",
              digitalPolicy: book.digitalPolicy,
              proposedDigitalPriceIdr:
                manuscript?.proposedDigitalPriceIdr ?? 45_000,
            }}
            onSubmit={async (config) => {
              await handleSaveDraft();
              if (isManuscript && manuscriptId) {
                await updateManuscriptMutation.mutateAsync({
                  idOrSlug: manuscriptId,
                  input: {
                    title: config.title,
                    synopsis: config.synopsis,
                    category: config.category,
                    sourceLanguage: config.sourceLanguage,
                    targetAudience: config.targetAudience,
                    authorNotes: config.authorNotes || null,
                    isbn: config.isbn || null,
                    estimatedPages: config.estimatedPages,
                    proposedDigitalPolicy: config.digitalPolicy,
                    proposedDigitalPriceIdr:
                      config.proposedDigitalPriceIdr ?? null,
                  },
                });
                await submitDraftMutation.mutateAsync({
                  idOrSlug: manuscriptId,
                  publisherId: config.publisherId || null,
                });
                setIsConfigDialogOpen(false);
                refetchManuscript();
                navigate({ to: "/app", search: { tab: "profile" } });
              }
            }}
            isSubmitting={submitDraftMutation.isPending}
          />
        )}

        {/* Publisher Atomic Catalog Publish Dialog */}
        {(isPublisherReview || isPublishDialogOpen) &&
          isManuscript &&
          manuscript &&
          activePublisherSlug && (
            <PublishManuscriptDialog
              isOpen={isPublishDialogOpen}
              onClose={() => setIsPublishDialogOpen(false)}
              publisherSlug={activePublisherSlug}
              publisherName={
                managedTargetPublisher?.name ?? manuscript.publisherName
              }
              manuscript={manuscript}
              initialTitle={editorialTitle || manuscript.title}
              initialCoverUrl={editorialCoverUrl}
            />
          )}

        {/* Publisher Review & Revision Bar */}
        {isPublisherReview &&
          isManuscript &&
          manuscript &&
          activePublisherSlug && (
            <div className="fixed bottom-0 inset-x-0 z-50 bg-[var(--color-paper-2)]/95 backdrop-blur-md border-t border-[var(--color-rule)] shadow-2xl p-3 sm:px-6 text-[var(--color-ink)]">
              <div className="max-w-5xl mx-auto space-y-2">
                {reviewError && (
                  <p
                    role="alert"
                    className="rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-3 py-1.5 text-xs"
                  >
                    {reviewError}
                  </p>
                )}

                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="flex-1 w-full space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[var(--color-accent)]" />
                      <label
                        htmlFor="studio-review-notes"
                        className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-muted)] font-semibold"
                      >
                        Kurasi {managedTargetPublisher?.name || "Penerbit"}:{" "}
                        {editorialTitle || book.title}
                      </label>
                    </div>
                    <input
                      id="studio-review-notes"
                      type="text"
                      value={editorialNotes}
                      onChange={(e) => {
                        setEditorialNotes(e.target.value);
                        if (reviewError) setReviewError(null);
                      }}
                      placeholder="Ketik catatan editorial, instruksi revisi, atau alasan penolakan..."
                      className="w-full min-h-11 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-lg px-3 py-2 outline-none focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] placeholder:text-[var(--color-muted)]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
                    {manuscript.status !== "in_editing" && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={reviewPublisherMutation.isPending}
                        onClick={async () => {
                          setReviewError(null);
                          try {
                            await reviewPublisherMutation.mutateAsync({
                              slug: activePublisherSlug,
                              idOrSlug: manuscriptId,
                              input: {
                                action: "start_editing",
                                notes: editorialNotes.trim() || undefined,
                              },
                            });
                            setEditMode("edit");
                            await refetchManuscript();
                          } catch (err) {
                            setReviewError(
                              err instanceof Error
                                ? err.message
                                : "Gagal memulai penyuntingan naskah.",
                            );
                          }
                        }}
                        className="min-h-11 px-3.5 text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        Mulai Sunting
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      disabled={reviewPublisherMutation.isPending}
                      onClick={async () => {
                        const trimmed = editorialNotes.trim();
                        if (!trimmed) {
                          setReviewError(
                            "Isi catatan revisi sebelum meminta perbaikan kepada penulis.",
                          );
                          return;
                        }
                        setReviewError(null);
                        try {
                          await reviewPublisherMutation.mutateAsync({
                            slug: activePublisherSlug,
                            idOrSlug: manuscriptId,
                            input: {
                              action: "request_revision",
                              notes: trimmed,
                            },
                          });
                          await refetchManuscript();
                          void navigate({
                            to: "/p/$slug/studio",
                            params: { slug: activePublisherSlug },
                          });
                        } catch (err) {
                          setReviewError(
                            err instanceof Error
                              ? err.message
                              : "Gagal mengirim permintaan revisi.",
                          );
                        }
                      }}
                      className="min-h-11 px-3.5 text-xs font-semibold border-[var(--color-accent)]/60 bg-[var(--color-accent-soft)] text-[var(--color-ink)] rounded-xl cursor-pointer"
                    >
                      Minta Revisi
                    </Button>

                    <Button
                      type="button"
                      disabled={reviewPublisherMutation.isPending}
                      onClick={() => {
                        setReviewError(null);
                        setIsPublishDialogOpen(true);
                      }}
                      className="min-h-11 px-4 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 rounded-xl cursor-pointer"
                    >
                      Setujui &amp; Terbitkan
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={reviewPublisherMutation.isPending}
                      onClick={async () => {
                        const trimmed = editorialNotes.trim();
                        if (!trimmed) {
                          setReviewError(
                            "Isi alasan penolakan sebelum menolak naskah.",
                          );
                          return;
                        }
                        setReviewError(null);
                        try {
                          await reviewPublisherMutation.mutateAsync({
                            slug: activePublisherSlug,
                            idOrSlug: manuscriptId,
                            input: {
                              action: "reject",
                              notes: trimmed,
                            },
                          });
                          await refetchManuscript();
                          void navigate({
                            to: "/p/$slug/studio",
                            params: { slug: activePublisherSlug },
                          });
                        } catch (err) {
                          setReviewError(
                            err instanceof Error
                              ? err.message
                              : "Gagal menolak naskah.",
                          );
                        }
                      }}
                      className="min-h-11 px-3.5 text-xs text-[var(--color-error)] border-[var(--color-error)]/40 hover:bg-[var(--color-error-soft)] rounded-xl cursor-pointer"
                    >
                      Tolak
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </DrmShield>
  );
}
