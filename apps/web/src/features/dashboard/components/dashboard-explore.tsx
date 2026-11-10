import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Building2,
  CheckCircle,
  Feather,
  Flame,
  MapPin,
  Search,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { ListBooksInput } from "@starter/shared/validators/books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookCatalogCard } from "@/features/books/components/book-catalog-card";
import { useCatalogBooks, useCategories } from "@/features/books/hooks";
import {
  useExploreAuthors,
  useExploreReaders,
  useFollowUser,
  useUnfollowUser,
  useVerifiedPublishers,
} from "@/features/social/hooks";
import {
  useCalendars,
  useToggleFollowCalendar,
} from "@/features/events/hooks";

type ExploreFilters = Pick<ListBooksInput, "category" | "collection">;
type ExploreTab = "buku" | "penulis" | "komunitas" | "pembaca";

const pageSize = 12;
const selectClassName =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring";

export function DashboardExplore({ category, collection }: ExploreFilters) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ExploreTab>("buku");

  // Sub-tab Buku states & hooks
  const categories = useCategories();
  const publishers = useVerifiedPublishers();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [accessTier, setAccessTier] =
    useState<ListBooksInput["accessTier"]>("all");
  const [digitalPolicy, setDigitalPolicy] =
    useState<ListBooksInput["digitalPolicy"]>("all");
  const [selectedPublisher, setSelectedPublisher] = useState("");

  const [page, setPage] = useState({ category, collection, offset: 0 });
  const offset =
    page.category === category && page.collection === collection
      ? page.offset
      : 0;

  const catalog = useCatalogBooks({
    category,
    collection,
    search: search || undefined,
    language: language || undefined,
    accessTier,
    digitalPolicy: digitalPolicy === "all" ? undefined : digitalPolicy,
    publisher: selectedPublisher || undefined,
    limit: pageSize,
    offset,
  });

  // Sub-tab Penulis states & hooks
  const [authorSearchDraft, setAuthorSearchDraft] = useState("");
  const [authorSearch, setAuthorSearch] = useState("");
  const authorsQuery = useExploreAuthors(authorSearch || undefined);

  // Sub-tab Komunitas states & hooks
  const [communityCityFilter, setCommunityCityFilter] = useState("");
  const calendarsQuery = useCalendars();

  // Sub-tab Pembaca states & hooks
  const [readerSearchDraft, setReaderSearchDraft] = useState("");
  const [readerSearch, setReaderSearch] = useState("");
  const readersQuery = useExploreReaders(readerSearch || undefined);

  // Follow/Unfollow mutations
  const followUserMutation = useFollowUser();
  const unfollowUserMutation = useUnfollowUser();

  function goToPage(nextOffset: number) {
    setPage({ category, collection, offset: nextOffset });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    goToPage(0);
  }

  function submitAuthorSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthorSearch(authorSearchDraft.trim());
  }

  function submitReaderSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReaderSearch(readerSearchDraft.trim());
  }

  function selectCategory(value?: string) {
    goToPage(0);
    void navigate({
      to: "/app",
      search: { tab: "explore", category: value, collection },
    });
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 4 Dimension Dimension Switcher */}
      <nav
        aria-label="Dimensi Eksplorasi"
        className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-4"
      >
        <button
          type="button"
          onClick={() => setActiveTab("buku")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "buku"
              ? "bg-foreground text-background font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <BookOpen className="size-4" />
          <span>Katalog Buku</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("penulis")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "penulis"
              ? "bg-foreground text-background font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Feather className="size-4" />
          <span>Direktori Penulis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("komunitas")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "komunitas"
              ? "bg-foreground text-background font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Building2 className="size-4" />
          <span>Komunitas Pembaca</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pembaca")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "pembaca"
              ? "bg-foreground text-background font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Users className="size-4" />
          <span>Rekan Pembaca</span>
        </button>
      </nav>

      {/* DIMENSI 1: BUKU */}
      {activeTab === "buku" && (
        <div className="space-y-8">
          <section
            aria-labelledby="explore-categories-heading"
            className="space-y-3"
          >
            <h2
              id="explore-categories-heading"
              className="font-serif text-xl font-bold"
            >
              Jelajahi Berdasarkan Kategori
            </h2>
            {categories.isPending ? (
              <p role="status" className="text-sm text-muted-foreground">
                Memuat kategori…
              </p>
            ) : categories.isError ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void categories.refetch()}
              >
                Muat ulang kategori
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={category ? "outline" : "default"}
                  aria-pressed={!category}
                  className="min-h-11"
                  onClick={() => selectCategory()}
                >
                  Semua kategori
                </Button>
                {categories.data.map((item) => (
                  <Button
                    key={item.name}
                    type="button"
                    variant={category === item.name ? "default" : "outline"}
                    aria-pressed={category === item.name}
                    className="min-h-11"
                    onClick={() => selectCategory(item.name)}
                  >
                    {item.name}
                  </Button>
                ))}
              </div>
            )}
          </section>

          <section
            aria-labelledby="explore-results-heading"
            className="space-y-4 border-t pt-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2
                id="explore-results-heading"
                className="font-serif text-xl font-bold"
              >
                Katalog Naskah & Edisi Cetak
              </h2>
              {collection && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    Koleksi: {collection}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      goToPage(0);
                      void navigate({
                        to: "/app",
                        search: { tab: "explore", category },
                      });
                    }}
                  >
                    Hapus filter
                  </Button>
                </div>
              )}
            </div>

            {/* Filter Toolbar: Bahasa, Akses, Skema B2B2C, Penerbit, Search */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-xs font-mono text-muted-foreground">
                <span className="text-foreground font-semibold">Bahasa</span>
                <select
                  className={selectClassName}
                  value={language}
                  onChange={(event) => {
                    setLanguage(event.target.value);
                    goToPage(0);
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
                  onChange={(event) => {
                    const value = event.target.value;
                    setAccessTier(
                      value === "free" || value === "premium" ? value : "all",
                    );
                    goToPage(0);
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
                  onChange={(event) => {
                    setDigitalPolicy(
                      event.target.value as ListBooksInput["digitalPolicy"],
                    );
                    goToPage(0);
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
                  onChange={(event) => {
                    setSelectedPublisher(event.target.value);
                    goToPage(0);
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

            {/* Search Input Form */}
            <form onSubmit={submitSearch} className="space-y-1">
              <label htmlFor="explore-search" className="text-xs font-mono text-muted-foreground">
                Cari judul buku atau nama penulis
              </label>
              <div className="flex gap-2">
                <Input
                  id="explore-search"
                  type="search"
                  placeholder="Ketik judul naskah, novel, atau esai..."
                  className="min-h-11 min-w-0"
                  value={searchDraft}
                  maxLength={100}
                  onChange={(event) => setSearchDraft(event.target.value)}
                />
                <Button className="min-h-11 shrink-0" variant="outline" type="submit">
                  <Search className="size-4 mr-1.5" aria-hidden="true" /> Cari
                </Button>
              </div>
            </form>

            {catalog.isPending ? (
              <p role="status" className="text-sm text-muted-foreground py-8 text-center">
                Memuat katalog naskah…
              </p>
            ) : catalog.isError ? (
              <div className="space-y-2 py-6 text-center">
                <p role="alert" className="text-sm text-muted-foreground">
                  Katalog gagal dimuat.
                </p>
                <Button variant="outline" onClick={() => void catalog.refetch()}>
                  Coba lagi
                </Button>
              </div>
            ) : (
              <>
                {catalog.data.data.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Belum ada buku yang cocok dengan kombinasi filter ini.
                  </p>
                ) : (
                  <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {catalog.data.data.map((book) => (
                      <li key={book.id}>
                        <BookCatalogCard book={book} />
                      </li>
                    ))}
                  </ul>
                )}
                {(offset > 0 || catalog.data.meta.hasMore) && (
                  <div className="flex flex-wrap gap-2 pt-4">
                    <Button
                      className="min-h-11"
                      variant="outline"
                      disabled={offset === 0}
                      onClick={() => goToPage(offset - pageSize)}
                    >
                      Halaman sebelumnya
                    </Button>
                    <Button
                      className="min-h-11"
                      variant="outline"
                      disabled={!catalog.data.meta.hasMore}
                      onClick={() => goToPage(offset + pageSize)}
                    >
                      Halaman berikutnya
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {/* DIMENSI 2: PENULIS */}
      {activeTab === "penulis" && (
        <section aria-labelledby="explore-authors-heading" className="space-y-6">
          <div className="space-y-1">
            <h2 id="explore-authors-heading" className="font-serif text-xl font-bold">
              Direktori Penulis Resmi AnzaBook
            </h2>
            <p className="text-xs text-muted-foreground">
              Kenali para penulis terverifikasi yang menerbitkan karya orisinal dan naskah berlisensi di AnzaBook.
            </p>
          </div>

          <form onSubmit={submitAuthorSearch} className="flex gap-2 max-w-md">
            <Input
              type="search"
              placeholder="Cari nama penulis atau nama pena..."
              className="min-h-11"
              value={authorSearchDraft}
              onChange={(e) => setAuthorSearchDraft(e.target.value)}
            />
            <Button variant="outline" type="submit" className="min-h-11 shrink-0">
              <Search className="size-4 mr-1.5" /> Cari
            </Button>
          </form>

          {authorsQuery.isPending ? (
            <p role="status" className="text-sm text-muted-foreground py-8 text-center">
              Memuat direktori penulis…
            </p>
          ) : authorsQuery.isError ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                Gagal memuat direktori penulis.
              </p>
              <Button variant="outline" onClick={() => void authorsQuery.refetch()}>
                Coba lagi
              </Button>
            </div>
          ) : authorsQuery.data?.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Tidak ada penulis yang sesuai dengan kata kunci pencarian.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {authorsQuery.data?.map((author) => {
                const isFollowing = author.isFollowing;
                return (
                  <article
                    key={author.id}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 space-y-4 hover:border-foreground/30 transition-colors shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {author.image ? (
                          <img
                            src={author.image}
                            alt={author.name}
                            className="size-12 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="size-12 rounded-full bg-muted flex items-center justify-center font-bold text-base text-muted-foreground">
                            {author.name.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-serif font-bold text-sm truncate">
                              {author.penName || author.name}
                            </h3>
                            {author.authorStatus === "verified" && (
                              <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          {author.penName && (
                            <p className="text-[11px] font-mono text-muted-foreground truncate">
                              {author.name}
                            </p>
                          )}
                          {author.locationCity && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="size-3 shrink-0" />
                              <span className="truncate">{author.locationCity}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {author.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {author.bio}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <div className="text-[11px] font-mono text-muted-foreground space-y-0.5">
                        <div>{author.bookCount} Buku Terbit</div>
                        <div>{author.followerCount} Pengikut</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                          <Link to="/u/$username" params={{ username: author.username || author.id }}>
                            Profil
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant={isFollowing ? "outline" : "default"}
                          disabled={
                            followUserMutation.isPending ||
                            unfollowUserMutation.isPending
                          }
                          onClick={() => {
                            if (isFollowing) {
                              unfollowUserMutation.mutate(author.id);
                            } else {
                              followUserMutation.mutate({ targetUserId: author.id });
                            }
                          }}
                          className="h-9 text-xs gap-1"
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck className="size-3.5" />
                              Mengikuti
                            </>
                          ) : (
                            <>
                              <UserPlus className="size-3.5" />
                              Ikuti
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* DIMENSI 3: KOMUNITAS */}
      {activeTab === "komunitas" && (
        <section aria-labelledby="explore-communities-heading" className="space-y-6">
          <div className="space-y-1">
            <h2 id="explore-communities-heading" className="font-serif text-xl font-bold">
              Direktori Komunitas Terverifikasi
            </h2>
            <p className="text-xs text-muted-foreground">
              Bergabunglah dengan klub buku, sanggar sastra, dan lingkaran baca lokal di kota Anda.
            </p>
          </div>

          <div className="max-w-xs">
            <Input
              type="search"
              placeholder="Filter berdasarkan kota..."
              className="min-h-11"
              value={communityCityFilter}
              onChange={(e) => setCommunityCityFilter(e.target.value)}
            />
          </div>

          {calendarsQuery.isPending ? (
            <p role="status" className="text-sm text-muted-foreground py-8 text-center">
              Memuat direktori komunitas…
            </p>
          ) : calendarsQuery.isError ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                Gagal memuat kalender komunitas.
              </p>
              <Button variant="outline" onClick={() => void calendarsQuery.refetch()}>
                Coba lagi
              </Button>
            </div>
          ) : calendarsQuery.data?.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Belum ada komunitas terdaftar.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {calendarsQuery.data
                ?.filter((cal) =>
                  communityCityFilter
                    ? (cal.city || "")
                        .toLowerCase()
                        .includes(communityCityFilter.toLowerCase().trim())
                    : true,
                )
                .map((cal) => (
                  <CommunityItemCard key={cal.id} calendar={cal} />
                ))}
            </div>
          )}
        </section>
      )}

      {/* DIMENSI 4: PEMBACA */}
      {activeTab === "pembaca" && (
        <section aria-labelledby="explore-readers-heading" className="space-y-6">
          <div className="space-y-1">
            <h2 id="explore-readers-heading" className="font-serif text-xl font-bold">
              Direktori Rekan Pembaca
            </h2>
            <p className="text-xs text-muted-foreground">
              Temukan rekan satu frekuensi, pantau konsistensi membaca, dan perluas lingkaran literasi Anda.
            </p>
          </div>

          <form onSubmit={submitReaderSearch} className="flex gap-2 max-w-md">
            <Input
              type="search"
              placeholder="Cari nama atau username pembaca..."
              className="min-h-11"
              value={readerSearchDraft}
              onChange={(e) => setReaderSearchDraft(e.target.value)}
            />
            <Button variant="outline" type="submit" className="min-h-11 shrink-0">
              <Search className="size-4 mr-1.5" /> Cari
            </Button>
          </form>

          {readersQuery.isPending ? (
            <p role="status" className="text-sm text-muted-foreground py-8 text-center">
              Memuat direktori pembaca…
            </p>
          ) : readersQuery.isError ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                Gagal memuat direktori pembaca.
              </p>
              <Button variant="outline" onClick={() => void readersQuery.refetch()}>
                Coba lagi
              </Button>
            </div>
          ) : readersQuery.data?.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Tidak ada pembaca yang sesuai dengan kriteria pencarian.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {readersQuery.data?.map((reader) => {
                const isFollowing = reader.isFollowing;
                return (
                  <article
                    key={reader.id}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 space-y-4 hover:border-foreground/30 transition-colors shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {reader.image ? (
                          <img
                            src={reader.image}
                            alt={reader.name}
                            className="size-12 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="size-12 rounded-full bg-muted flex items-center justify-center font-bold text-base text-muted-foreground">
                            {reader.name.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif font-bold text-sm truncate">
                            {reader.name}
                          </h3>
                          <p className="text-[11px] font-mono text-muted-foreground truncate">
                            @{reader.username || "reader"}
                          </p>
                          {reader.locationCity && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="size-3 shrink-0" />
                              <span className="truncate">{reader.locationCity}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {reader.bio ? (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {reader.bio}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic">
                          Pembaca aktif AnzaBook.
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <div className="text-[11px] font-mono text-muted-foreground space-y-0.5">
                        <div>{reader.booksReadCount} Buku Tamat</div>
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                          <Flame className="size-3 shrink-0" />
                          <span>{reader.streakDays} Hari Streak</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                          <Link to="/u/$username" params={{ username: reader.username || reader.id }}>
                            Profil
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant={isFollowing ? "outline" : "default"}
                          disabled={
                            followUserMutation.isPending ||
                            unfollowUserMutation.isPending
                          }
                          onClick={() => {
                            if (isFollowing) {
                              unfollowUserMutation.mutate(reader.id);
                            } else {
                              followUserMutation.mutate({ targetUserId: reader.id });
                            }
                          }}
                          className="h-9 text-xs gap-1"
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck className="size-3.5" />
                              Mengikuti
                            </>
                          ) : (
                            <>
                              <UserPlus className="size-3.5" />
                              Ikuti
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function CommunityItemCard({
  calendar,
}: {
  calendar: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    description: string;
    avatarUrl: string | null;
    followerCount: number;
    isFollowing?: boolean;
    verificationStatus: string;
  };
}) {
  const toggleFollowMutation = useToggleFollowCalendar(calendar.slug);

  return (
    <article className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 space-y-4 hover:border-foreground/30 transition-colors shadow-xs">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-lg border border-amber-500/30 shrink-0">
            {calendar.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif font-bold text-sm truncate">
                {calendar.name}
              </h3>
              {calendar.verificationStatus === "verified" && (
                <CheckCircle className="size-4 text-amber-500 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{calendar.city || "Indonesia"}</span>
            </p>
          </div>
        </div>

        {calendar.description && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {calendar.description}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-muted-foreground">
          {calendar.followerCount} Anggota
        </span>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 text-xs">
            <Link to="/c/$slug" params={{ slug: calendar.slug }}>
              Buka Komunitas
            </Link>
          </Button>
          <Button
            size="sm"
            variant={calendar.isFollowing ? "outline" : "default"}
            disabled={toggleFollowMutation.isPending}
            onClick={() => toggleFollowMutation.mutate()}
            className="h-9 text-xs"
          >
            {calendar.isFollowing ? "Mengikuti ✓" : "Ikuti"}
          </Button>
        </div>
      </div>
    </article>
  );
}
