import { useState, useEffect, type FormEvent } from "react";
import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Building2,
  CheckCircle,
  Edit3,
  FileText,
  Inbox,
  Mail,
  MapPin,
  PenTool,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { PageFrame } from "@/features/dashboard/components/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookCatalogCard } from "@/features/books/components/book-catalog-card";
import { useBooks } from "@/features/books/hooks";
import { booksListQuery } from "@/features/books/queries";
import {
  usePublisher,
  usePublisherManuscripts,
  useUpdatePublisherProfile,
} from "@/features/social/hooks";
import { publisherDetailQuery } from "@/features/social/queries";
import { ApiError } from "@/lib/api/client";
import { formatDigitalPolicy, formatManuscriptStatus } from "@/lib/formatters";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ context, params }) => {
    try {
      const publisher = await context.queryClient.ensureQueryData(
        publisherDetailQuery(params.slug),
      );
      const booksData = await context.queryClient.ensureQueryData(
        booksListQuery({ publisher: params.slug }),
      );
      return { publisher, booksData };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    const name = loaderData?.publisher?.name;
    const title = name
      ? `${name} — Mitra Penerbit Resmi | AnzaBook`
      : "Mitra Penerbit | AnzaBook";
    return { meta: [{ title }] };
  },
  component: PublisherPublicProfilePage,
});

