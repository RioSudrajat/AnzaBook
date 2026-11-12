import { useState, useEffect } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  BookMarked,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Crown,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import type { BookDetailDto, BookSummaryDto, EditionTier } from "@starter/shared/types";
import { SiteFooter } from "@/components/site-footer";
import { SmartBackButton } from "@/components/smart-back-button";
import { AppShell } from "@/features/dashboard/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  bookPagePath,
  bookPreviewPath,
  bookShareOrigin,
} from "@/features/books/book-share";
import { FlagIcon } from "@/components/ui/flag-icon";
import { BookCover } from "@/features/books/components/book-cover";
import { BookCatalogCard } from "@/features/books/components/book-catalog-card";
import { ClaimCodeDialog } from "@/features/books/components/claim-code-dialog";
import { LiveStockTracker } from "@/features/books/components/live-stock-tracker";
import { StoreMap } from "@/features/books/components/store-map";
import {
  useBookDetail,
  useBookReviews,
  useBooks,
  useCreateReview,
  usePurchaseBookAlacarte,
} from "@/features/books/hooks";
import { bookDetailQuery } from "@/features/books/queries";
import { useUpsertShelf } from "@/features/community/hooks";

export const Route = createFileRoute("/books/$slug")({
  loader: async ({ context, params }) => {
    try {
      const { slug, title, author, synopsis } = await context.queryClient.ensureQueryData(
        bookDetailQuery(params.slug),
      );
      return { book: { slug, title, author, synopsis }, origin: bookShareOrigin() };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { book, origin } = loaderData;
    const title = `${book.title} — ${book.author}`;
    const url = new URL(bookPagePath(book.slug), origin).href;
    const image = new URL(bookPreviewPath(book.slug), origin).href;
    return {
      meta: [
        { title: `${title} | AnzaBook` },
        { name: "description", content: book.synopsis },
        { property: "og:type", content: "book" },
        { property: "og:site_name", content: "AnzaBook" },
        { property: "og:title", content: title },
        { property: "og:description", content: book.synopsis },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        {
          property: "og:image:alt",
          content: `Sampul ${book.title}, ${book.author}`,
        },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: BookDetailPage,
});

function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function B2B2CActionButtons({
  book,
  isLoggedIn,
  onStartReading,
  onReadSample,
  onSaveToLibrary,
  onPurchaseAlacarte,
  shelfSaved,
  shelfError,
  isSavingShelf,
  isPurchasing,
  purchaseError,
  purchaseSuccess,
}: {
  book: BookDetailDto;
  isLoggedIn: boolean;
  onStartReading: () => void;
  onReadSample: () => void;
  onSaveToLibrary: () => void;
  onPurchaseAlacarte: () => void;
  shelfSaved: boolean;
  shelfError: boolean;
  isSavingShelf: boolean;
  isPurchasing: boolean;
  purchaseError: string | null;
  purchaseSuccess: boolean;
}) {
  const policy = book.digitalPolicy;
  const isClaimOnly = policy === "print_claim_only";
  const isSampleOnly = policy === "sample_only";
  const isAlacarteOnly = policy === "alacarte_only";
  const isHybrid = policy === "hybrid_nakama_alacarte";
  const isFree = policy === "free_open";

  const priceFormatted = book.alacartePriceIdr
    ? formatIdr(book.alacartePriceIdr)
    : "Rp25.000";

  return (
    <div className="w-full max-w-[280px] space-y-3 font-mono text-left">
      {/* 1. Policy Context Notice / Badge */}
      {isClaimOnly && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] font-sans leading-snug text-amber-900 dark:text-amber-200">
          <div className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-300 font-mono text-[10px] uppercase">
            <span>🛡️ Eksklusif Cetak Fisik</span>
          </div>
          <p className="mt-1 text-[11px]">
            Eksklusif Pemilik Buku Cetak Resmi — Tidak Dijual Eceran Digital. Masukkan kode unik buku fisik Anda untuk membuka akses.
          </p>
        </div>
      )}

      {isSampleOnly && (
        <div className="rounded-lg border border-border/80 bg-muted/40 p-2.5 text-[11px] font-sans leading-snug text-foreground/80">
          <div className="font-bold flex items-center gap-1 font-mono text-[10px] uppercase text-foreground">
            <span>👑 Nakama Reader Pool</span>
          </div>
          <p className="mt-1 text-[11px]">
            Buka Penuh dengan Langganan Nakama — Buku ini termasuk dalam Ekosistem Nakama Club Reader.
          </p>
        </div>
      )}

      {/* 2. Primary B2B2C Action Scheme Buttons */}
      {/* Scheme A: print_claim_only */}
      {isClaimOnly && (
        <>
          {isLoggedIn ? (
            <ClaimCodeDialog
              slug={book.slug}
              bookTitle={book.title}
              hasClaimedDigital={book.hasClaimedDigital}
            />
          ) : (
            <Button
              asChild
              size="lg"
              className="w-full h-12 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs gap-2 shadow-md transition-all active:scale-95"
            >
              <Link to="/sign-in" search={{ redirect: `/books/${book.slug}` }}>
                🔑 Klaim Kode Buku Cetak Asli
              </Link>
            </Button>
          )}

          <Button
            onClick={onReadSample}
            variant="outline"
            size="lg"
            className="w-full h-11 bg-background text-foreground border-border hover:bg-muted font-medium text-xs gap-2 transition-all active:scale-95"
          >
            <BookOpen className="size-4" />
            Baca Sampel Bab 1
          </Button>
        </>
      )}

      {/* Scheme B: sample_only */}
      {isSampleOnly && (
        <>
          <Button
            onClick={onStartReading}
            size="lg"
            className="w-full h-12 bg-red-600 hover:bg-red-500 text-white font-bold text-xs gap-2 shadow-md transition-all active:scale-95"
          >
            <BookOpen className="size-4" />
            Mulai Membaca
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full h-11 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 font-medium text-xs gap-2 transition-all active:scale-95"
          >
            <Link to="/membership">
              <Sparkles className="size-4 text-amber-500" />
              Buka Penuh dengan Nakama
            </Link>
          </Button>

          {book.hasPhysical && (
            isLoggedIn ? (
              <ClaimCodeDialog
                slug={book.slug}
                bookTitle={book.title}
                hasClaimedDigital={book.hasClaimedDigital}
              />
            ) : (
              <Button asChild variant="outline" size="sm" className="w-full h-10 text-xs">
                <Link to="/sign-in" search={{ redirect: `/books/${book.slug}` }}>
                  Klaim Kode Buku Fisik
                </Link>
              </Button>
            )
          )}
        </>
      )}

      {/* Scheme C: alacarte_only */}
      {isAlacarteOnly && (
        <>
          <Button
            onClick={onPurchaseAlacarte}
            disabled={isPurchasing}
            size="lg"
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 shadow-md transition-all active:scale-95"
          >
            {isPurchasing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Memproses Pembelian...
              </>
            ) : purchaseSuccess ? (
              <>
                <Check className="size-4" />
                Akses Berhasil Dibeli!
              </>
            ) : (
              <>
                <ShoppingBag className="size-4" />
                Beli Akses Digital Selamanya ({priceFormatted})
              </>
            )}
          </Button>

          <Button
            onClick={onReadSample}
            variant="outline"
            size="lg"
            className="w-full h-11 bg-background text-foreground border-border hover:bg-muted font-medium text-xs gap-2 transition-all active:scale-95"
          >
            <BookOpen className="size-4" />
            Baca Sampel Bab 1
          </Button>

          {purchaseError && (
            <p role="alert" className="text-xs text-destructive font-sans">
              {purchaseError}
            </p>
          )}
        </>
      )}

      {/* Scheme Hybrid: hybrid_nakama_alacarte */}
      {isHybrid && (
        <>
          <Button
            onClick={onPurchaseAlacarte}
            disabled={isPurchasing}
            size="lg"
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 shadow-md transition-all active:scale-95"
          >
            {isPurchasing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingBag className="size-4" />
            )}
            Beli Akses Digital ({priceFormatted})
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full h-11 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 font-medium text-xs gap-2 transition-all active:scale-95"
          >
            <Link to="/membership">
              <Sparkles className="size-4 text-amber-500" />
              Buka dengan Nakama (Rp39rb/bln)
            </Link>
          </Button>

          <Button
            onClick={onReadSample}
            variant="outline"
            size="sm"
            className="w-full h-10 bg-background text-foreground text-xs gap-2 transition-all active:scale-95"
          >
            <BookOpen className="size-3.5" />
            Baca Sampel Bab 1
          </Button>
        </>
      )}

      {/* Scheme Free: free_open */}
      {isFree && (
        <Button
          onClick={onStartReading}
          size="lg"
          className="w-full h-12 bg-red-600 hover:bg-red-500 text-white font-bold text-xs gap-2 shadow-md transition-all active:scale-95"
        >
          <BookOpen className="size-4" />
          Mulai Membaca
        </Button>
      )}

      {/* Save to Library Button (common for all) */}
      <Button
        onClick={onSaveToLibrary}
        variant="outline"
        size="lg"
        disabled={isSavingShelf || shelfSaved}
        className="w-full h-11 bg-background text-foreground border-border hover:bg-muted font-medium text-xs gap-2 transition-all active:scale-95"
      >
        {shelfSaved ? (
          <>
            <Check className="size-4 text-emerald-600" />
            Tersimpan di Rak!
          </>
        ) : (
          <>
            <BookMarked className="size-4" />
            Save to Library
          </>
        )}
      </Button>

      {shelfError && (
        <p role="alert" className="text-sm text-destructive font-sans">
          Buku belum tersimpan. Coba lagi.
        </p>
      )}

      {/* Physical Stock Button */}
      {book.hasPhysical && (
        <Button asChild variant="outline" size="lg" className="w-full min-h-11 font-mono text-xs">
          <a href="#stok-buku">
            <Package className="size-4 mr-1.5" />
            Lihat Stok Buku Fisik
          </a>
        </Button>
      )}
    </div>
  );
}

