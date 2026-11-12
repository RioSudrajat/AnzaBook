import { useState, useTransition } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  BookOpen,
  Building2,
  CheckCircle,
  Clock,
  Feather,
  Heart,
  MapPin,
  MessageSquare,
  Quote,
  Search,
  Share2,
  Star,
  Users,
  X,
} from "lucide-react";
import type { ListBooksInput } from "@starter/shared/validators/books";
import type {
  ExplorePostItemDto,
  ExploreUserItemDto,
  ManagedCommunitySummaryDto,
  ManagedPublisherSummaryDto,
} from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookCatalogCard } from "@/features/books/components/book-catalog-card";
import { BookCover } from "@/features/books/components/book-cover";
import { useCatalogBooks, useCategories } from "@/features/books/hooks";
import {
  useFollowUser,
  useUnfollowUser,
  useUnifiedExplore,
  useVerifiedPublishers,
} from "@/features/social/hooks";
import {
  useCalendars,
  useToggleFollowCalendar,
} from "@/features/events/hooks";

type ExploreFilters = Pick<ListBooksInput, "category" | "collection">;
type UnifiedSubTab =
  | "teratas"
  | "terbaru"
  | "postingan"
  | "buku"
  | "orang"
  | "komunitas";

const pageSize = 12;
const selectClassName =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-2 focus-visible:outline-ring";