export default function PublisherPublicProfilePage() {
  const { slug } = Route.useParams();
  const sessionUser = Route.useRouteContext().session?.user;
  const { data: publisher } = usePublisher(slug);
  const { data: booksResponse, refetch: refetchBooks } = useBooks({ publisher: slug });

  const isManager = Boolean(
    publisher?.currentUserRole === "owner" ||
      publisher?.currentUserRole === "editor",
  );

  const { data: manuscripts = [] } = usePublisherManuscripts(slug);
  const updatePublisherMutation = useUpdatePublisherProfile();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"catalog" | "inbox">("catalog");

  // Edit publisher state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editIkapiNumber, setEditIkapiNumber] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = () => {
    if (publisher) {
      setEditName(publisher.name);
      setEditDescription(publisher.description || "");
      setEditCity(publisher.city || "");
      setEditAddress(publisher.address || "");
      setEditContactEmail(publisher.contactEmail || "");
      setEditIkapiNumber(publisher.ikapiNumber || "");
      setEditLogoUrl(publisher.logoUrl || "");
      setEditError(null);
    }
    setIsEditOpen(true);
  };

  const handleSavePublisher = async (e: FormEvent) => {
    e.preventDefault();
    setEditError(null);
    try {
      await updatePublisherMutation.mutateAsync({
        slug,
        input: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          city: editCity.trim() || undefined,
          address: editAddress.trim() || undefined,
          contactEmail: editContactEmail.trim() || undefined,
          ikapiNumber: editIkapiNumber.trim() || undefined,
          logoUrl: editLogoUrl.trim() || undefined,
        },
      });
      setIsEditOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError("Gagal memperbarui profil penerbit.");
      }
    }
  };

  if (!publisher) return null;

  const publishedBooks = booksResponse?.data || [];

  return (
    <PageFrame
      user={sessionUser}
      activeTab={isManager ? "profile" : "explore"}
      title="Penerbit"
    >
      <div className="space-y-12 pb-12">
        {/* Publisher Hero Profile Banner */}
        <section
          aria-labelledby="publisher-heading"
          className="rounded-2xl border border-border/80 bg-card p-6 sm:p-10 space-y-6 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {publisher.logoUrl ? (
                <img
                  src={publisher.logoUrl}
                  alt={publisher.name}
                  className="size-20 rounded-2xl object-contain bg-muted/40 p-2 border border-border/70 shrink-0"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-3xl border border-amber-500/30 shrink-0">
                  {publisher.name.slice(0, 1)}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1
                    id="publisher-heading"
                    className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
                  >
                    {publisher.name}
                  </h1>
                  {publisher.verificationStatus === "verified" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      <ShieldCheck className="size-3.5" />
                      Mitra Penerbit Terverifikasi IKAPI
                    </span>
                  ) : publisher.verificationStatus === "rejected" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                      Status: Ditolak
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Menunggu Verifikasi Admin
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
                  {publisher.ikapiNumber && (
                    <span className="font-semibold text-foreground/80">
                      No. Anggota IKAPI: {publisher.ikapiNumber}
                    </span>
                  )}
                  {publisher.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {publisher.city}
                    </span>
                  )}
                  {publisher.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3.5" />
                      {publisher.contactEmail}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isManager && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openEditModal}
                  className="h-9 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer rounded-xl"
                >
                  <Edit3 className="size-3.5" />
                  <span>Edit Profil Penerbit</span>
                </Button>
              )}

              <Button asChild variant="outline" size="sm" className="h-9 text-xs font-mono rounded-xl">
                <Link to="/app" search={{ tab: "explore" }}>
                  Semua Mitra
                </Link>
              </Button>
            </div>
          </div>

          {publisher.description && (
            <p className="font-serif text-sm text-foreground/80 max-w-3xl leading-relaxed">
              {publisher.description}
            </p>
          )}

          {/* Stats Badges Row */}
          <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-1">
              <div className="text-muted-foreground">Total Buku Terbit</div>
              <div className="font-serif text-lg font-bold text-foreground">
                {publisher.totalBooks || publishedBooks.length} Judul
              </div>
            </div>

            {isManager ? (
              <>
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-1">
                  <div className="text-muted-foreground">Bagi Hasil Royalti</div>
                  <div className="font-serif text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    75% Penerbit / Penulis
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-1">
                  <div className="text-muted-foreground">Distribusi Phygital</div>
                  <div className="font-serif text-lg font-bold text-foreground">
                    Gratis Kuota Klaim Cetak
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-1">
                  <div className="text-muted-foreground">Kota</div>
                  <div className="font-serif text-lg font-bold text-foreground">
                    {publisher.city || "Indonesia"}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-1">
                  <div className="text-muted-foreground">Status Mitra</div>
                  <div className="font-serif text-lg font-bold text-foreground">
                    {publisher.verificationStatus === "verified"
                      ? "Terverifikasi IKAPI"
                      : "Dalam verifikasi"}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Manager Tabs Switcher (if owner or editor) */}
        {isManager && (
          <div className="border-b border-border flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer inline-flex items-center gap-2 ${
                activeTab === "catalog"
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="size-4" />
              <span>Katalog Buku ({publishedBooks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("inbox")}
              className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer inline-flex items-center gap-2 ${
                activeTab === "inbox"
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Inbox className="size-4" />
              <span>Inbox Naskah Masuk ({manuscripts.length})</span>
            </button>
          </div>
        )}

        {/* Section: Published Books Catalog */}
        {activeTab === "catalog" && (
          <section aria-labelledby="publisher-books-heading" className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="size-5 text-[var(--color-accent)]" />
                <h2
                  id="publisher-books-heading"
                  className="font-serif text-2xl font-bold tracking-tight text-foreground"
                >
                  Katalog Naskah Terbitan {publisher.name}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Jelajahi edisi cetak phygital dan pustaka naskah digital berlisensi resmi.
              </p>
            </div>

            {publishedBooks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-3">
                <BookOpen className="size-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Belum ada naskah yang diterbitkan oleh penerbit ini di katalog digital AnzaBook.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/app" search={{ tab: "explore" }}>
                    Lihat Katalog Lainnya
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {publishedBooks.map((book) => (
                  <li key={book.id}>
                    <BookCatalogCard book={book} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Section: Inbox Naskah Masuk (Publisher Manager Only) */}
        {activeTab === "inbox" && isManager && (
          <section aria-labelledby="publisher-inbox-heading" className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Inbox className="size-5 text-[var(--color-accent)]" />
                <h2
                  id="publisher-inbox-heading"
                  className="font-serif text-2xl font-bold tracking-tight text-foreground"
                >
                  Inbox Naskah Masuk dari Penulis
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Tinjau draf naskah yang diajukan oleh penulis langsung di editor naskah untuk kurasi redaksi, revisi, atau penerbitan.
              </p>
            </div>

            {manuscripts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-3">
                <Inbox className="size-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Belum ada naskah yang dikirimkan oleh penulis kepada penerbit ini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {manuscripts.map((item) => {
                  const statusColors: Record<string, string> = {
                    draft: "bg-muted text-foreground border-border",
                    submitted: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
                    under_review: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
                    revision_requested: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
                    accepted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                    published: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
                    rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
                  };

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-xl border border-border bg-card space-y-3 hover:border-foreground/30 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-serif font-bold text-base text-foreground">
                              {item.title}
                            </h4>
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase border ${
                                statusColors[item.status] || "bg-muted text-foreground"
                              }`}
                            >
                              {formatManuscriptStatus(item.status)}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground font-mono">
                            Penulis:{" "}
                            <strong className="text-foreground">
                              {item.authorPenName || item.authorName || "Anonim"}
                            </strong>
                          </p>

                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.synopsis || "Belum ada sinopsis."}
                          </p>
                        </div>

                        <div className="shrink-0 self-start sm:self-auto">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              navigate({
                                to: "/read/$slug",
                                params: { slug: `manuscript-${item.id}` },
                                search: { editorial: "preview" },
                              })
                            }
                            className="bg-foreground text-background hover:opacity-90 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 rounded-xl"
                          >
                            <PenTool className="size-3.5" />
                            <span>Tinjau Naskah</span>
                          </Button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                          {item.chapters?.length || item.totalChapters || 1} Bab • Diajukan{" "}
                          {new Date(item.createdAt).toLocaleDateString("id-ID")}
                        </div>
                        <div>
                          Skema: <strong className="text-foreground font-medium">{formatDigitalPolicy(item.proposedDigitalPolicy)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Edit Profil Penerbit Dialog */}
      {isEditOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-foreground overflow-y-auto"
        >
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 shadow-2xl relative space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold">
                Edit Profil Penerbit
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSavePublisher} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="edit-pub-name" className="text-xs">
                  Nama Penerbit <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-pub-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-pub-desc" className="text-xs">
                  Deskripsi &amp; Visi Editorial
                </Label>
                <Textarea
                  id="edit-pub-desc"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Ceritakan lini terbitan naskah..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-pub-ikapi" className="text-xs">
                    Nomor IKAPI
                  </Label>
                  <Input
                    id="edit-pub-ikapi"
                    value={editIkapiNumber}
                    onChange={(e) => setEditIkapiNumber(e.target.value)}
                    placeholder="Contoh: 123/JBA/2024"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-pub-city" className="text-xs">
                    Kota / Wilayah
                  </Label>
                  <Input
                    id="edit-pub-city"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="Contoh: Yogyakarta"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-pub-email" className="text-xs">
                    Email Redaksi
                  </Label>
                  <Input
                    id="edit-pub-email"
                    type="email"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    placeholder="redaksi@penerbit.id"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-pub-address" className="text-xs">
                    Alamat Kantor
                  </Label>
                  <Input
                    id="edit-pub-address"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Jl. ..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-pub-logo" className="text-xs">
                  URL Logo Penerbit
                </Label>
                <Input
                  id="edit-pub-logo"
                  value={editLogoUrl}
                  onChange={(e) => setEditLogoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  className="text-xs min-h-10 px-4 cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={updatePublisherMutation.isPending}
                  className="bg-foreground text-background text-xs min-h-10 px-4 cursor-pointer font-semibold"
                >
                  {updatePublisherMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
