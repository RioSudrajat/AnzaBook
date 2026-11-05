import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import type { ListBooksInput } from "@starter/shared/validators/books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookCatalogCard } from "@/features/books/components/book-catalog-card";
import { useCatalogBooks, useCategories } from "@/features/books/hooks";

type ExploreFilters = Pick<ListBooksInput, "category" | "collection">;
const pageSize = 12;
const selectClassName = "min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring";

export function DashboardExplore({ category, collection }: ExploreFilters) {
  const navigate = useNavigate();
  const categories = useCategories();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [accessTier, setAccessTier] = useState<ListBooksInput["accessTier"]>("all");
  const [page, setPage] = useState({ category, collection, offset: 0 });
  const offset = page.category === category && page.collection === collection ? page.offset : 0;
  const catalog = useCatalogBooks({
    category,
    collection,
    search: search || undefined,
    language: language || undefined,
    accessTier,
    limit: pageSize,
    offset,
  });

  function goToPage(nextOffset: number) {
    setPage({ category, collection, offset: nextOffset });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    goToPage(0);
  }

  function selectCategory(value?: string) {
    goToPage(0);
    void navigate({ to: "/app", search: { tab: "explore", category: value, collection } });
  }

  return (
    <div className="space-y-8 pb-16">
      <section aria-labelledby="explore-categories-heading" className="space-y-3">
        <h2 id="explore-categories-heading" className="font-serif text-xl font-bold">
          Jelajahi Berdasarkan Kategori
        </h2>
        {categories.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">Memuat kategori…</p>
        ) : categories.isError ? (
          <Button type="button" variant="outline" onClick={() => void categories.refetch()}>
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

      <section aria-labelledby="explore-results-heading" className="space-y-4 border-t pt-6">
        <h2 id="explore-results-heading" className="font-serif text-xl font-bold">Buku di katalog</h2>
        {collection && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Koleksi {collection}</span>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                goToPage(0);
                void navigate({ to: "/app", search: { tab: "explore", category } });
              }}
            >
              Hapus filter koleksi
            </Button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr]">
          <label className="space-y-1 text-sm font-medium">
            <span>Bahasa</span>
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
          <label className="space-y-1 text-sm font-medium">
            <span>Akses</span>
            <select
              className={selectClassName}
              value={accessTier}
              onChange={(event) => {
                const value = event.target.value;
                setAccessTier(value === "free" || value === "premium" ? value : "all");
                goToPage(0);
              }}
            >
              <option value="all">Semua jenis akses</option>
              <option value="free">Gratis</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <form onSubmit={submitSearch} className="space-y-1 sm:col-span-2 lg:col-span-1">
            <label htmlFor="explore-search" className="text-sm font-medium">Cari judul atau penulis</label>
            <div className="flex gap-2">
              <Input
                id="explore-search"
                type="search"
                className="min-h-11 min-w-0"
                value={searchDraft}
                maxLength={100}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
              <Button className="min-h-11" variant="outline" type="submit">
                <Search aria-hidden="true" /> Cari
              </Button>
            </div>
          </form>
        </div>

        {catalog.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">Memuat katalog…</p>
        ) : catalog.isError ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-muted-foreground">Katalog gagal dimuat.</p>
            <Button variant="outline" onClick={() => void catalog.refetch()}>Coba lagi</Button>
          </div>
        ) : (
          <>
            {catalog.data.data.length === 0 ? (
              <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                Belum ada buku yang cocok dengan filter ini.
              </p>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {catalog.data.data.map((book) => (
                  <li key={book.id}><BookCatalogCard book={book} /></li>
                ))}
              </ul>
            )}
            {(offset > 0 || catalog.data.meta.hasMore) && (
              <div className="flex flex-wrap gap-2">
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
  );
}