export default function BookDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const isLoggedIn = !!Route.useRouteContext().session;
  const sessionUser = Route.useRouteContext().session?.user;

  const { data: book } = useBookDetail(slug);
  const { data: reviews = [] } = useBookReviews(slug);
  const primaryCategory = book.categories?.[0] || book.genres?.[0];
  const { data: relatedBooksData } = useBooks({ category: primaryCategory });
  const relatedBooks = (relatedBooksData?.data || []).filter(
    (b: { slug: string }) => b.slug !== book.slug,
  );

  const [shelfSaved, setShelfSaved] = useState(false);
  const [shelfError, setShelfError] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5.0);
  const [reviewTier, setReviewTier] = useState<EditionTier | "digital">(
    "rakyat_economy",
  );
  const [reviewContent, setReviewContent] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const upsertShelfMutation = useUpsertShelf();
  const createReviewMutation = useCreateReview(slug);
  const purchaseMutation = usePurchaseBookAlacarte(slug);

  // Capture Affiliate Referral ref=cal_<slug> to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        sessionStorage.setItem("anzabook_affiliate_ref", ref);
      }
    }
  }, []);

  const handleStartReading = () => {
    navigate({
      to: "/read/$slug",
      params: { slug: book.slug },
      search: {},
    });
  };

  const handleReadSample = () => {
    navigate({
      to: "/read/$slug",
      params: { slug: book.slug },
      search: { chapter: 1 },
    });
  };

  const handlePurchaseAlacarte = async () => {
    if (!isLoggedIn) {
      navigate({
        to: "/sign-in",
        search: { redirect: `/books/${book.slug}` },
      });
      return;
    }

    setPurchaseError(null);
    try {
      const affiliateRef =
        typeof window !== "undefined"
          ? sessionStorage.getItem("anzabook_affiliate_ref")
          : null;
      const affiliateCalendarSlug = affiliateRef
        ? affiliateRef.replace(/^cal_/, "")
        : undefined;

      await purchaseMutation.mutateAsync({
        bookId: book.id,
        affiliateCalendarSlug,
      });
      setPurchaseSuccess(true);
      setTimeout(() => {
        navigate({
          to: "/read/$slug",
          params: { slug: book.slug },
          search: {},
        });
      }, 1000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setPurchaseError(
        error?.message || "Gagal memproses pembelian buku. Silakan coba lagi.",
      );
    }
  };

  // Action 2: Save to Library
  const handleSaveToLibrary = async () => {
    if (!isLoggedIn) {
      navigate({
        to: "/sign-in",
        search: { redirect: `/books/${book.slug}` },
      });
      return;
    }

    setShelfError(false);
    try {
      await upsertShelfMutation.mutateAsync({
        bookId: book.id,
        shelfStatus: "want_to_read",
      });
      setShelfSaved(true);
      setTimeout(() => {
        navigate({
          to: "/app",
          search: { tab: "library" },
        });
      }, 600);
    } catch {
      setShelfError(true);
    }
  };

  // Handle Review Submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewContent.trim().length < 5) {
      setReviewError("Tulis minimal 5 karakter ulasan.");
      return;
    }
    setReviewError(null);

    try {
      await createReviewMutation.mutateAsync({
        bookId: book.id,
        rating: selectedRating,
        content: reviewContent.trim(),
        editionTierReviewed: reviewTier,
      });
      setReviewContent("");
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 5000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setReviewError(
        error?.message ||
          "Gagal mengirim ulasan. Pastikan Anda sudah masuk ke akun Anda.",
      );
    }
  };

  const isPremium = book.accessTier === "premium";

  const body = (
    <>
      {/* Top Header Bar */}
      <div
        className={`border-b border-border/70 bg-background/95 backdrop-blur-md ${
          sessionUser ? "" : "sticky top-0 z-30"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <SmartBackButton
            fallbackTo={sessionUser ? "/app" : "/"}
            label="Kembali"
            className="-ml-2"
          />

          {book.hasPhysical && (
            isLoggedIn ? (
              <ClaimCodeDialog
                slug={book.slug}
                bookTitle={book.title}
                hasClaimedDigital={book.hasClaimedDigital}
              />
            ) : (
              <Button asChild variant="outline" size="sm" className="min-h-11">
                <Link to="/sign-in" search={{ redirect: `/books/${book.slug}` }}>Klaim kode cetak</Link>
              </Button>
            )
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16 space-y-12">
        {/* 2-Column Hero: Left Book Details & TOC, Right 3D Cover & Action Buttons */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Details, Metadata, TOC, Store Map, Reviews */}
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4">
              {isPremium && (
                <span className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1 font-mono text-xs font-semibold text-foreground">
                  <Crown className="size-4" aria-hidden="true" />
                  Premium
                </span>
              )}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.2] pt-2">
                {book.title}
              </h1>

              {/* Author & Publisher Details */}
              <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-foreground/90">
                {/* Author */}
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-muted-foreground">Penulis:</span>
                  {book.authorUserId ? (
                    <Link
                      to="/u/$username"
                      params={{ username: book.authorUserId }}
                      className="flex items-center gap-2 hover:underline group cursor-pointer"
                    >
                      {book.authorAvatar ? (
                        <img
                          src={book.authorAvatar}
                          alt={book.author}
                          className="size-6 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {book.author.slice(0, 1)}
                        </div>
                      )}
                      <span className="font-semibold group-hover:text-[var(--color-accent)]">{book.author}</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      {book.authorAvatar ? (
                        <img
                          src={book.authorAvatar}
                          alt={book.author}
                          className="size-6 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {book.author.slice(0, 1)}
                        </div>
                      )}
                      <span className="font-semibold">{book.author}</span>
                    </div>
                  )}
                </div>

                {/* Publisher */}
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-muted-foreground">Penerbit:</span>
                  {book.publisherSlug || book.publisherId ? (
                    <Link
                      to="/p/$slug"
                      params={{ slug: (book.publisherSlug || book.publisherId)! }}
                      className="flex items-center gap-2 hover:underline group cursor-pointer"
                    >
                      <img
                        src={book.editorAvatar || "/icon.svg"}
                        alt={book.editor || "Anza Book"}
                        className="size-6 rounded-[5px] object-contain border border-border/40 shadow-xs"
                      />
                      <span className="font-semibold text-foreground/90 group-hover:text-[var(--color-accent)]">
                        {book.editor || "Anza Book"}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <img
                        src={book.editorAvatar || "/icon.svg"}
                        alt={book.editor || "Anza Book"}
                        className="size-6 rounded-[5px] object-contain border border-border/40 shadow-xs"
                      />
                      <span className="font-semibold text-foreground/90">
                        {book.editor || "Anza Book"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Languages & Rating */}
              <div className="flex flex-wrap items-center gap-5 text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Tersedia:</span>
                  <div className="flex items-center gap-2 text-foreground">
                    {book.availableLanguages?.includes("id") && (
                      <FlagIcon
                        lang="id"
                        size="md"
                        className="hover:scale-110 transition-transform cursor-help"
                      />
                    )}
                    {book.availableLanguages?.includes("en") && (
                      <FlagIcon
                        lang="en"
                        size="md"
                        className="hover:scale-110 transition-transform cursor-help"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span>Rating:</span>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="size-3.5 fill-amber-500" />
                    <span className="font-bold text-foreground">
                      {book.ratingAvg.toFixed(1)}/5
                    </span>
                    <span className="text-muted-foreground">
                      ({book.ratingCount || reviews.length} ulasan)
                    </span>
                  </div>
                </div>
              </div>

              {/* Synopsis */}
              <div className="mt-6 prose prose-neutral dark:prose-invert max-w-none">
                <p className="font-serif text-base leading-relaxed text-foreground/90">
                  {book.synopsis}
                </p>
              </div>

              {/* Categories Pills */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground mr-1">Kategori:</span>
                {(book.categories || book.genres).map((cat) => (
                  <span
                    key={cat}
                    className="font-mono text-xs px-2.5 py-1 bg-muted/60 border border-border/80 rounded-[4px] text-foreground/80"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              {/* Mobile Cover & Action Buttons Block */}
              <div className="block lg:hidden my-6 p-4 rounded-xl border border-border/80 bg-card/60 flex flex-col items-center">
                <BookCover book={book} className="mb-6 w-[200px] max-w-full sm:w-[240px]" />
                <B2B2CActionButtons
                  book={book}
                  isLoggedIn={isLoggedIn}
                  onStartReading={handleStartReading}
                  onReadSample={handleReadSample}
                  onSaveToLibrary={handleSaveToLibrary}
                  onPurchaseAlacarte={handlePurchaseAlacarte}
                  shelfSaved={shelfSaved}
                  shelfError={shelfError}
                  isSavingShelf={upsertShelfMutation.isPending}
                  isPurchasing={purchaseMutation.isPending}
                  purchaseError={purchaseError}
                  purchaseSuccess={purchaseSuccess}
                />
              </div>
            </div>

            {/* Interactive Table of Contents */}
            <div className="pt-6 border-t border-border space-y-4">
              <h2 className="font-serif text-xl font-bold tracking-tight text-foreground">
                Daftar Isi
              </h2>
              <div className="divide-y divide-border/60 rounded-[8px] border border-border/80 bg-background overflow-hidden">
                {book.chapters.map((chap) => (
                  <Link
                    key={chap.id}
                    to="/read/$slug"
                    params={{ slug: book.slug }}
                    search={{ chapter: chap.chapterNumber }}
                    className="flex min-h-11 items-center justify-between gap-4 p-3.5 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-muted-foreground group-hover:text-[var(--color-accent)] w-5">
                        {chap.chapterNumber}
                      </span>
                      <span className="font-serif text-sm font-medium text-foreground/90 group-hover:text-foreground">
                        {chap.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
                      <span className="text-[11px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        Baca Bab Ini
                      </span>
                      <ChevronRight className="size-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Physical Store Stock Section (Map & Table) */}
            {book.hasPhysical && (
              <div id="stok-buku" className="scroll-mt-20 space-y-6 border-t border-border pt-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="size-5 text-[var(--color-accent)]" />
                    <h2 className="font-serif text-xl font-bold tracking-tight text-foreground">
                      Titik Ketersediaan Stok Buku Fisik
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pantau sebaran eksemplar fisik di jaringan toko buku mitra Gramedia dan komunitas di berbagai kota.
                  </p>
                </div>

                {/* OpenStreetMap Interactive Map */}
                <StoreMap stocks={book.storeStocks} />

                {/* Stock Table */}
                <LiveStockTracker
                  slug={book.slug}
                  initialStocks={book.storeStocks}
                />
              </div>
            )}

            {/* Section: Verified Reader Reviews */}
            <div className="pt-6 border-t border-border space-y-6">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="size-5 text-amber-500 fill-amber-500" />
                    <h2 className="font-serif text-xl font-bold tracking-tight text-foreground">
                      Ulasan Pembaca Terverifikasi
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Catatan murni dari pembaca edisi cetak rakyat dan naskah digital dwibahasa.
                  </p>
                </div>

                <div className="text-right">
                  <div className="font-serif text-2xl font-bold text-foreground">
                    {book.ratingAvg.toFixed(1)}
                    <span className="text-sm font-sans font-normal text-muted-foreground">
                      {" "}/ 5.0
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {reviews.length} ulasan
                  </div>
                </div>
              </div>

              {/* Review Submission Form */}
              <form
                onSubmit={handleReviewSubmit}
                className="p-4 rounded-[8px] bg-muted/20 border border-border space-y-4"
              >
                <h3 className="font-serif text-sm font-bold text-foreground">
                  Tulis Evaluasi & Refleksi Bacaan
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Rating selector */}
                  <div>
                    <label
                      htmlFor="ratingSelector"
                      className="block text-xs font-mono text-muted-foreground mb-1"
                    >
                      Rating ({selectedRating} Bintang)
                    </label>
                    <div className="flex items-center gap-1.5" id="ratingSelector">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSelectedRating(star)}
                          className="p-1 text-amber-500 hover:scale-110 transition-transform focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
                          aria-label={`${star} Bintang`}
                        >
                          <Star
                            className={`size-5 ${
                              selectedRating >= star
                                ? "fill-amber-500 text-amber-500"
                                : "text-muted-foreground/40"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Edition tier reviewed */}
                  <div>
                    <label
                      htmlFor="tierReviewedSelect"
                      className="block text-xs font-mono text-muted-foreground mb-1"
                    >
                      Edisi yang Anda Baca
                    </label>
                    <select
                      id="tierReviewedSelect"
                      value={reviewTier}
                      onChange={(e) =>
                        setReviewTier(e.target.value as EditionTier | "digital")
                      }
                      className="w-full bg-background border border-border rounded-[6px] px-3 py-2 text-xs font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--color-focus)]"
                    >
                      <option value="rakyat_economy">Edisi Rakyat Newsprint 48.8 gsm</option>
                      <option value="standard_trade">Edisi Standar Bookpaper 72 gsm</option>
                      <option value="kolektor_hardcover">Edisi Kolektor Hardcover 80 gsm</option>
                      <option value="digital">Pustaka Digital Dwibahasa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reviewTextInput"
                    className="block text-xs font-mono text-muted-foreground mb-1"
                  >
                    Catatan Reflektif
                  </label>
                  <Textarea
                    id="reviewTextInput"
                    rows={3}
                    placeholder="Bagikan kesan terhadap ketajaman terjemahan, keterbacaan teks, atau relevansi gagasannya..."
                    value={reviewContent}
                    onChange={(e) => {
                      setReviewContent(e.target.value);
                      if (reviewError) setReviewError(null);
                    }}
                    className="text-xs font-sans"
                  />
                </div>

                {reviewError && (
                  <p className="text-xs text-destructive font-mono">{reviewError}</p>
                )}

                {reviewSuccess && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                    Ulasan berhasil diterbitkan ke linimasa pembaca!
                  </p>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createReviewMutation.isPending || !reviewContent.trim()}
                  >
                    {createReviewMutation.isPending ? (
                      <>
                        <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                        Mengirim Ulasan...
                      </>
                    ) : (
                      "Kirim Ulasan"
                    )}
                  </Button>
                </div>
              </form>

              {/* Reviews List */}
              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-sans">
                      Belum ada ulasan untuk buku ini. Jadilah pembaca pertama yang meninggalkan catatan!
                    </p>
                  </div>
                ) : (
                  reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-[8px] bg-background border border-border/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-serif font-bold text-xs flex items-center justify-center">
                            {rev.userName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                              <span>{rev.userName}</span>
                              <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-[3px]">
                                {rev.userRole}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {rev.editionTierReviewed === "rakyat_economy"
                                ? "Edisi Rakyat Newsprint"
                                : rev.editionTierReviewed === "standard_trade"
                                  ? "Edisi Standar"
                                  : rev.editionTierReviewed === "kolektor_hardcover"
                                    ? "Edisi Kolektor"
                                    : "Pustaka Digital"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: Math.round(rev.rating) }).map((_, i) => (
                            <Star key={i} className="size-3 fill-amber-500" />
                          ))}
                        </div>
                      </div>

                      <p className="font-sans text-xs text-foreground/90 leading-relaxed pl-9">
                        {rev.content}
                      </p>

                      <div className="pl-9 text-[10px] font-mono text-muted-foreground">
                        {new Date(rev.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: 3D Thick Book Cover & 3 Smart Action Buttons (Desktop Sticky) */}
          <div className="hidden lg:flex lg:col-span-4 sticky top-28 flex-col items-center">
            <BookCover book={book} className="mb-8 w-[240px] max-w-full sm:w-[280px]" />

            <B2B2CActionButtons
              book={book}
              isLoggedIn={isLoggedIn}
              onStartReading={handleStartReading}
              onReadSample={handleReadSample}
              onSaveToLibrary={handleSaveToLibrary}
              onPurchaseAlacarte={handlePurchaseAlacarte}
              shelfSaved={shelfSaved}
              shelfError={shelfError}
              isSavingShelf={upsertShelfMutation.isPending}
              isPurchasing={purchaseMutation.isPending}
              purchaseError={purchaseError}
              purchaseSuccess={purchaseSuccess}
            />
          </div>
        </div>

        {/* Acara & Diskusi Komunitas Membahas Buku Ini */}
        {book.upcomingEvents && book.upcomingEvents.length > 0 && (
          <div className="pt-12 border-t border-border space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-accent)] font-semibold">
                    Agenda Komunitas
                  </span>
                </div>
                <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                  Diskusi & Acara Buku Ini
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ikuti bedah buku, sesi baca bersama, atau temu penulis yang diselenggarakan komunitas.
                </p>
              </div>

              <Link
                to="/app"
                search={{ tab: "events" }}
                className="text-xs font-mono text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>Semua Agenda</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {book.upcomingEvents.map((ev) => (
                <Link
                  key={ev.id}
                  to="/events/$slug"
                  params={{ slug: ev.slug }}
                  className="group block p-4 rounded-[10px] bg-background border border-border/80 hover:border-foreground/30 transition-all shadow-sm"
                >
                  <div className="flex gap-3">
                    {ev.coverUrl ? (
                      <img
                        src={ev.coverUrl}
                        alt={ev.title}
                        className="size-16 rounded-[8px] object-cover shrink-0 border border-border/50"
                      />
                    ) : (
                      <div className="size-16 rounded-[8px] bg-muted/60 flex items-center justify-center shrink-0 border border-border/50">
                        <Calendar className="size-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-[11px] font-mono text-[var(--color-accent)] font-medium">
                        {new Date(ev.startsAt).toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })} · {new Date(ev.startsAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <h3 className="font-serif text-sm font-semibold text-foreground truncate group-hover:text-[var(--color-accent)] transition-colors">
                        {ev.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Oleh {ev.calendarName}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">
                          {ev.format === "online"
                            ? "Daring (Virtual)"
                            : ev.venueName || `${ev.district || ""}, ${ev.city || ""}`.trim() || "Lokasi Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Carousel / List: Buku di Kategori yang Sama */}
        {relatedBooks.length > 0 && (
          <div className="pt-12 border-t border-border space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                  Buku di Kategori yang Sama
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Rekomendasi bacaan seputar topik {primaryCategory}.
                </p>
              </div>

              <Link
                to="/"
                className="text-xs font-mono text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedBooks.slice(0, 4).map((relBook: BookSummaryDto) => (
                <BookCatalogCard key={relBook.id} book={relBook} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (sessionUser) {
    return (
      <AppShell user={sessionUser} activeTab="explore" title="Detail Buku" wide>
        <div className="-mx-4 sm:-mx-8 -mt-6">{body}</div>
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <main id="main-content">{body}</main>
      <SiteFooter />
    </div>
  );
}