export function DashboardExplore({ category, collection }: ExploreFilters) {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();

  // Search Engine input state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<UnifiedSubTab>("teratas");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    category,
  );

  // Books tab specific filters
  const [language, setLanguage] = useState("");
  const [accessTier, setAccessTier] =
    useState<ListBooksInput["accessTier"]>("all");
  const [digitalPolicy, setDigitalPolicy] =
    useState<ListBooksInput["digitalPolicy"]>("all");
  const [selectedPublisher, setSelectedPublisher] = useState("");
  const [bookPageOffset, setBookPageOffset] = useState(0);

  const categories = useCategories();
  const publishers = useVerifiedPublishers();

  // Unified Explore Hook
  const exploreQuery = useUnifiedExplore({
    q: debouncedQuery.trim() || undefined,
    category: selectedCategory,
    sort: activeTab === "terbaru" ? "latest" : "top",
  });

  // Dedicated catalog query for full catalog browsing under "buku" tab
  const catalog = useCatalogBooks({
    category: selectedCategory,
    collection,
    search: debouncedQuery.trim() || undefined,
    language: language || undefined,
    accessTier,
    digitalPolicy: digitalPolicy === "all" ? undefined : digitalPolicy,
    publisher: selectedPublisher || undefined,
    limit: pageSize,
    offset: bookPageOffset,
  });

  // Mutations
  const followUserMutation = useFollowUser();
  const unfollowUserMutation = useUnfollowUser();

  function handleSearchChange(value: string) {
    setSearchInput(value);
    startTransition(() => {
      setDebouncedQuery(value);
      setBookPageOffset(0);
    });
  }

  function handleClearSearch() {
    setSearchInput("");
    setDebouncedQuery("");
    setBookPageOffset(0);
  }

  function handleCategorySelect(catName?: string) {
    const next = catName === selectedCategory ? undefined : catName;
    setSelectedCategory(next);
    setBookPageOffset(0);
    void navigate({
      to: "/app",
      search: { tab: "explore", category: next, collection },
    });
  }

  function handleFollowToggle(user: ExploreUserItemDto) {
    if (user.isFollowing) {
      unfollowUserMutation.mutate(user.id);
    } else {
      followUserMutation.mutate({ targetUserId: user.id });
    }
  }

  const result = exploreQuery.data;
  const isSearching = debouncedQuery.trim().length > 0;

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* 1. Global Search Engine Input Bar (Substack / Instagram Search style) */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 size-5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari buku, penulis, @username, kutipan, penerbit..."
            className="w-full h-12 pl-12 pr-11 rounded-full bg-muted/50 border border-border/80 text-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all shadow-xs"
            aria-label="Cari di AnzaBook"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3.5 size-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Bersihkan pencarian"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Sub-tab Navigation (Teratas, Terbaru, Postingan, Buku, Orang, Komunitas & Penerbit) */}
      <nav
        aria-label="Filter Hasil Pencarian"
        className="flex items-center gap-1 border-b border-border/80 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth"
      >
        <button
          type="button"
          onClick={() => setActiveTab("teratas")}
          className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === "teratas"
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Teratas
          {activeTab === "teratas" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("terbaru")}
          className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === "terbaru"
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Terbaru
          {activeTab === "terbaru" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("postingan")}
          className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === "postingan"
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Kutipan & Ulasan
          {activeTab === "postingan" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("buku")}
          className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === "buku"
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Buku
          {activeTab === "buku" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("orang")}
          className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === "orang"
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Orang
          {activeTab === "orang" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("komunitas")}
          className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === "komunitas"
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Komunitas & Penerbit
          {activeTab === "komunitas" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500 rounded-full" />
          )}
        </button>
      </nav>

      {/* 3. Category Topic Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1">
        <button
          type="button"
          onClick={() => handleCategorySelect(undefined)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
            !selectedCategory
              ? "bg-foreground text-background font-semibold"
              : "bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          Semua Topik
        </button>
        {categories.data?.map((cat) => (
          <button
            key={cat.name}
            type="button"
            onClick={() => handleCategorySelect(cat.name)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
              selectedCategory === cat.name
                ? "bg-foreground text-background font-semibold"
                : "bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 4. Tab Content Rendering */}
      {exploreQuery.isPending && !result ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Mencari di seluruh ekosistem AnzaBook…
        </div>
      ) : exploreQuery.isError ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Gagal memuat hasil pencarian.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exploreQuery.refetch()}
          >
            Coba lagi
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* TAB: TERATAS (TOP RESULTS) */}
          {activeTab === "teratas" && (
            <div className="space-y-8">
              {/* Account matches preview (if any) */}
              {result && result.users.length > 0 && (
                <section aria-label="Akun Terkait" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                      Orang & Penulis
                    </h2>
                    {result.users.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("orang")}
                        className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium"
                      >
                        Lihat semua ({result.users.length})
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs overflow-hidden">
                    {result.users.slice(0, 3).map((user) => (
                      <UserSearchRow
                        key={user.id}
                        user={user}
                        onFollowToggle={() => handleFollowToggle(user)}
                        isMutationPending={
                          followUserMutation.isPending ||
                          unfollowUserMutation.isPending
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Books preview */}
              {result && result.books.length > 0 && (
                <section aria-label="Buku Terkait" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                      Buku & Naskah
                    </h2>
                    {result.books.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("buku")}
                        className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium"
                      >
                        Lihat semua ({result.books.length})
                      </button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {result.books.slice(0, 4).map((book) => (
                      <BookCatalogCard key={book.id} book={book} />
                    ))}
                  </div>
                </section>
              )}

              {/* Quotes & Reviews Posts */}
              {result && result.posts.length > 0 && (
                <section aria-label="Kutipan & Ulasan" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                      Kutipan & Ulasan Literasi
                    </h2>
                    {result.posts.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("postingan")}
                        className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium"
                      >
                        Lihat semua ({result.posts.length})
                      </button>
                    )}
                  </div>
                  <div className="space-y-4 max-w-2xl">
                    {result.posts.slice(0, 5).map((post) => (
                      <PostFeedItem key={post.id} post={post} />
                    ))}
                  </div>
                </section>
              )}

              {/* Communities & Publishers Preview */}
              {result &&
                (result.communities.length > 0 ||
                  result.publishers.length > 0) && (
                  <section aria-label="Lingkaran Komunitas & Penerbit" className="space-y-3">
                    <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                      Komunitas & Penerbit
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {result.communities.slice(0, 2).map((c) => (
                        <CommunityCard key={c.id} community={c} />
                      ))}
                      {result.publishers.slice(0, 2).map((p) => (
                        <PublisherCard key={p.id} publisher={p} />
                      ))}
                    </div>
                  </section>
                )}

              {/* Empty state for search */}
              {isSearching &&
                result &&
                result.users.length === 0 &&
                result.books.length === 0 &&
                result.posts.length === 0 &&
                result.communities.length === 0 &&
                result.publishers.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3">
                    <p className="font-serif text-base font-medium">
                      Tidak ditemukan hasil untuk &ldquo;{debouncedQuery}&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Coba cari dengan nama penulis, judul buku lain, atau pilih
                      salah satu kategori topik di atas.
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* TAB: TERBARU (LATEST STREAM) */}
          {activeTab === "terbaru" && (
            <div className="space-y-6 max-w-2xl">
              {result?.posts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Belum ada kutipan atau ulasan terbaru saat ini.
                </div>
              ) : (
                <div className="space-y-4">
                  {result?.posts.map((post) => (
                    <PostFeedItem key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: POSTINGAN (KUTIPAN & ULASAN) */}
          {activeTab === "postingan" && (
            <div className="space-y-6 max-w-2xl">
              {result?.posts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Tidak ada kutipan atau ulasan yang sesuai dengan pencarian.
                </div>
              ) : (
                <div className="space-y-4">
                  {result?.posts.map((post) => (
                    <PostFeedItem key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: BUKU (CATALOG + FULL FILTERS) */}
          {activeTab === "buku" && (
            <div className="space-y-6">
              {/* Filter Toolbar */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-xs font-mono text-muted-foreground">
                  <span className="text-foreground font-semibold">Bahasa</span>
                  <select
                    className={selectClassName}
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setBookPageOffset(0);
                    }}
                  >
                    <option value="">Semua bahasa</option>
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">Bahasa Inggris</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs font-mono text-muted-foreground">
                  <span className="text-foreground font-semibold">Tingkat Akses</span>
                  <select
                    className={selectClassName}
                    value={accessTier}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAccessTier(
                        val === "free" || val === "premium" ? val : "all",
                      );
                      setBookPageOffset(0);
                    }}
                  >
                    <option value="all">Semua jenis akses</option>
                    <option value="free">Gratis Terbuka</option>
                    <option value="premium">Nakama Premium</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs font-mono text-muted-foreground">
                  <span className="text-foreground font-semibold">Skema Distribusi</span>
                  <select
                    className={selectClassName}
                    value={digitalPolicy}
                    onChange={(e) => {
                      setDigitalPolicy(
                        e.target.value as ListBooksInput["digitalPolicy"],
                      );
                      setBookPageOffset(0);
                    }}
                  >
                    <option value="all">Semua Skema</option>
                    <option value="print_claim_only">
                      Phygital Cetak (Klaim Kode)
                    </option>
                    <option value="sample_only">Nakama Pool Reader</option>
                    <option value="alacarte_only">Ala Carte Digital</option>
                    <option value="free_open">Pustaka Terbuka Gratis</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs font-mono text-muted-foreground">
                  <span className="text-foreground font-semibold">Mitra Penerbit</span>
                  <select
                    className={selectClassName}
                    value={selectedPublisher}
                    onChange={(e) => {
                      setSelectedPublisher(e.target.value);
                      setBookPageOffset(0);
                    }}
                  >
                    <option value="">Semua Penerbit</option>
                    {publishers.data?.map((pub) => (
                      <option key={pub.id} value={pub.id}>
                        {pub.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Books Grid */}
              {catalog.isPending ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Memuat katalog buku…
                </p>
              ) : catalog.isError ? (
                <div className="space-y-2 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Katalog gagal dimuat.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => void catalog.refetch()}
                  >
                    Coba lagi
                  </Button>
                </div>
              ) : catalog.data.data.length === 0 ? (
                <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Belum ada buku yang cocok dengan filter ini.
                </p>
              ) : (
                <>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {catalog.data.data.map((book) => (
                      <li key={book.id}>
                        <BookCatalogCard book={book} />
                      </li>
                    ))}
                  </ul>

                  {(bookPageOffset > 0 || catalog.data.meta.hasMore) && (
                    <div className="flex flex-wrap gap-2 pt-4">
                      <Button
                        className="min-h-11"
                        variant="outline"
                        disabled={bookPageOffset === 0}
                        onClick={() =>
                          setBookPageOffset(Math.max(0, bookPageOffset - pageSize))
                        }
                      >
                        Halaman sebelumnya
                      </Button>
                      <Button
                        className="min-h-11"
                        variant="outline"
                        disabled={!catalog.data.meta.hasMore}
                        onClick={() =>
                          setBookPageOffset(bookPageOffset + pageSize)
                        }
                      >
                        Halaman berikutnya
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB: ORANG (USERS & AUTHORS) */}
          {activeTab === "orang" && (
            <div className="space-y-4 max-w-3xl">
              {result?.users.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Tidak ada akun pembaca atau penulis yang cocok.
                </div>
              ) : (
                <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card overflow-hidden">
                  {result?.users.map((user) => (
                    <UserSearchRow
                      key={user.id}
                      user={user}
                      onFollowToggle={() => handleFollowToggle(user)}
                      isMutationPending={
                        followUserMutation.isPending ||
                        unfollowUserMutation.isPending
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: KOMUNITAS & PENERBIT */}
          {activeTab === "komunitas" && (
            <div className="space-y-8">
              {/* Communities */}
              <div className="space-y-3">
                <h2 className="font-serif text-lg font-bold">
                  Komunitas Pembaca Terverifikasi
                </h2>
                {result?.communities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Belum ada komunitas terdaftar.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {result?.communities.map((c) => (
                      <CommunityCard key={c.id} community={c} />
                    ))}
                  </div>
                )}
              </div>

              {/* Publishers */}
              <div className="space-y-3 pt-6 border-t border-border/80">
                <h2 className="font-serif text-lg font-bold">
                  Mitra Penerbit Berlisensi
                </h2>
                {result?.publishers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Belum ada penerbit terdaftar.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {result?.publishers.map((p) => (
                      <PublisherCard key={p.id} publisher={p} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Sub-component: UserSearchRow (Instagram-style user item with orange button)
function UserSearchRow({
  user,
  onFollowToggle,
  isMutationPending,
}: {
  user: ExploreUserItemDto;
  onFollowToggle: () => void;
  isMutationPending: boolean;
}) {
  const profileLink = `/u/${encodeURIComponent(user.username || user.id)}`;
  const isAuthor = user.authorStatus === "verified";

  return (
    <div className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40 transition-colors">
      <Link to={profileLink} className="flex items-center gap-3.5 min-w-0 flex-1 group">
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="size-12 rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <div className="size-12 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-base flex items-center justify-center shrink-0 border border-orange-500/20">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
              {user.name}
            </span>
            {isAuthor && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0"
                title="Penulis Resmi AnzaBook"
              >
                <CheckCircle className="size-3 text-emerald-600 shrink-0" />
                Penulis
              </span>
            )}
          </div>

          <p className="text-xs font-mono text-muted-foreground truncate">
            @{user.username || "reader"}
            {user.locationCity && ` · ${user.locationCity}`}
          </p>

          {user.bio && (
            <p className="text-xs text-muted-foreground/80 line-clamp-1 mt-0.5">
              {user.bio}
            </p>
          )}

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70 mt-1">
            <span>{user.followerCount ?? 0} pengikut</span>
            {(user.booksReadCount ?? 0) > 0 && (
              <span>· {user.booksReadCount} tamat</span>
            )}
            {(user.bookCount ?? 0) > 0 && (
              <span>· {user.bookCount} buku terbit</span>
            )}
          </div>
        </div>
      </Link>

      <div className="shrink-0">
        <button
          type="button"
          onClick={onFollowToggle}
          disabled={isMutationPending}
          className={`px-5 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs disabled:opacity-50 ${
            user.isFollowing
              ? "border border-border text-foreground hover:bg-muted font-normal"
              : "bg-orange-600 hover:bg-orange-700 text-white font-medium"
          }`}
        >
          {user.isFollowing ? "Mengikuti" : "Ikuti"}
        </button>
      </div>
    </div>
  );
}

// Sub-component: PostFeedItem (Quote Card or Review Card matching screenshot)
function PostFeedItem({ post }: { post: ExplorePostItemDto }) {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const formattedDate = new Date(post.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });

  return (
    <article className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs hover:border-foreground/30 transition-colors">
      {/* Header: User Info */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/u/$username"
          params={{ username: post.author.username || post.author.id }}
          className="flex items-center gap-2.5 min-w-0 group"
        >
          {post.author.image ? (
            <img
              src={post.author.image}
              alt={post.author.name}
              className="size-8 rounded-full object-cover border border-border shrink-0"
            />
          ) : (
            <div className="size-8 rounded-full bg-muted text-muted-foreground font-bold text-xs flex items-center justify-center shrink-0">
              {post.author.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <span className="text-xs font-semibold text-foreground group-hover:underline truncate block">
              {post.author.name}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              @{post.author.username || "reader"} · {formattedDate}
            </span>
          </div>
        </Link>

        {post.type === "review" && post.rating && (
          <div className="flex items-center gap-0.5 text-amber-500 text-xs">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-3.5 ${
                  i < (post.rating ?? 0)
                    ? "fill-amber-500 text-amber-500"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content: Quote Card (green/sage card) OR Reading Session OR Review Paragraph */}
      {post.type === "quote" ? (
        <div className="rounded-xl bg-[#283618] text-[#fefae0] dark:bg-[#1f2b13] dark:text-[#f3ecc8] p-5 space-y-3 relative overflow-hidden shadow-xs border border-[#3a4d23]">
          <Quote className="size-7 text-[#dda15e] opacity-80" />
          <p className="font-serif text-sm sm:text-base leading-relaxed tracking-wide">
            &ldquo;{post.content}&rdquo;
          </p>

          {post.note && (
            <p className="text-xs text-[#fefae0]/80 italic border-t border-[#fefae0]/15 pt-2">
              Catatan: {post.note}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 text-xs text-[#dda15e] font-medium">
            <Link
              to="/books/$slug"
              params={{ slug: post.book.slug }}
              className="hover:underline flex items-center gap-1.5 truncate"
            >
              <BookOpen className="size-3.5 shrink-0" />
              <span>{post.book.title} — {post.book.author}</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsBookmarked(!isBookmarked)}
              className="text-[#fefae0] hover:text-[#dda15e] transition-colors p-1"
              aria-label="Simpan kutipan"
            >
              <Bookmark className={`size-4 ${isBookmarked ? "fill-current" : ""}`} />
            </button>
          </div>
        </div>
      ) : post.type === "session" ? (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-border/80 bg-muted/40 space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground">
              <Clock className="size-4 text-orange-600" />
              <span>
                {Math.round((post.durationSeconds || 0) / 60)} menit baca • {post.pagesRead || 0} halaman
              </span>
            </div>
            {post.note && (
              <p className="font-serif text-sm leading-relaxed text-foreground/90 italic">
                &ldquo;{post.note}&rdquo;
              </p>
            )}
          </div>

          <Link
            to="/books/$slug"
            params={{ slug: post.book.slug }}
            className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/50 hover:bg-muted border border-border/60 transition-colors w-fit max-w-full"
          >
            <BookOpen className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">
              {post.book.title}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              oleh {post.book.author}
            </span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {post.content}
          </p>

          {/* Book reference tag */}
          <Link
            to="/books/$slug"
            params={{ slug: post.book.slug }}
            className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/50 hover:bg-muted border border-border/60 transition-colors w-fit max-w-full"
          >
            <BookOpen className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">
              {post.book.title}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              oleh {post.book.author}
            </span>
          </Link>
        </div>
      )}

      {/* Social interaction footer */}
      <div className="flex items-center gap-6 pt-1 text-muted-foreground text-xs">
        <button
          type="button"
          onClick={() => setIsLiked(!isLiked)}
          className={`flex items-center gap-1.5 hover:text-red-500 transition-colors ${
            isLiked ? "text-red-500 font-semibold" : ""
          }`}
        >
          <Heart className={`size-4 ${isLiked ? "fill-current" : ""}`} />
          <span>{isLiked ? 1 : 0}</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <MessageSquare className="size-4" />
          <span>Balas</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (navigator.clipboard) {
              void navigator.clipboard.writeText(
                `${post.content} — ${post.book.title} di AnzaBook`,
              );
            }
          }}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
          aria-label="Bagikan kutipan"
        >
          <Share2 className="size-4" />
        </button>
      </div>
    </article>
  );
}

// Sub-component: CommunityCard linking to /c/$slug
function CommunityCard({ community }: { community: ManagedCommunitySummaryDto }) {
  return (
    <article className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 space-y-3 hover:border-foreground/30 transition-colors shadow-xs">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-base border border-amber-500/30 shrink-0">
          {community.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="font-serif font-bold text-sm truncate">
              {community.name}
            </h3>
            {community.verificationStatus === "verified" && (
              <CheckCircle className="size-3.5 text-amber-500 shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{community.city || "Indonesia"}</span>
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-muted-foreground">
          Klub Komunitas
        </span>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link to="/c/$slug" params={{ slug: community.slug }}>
            Lihat Komunitas
          </Link>
        </Button>
      </div>
    </article>
  );
}

// Sub-component: PublisherCard linking to /p/$slug
function PublisherCard({ publisher }: { publisher: ManagedPublisherSummaryDto }) {
  return (
    <article className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 space-y-3 hover:border-foreground/30 transition-colors shadow-xs">
      <div className="flex items-center gap-3">
        {publisher.logoUrl ? (
          <img
            src={publisher.logoUrl}
            alt={publisher.name}
            className="size-11 rounded-xl object-cover border border-border shrink-0"
          />
        ) : (
          <div className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-base border border-orange-500/20 shrink-0">
            {publisher.name[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="font-serif font-bold text-sm truncate">
              {publisher.name}
            </h3>
            <CheckCircle className="size-3.5 text-emerald-600 shrink-0" />
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="size-3 shrink-0" />
            <span className="truncate">{publisher.city || "Mitra IKAPI"}</span>
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
          Penerbit Resmi
        </span>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link to="/p/$slug" params={{ slug: publisher.slug }}>
            Katalog Penerbit
          </Link>
        </Button>
      </div>
    </article>
  );
}
