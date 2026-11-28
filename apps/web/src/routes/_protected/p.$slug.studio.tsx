import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircle, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { AppShell } from "@/features/dashboard/components/app-shell";
import {
  PublisherStudioView,
  type PublisherCatalogView,
  type PublisherStudioTab,
} from "@/features/publisher/components/publisher-studio-view";
import { canAccessPublisherStudio } from "@/features/publisher/publisher-helpers";
import { usePublisher } from "@/features/social/hooks";
import { publisherDetailQuery } from "@/features/social/queries";
import { ApiError } from "@/lib/api/client";

const studioSearchSchema = z.object({
  tab: z.enum(["inbox", "catalog", "team"]).optional().catch(undefined),
  catalogView: z.enum(["publish", "draft"]).optional().catch(undefined),
  returnTo: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/p/$slug/studio")({
  validateSearch: studioSearchSchema,
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(
        publisherDetailQuery(params.slug),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return;
      }
      throw error;
    }
  },
  head: () => ({
    meta: [{ title: `Studio Penerbit | ${siteConfig.name}` }],
  }),
  component: PublisherStudioPage,
});

function PublisherStudioPage() {
  const { user } = Route.useRouteContext().session;
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { data: publisher, isLoading, isError } = usePublisher(slug);

  const activeTab: PublisherStudioTab = search.tab ?? "inbox";
  const catalogView: PublisherCatalogView = search.catalogView ?? "publish";

  const handleTabChange = (tab: PublisherStudioTab) => {
    void navigate({
      to: "/p/$slug/studio",
      params: { slug },
      search: (prev) => ({
        ...prev,
        tab,
        catalogView: tab === "catalog" ? prev.catalogView : undefined,
      }),
      replace: true,
      resetScroll: false,
    });
  };

  const handleCatalogViewChange = (nextView: PublisherCatalogView) => {
    void navigate({
      to: "/p/$slug/studio",
      params: { slug },
      search: (prev) => ({
        ...prev,
        tab: "catalog",
        catalogView: nextView,
      }),
      replace: true,
      resetScroll: false,
    });
  };

  const title = publisher ? `Studio · ${publisher.name}` : "Studio Penerbit";

  return (
    <AppShell user={user} activeTab="profile" title={title} wide>
      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <LoaderCircle
            className="size-7 animate-spin text-[var(--color-muted)]"
            aria-hidden="true"
          />
        </div>
      ) : isError || !publisher ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-8 text-center space-y-4">
          <h1 className="font-serif text-xl font-bold text-[var(--color-ink)]">
            Penerbit Tidak Ditemukan
          </h1>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            Halaman studio penerbit dengan alamat /p/{slug} tidak tersedia atau
            telah dipindahkan.
          </p>
          <Link
            to="/app"
            search={{ tab: "publisher" }}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-accent)] px-5 text-xs font-semibold text-[var(--color-accent-ink)]"
          >
            Kembali ke Daftar Penerbit
          </Link>
        </div>
      ) : !canAccessPublisherStudio(publisher.currentUserRole) ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-[var(--color-error)]/40 bg-[var(--color-paper-2)] p-8 text-center space-y-4 text-[var(--color-ink)]">
          <ShieldAlert
            className="mx-auto size-9 text-[var(--color-error)]"
            aria-hidden="true"
          />
          <div className="space-y-1.5">
            <h1 className="font-serif text-xl font-bold">
              Akses Studio Redaksi Dibatasi
            </h1>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Studio ini hanya dapat diakses oleh pemilik, editor redaksi, atau
              staf keuangan terdaftar dari {publisher.name}.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link
              to="/p/$slug"
              params={{ slug: publisher.slug }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-accent)] px-5 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
            >
              Lihat Profil Publik Penerbit
            </Link>
            <Link
              to="/app"
              search={{ tab: "publisher" }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-rule)] px-4 text-xs font-medium hover:bg-[var(--color-paper-3)]"
            >
              Penerbit Saya
            </Link>
          </div>
        </div>
      ) : (
        <PublisherStudioView
          publisher={publisher}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          catalogView={catalogView}
          onCatalogViewChange={handleCatalogViewChange}
          returnTo={search.returnTo}
          currentUserId={user.id}
        />
      )}
    </AppShell>
  );
}
