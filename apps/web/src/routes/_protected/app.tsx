import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import type {
  BookHighlightDto,
  ReadingSessionDto,
} from "@starter/shared/types";
import { siteConfig } from "@/config/site";
import { useAuthors, useBooks, useCollections } from "@/features/books/hooks";
import { useUserShelves } from "@/features/community/hooks";
import { AllHighlightsDialog } from "@/features/dashboard/components/all-highlights-dialog";
import { AppShell } from "@/features/dashboard/components/app-shell";
import { DashboardEvents } from "@/features/events/components/dashboard-events";
import { CommunityHubView } from "@/features/events/components/community-hub-view";
import { DashboardExplore } from "@/features/dashboard/components/dashboard-explore";
import { DashboardHome } from "@/features/dashboard/components/dashboard-home";
import { DashboardLibrary } from "@/features/dashboard/components/dashboard-library";
import { DashboardProfile } from "@/features/dashboard/components/dashboard-profile";
import { DashboardSettings } from "@/features/dashboard/components/dashboard-settings";
import { useMembershipSummary } from "@/features/membership/hooks";
import { HighlightStoryDialog } from "@/features/reader/components/highlight-story-dialog";
import { FlexReadingDialog } from "@/features/share/components/flex-reading-dialog";

export type AppTab =
  | "home"
  | "explore"
  | "events"
  | "library"
  | "profile"
  | "settings"
  | "shelves"
  | "history"
  | "share"
  | "publisher"
  | "community";

const appSearchSchema = z.object({
  tab: z
    .enum([
      "home",
      "explore",
      "events",
      "library",
      "profile",
      "settings",
      "shelves",
      "history",
      "share",
      "publisher",
      "community",
    ])
    .optional(),
  slug: z.string().optional(),
  view: z.string().optional(),
  category: z.string().min(1).max(50).optional().catch(undefined),
  collection: z.string().min(1).max(120).optional().catch(undefined),
  q: z.string().max(120).optional().catch(undefined),
  scope: z
    .enum(["top", "latest", "posts", "books", "people", "groups"])
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/_protected/app")({
  validateSearch: appSearchSchema,
  head: () => ({ meta: [{ title: `Pustaka & Studio | ${siteConfig.name}` }] }),
  component: AppPage,
});

const TAB_TITLES: Record<string, string> = {
  home: "Home",
  explore: "Explore",
  events: "Agenda",
  library: "My Library",
  community: "Komunitas Literasi",
  publisher: "Studio Penerbit",
  settings: "Settings",
};

export default function AppPage() {
  const { user } = Route.useRouteContext().session;
  const search = Route.useSearch();
  const navigate = useNavigate();

  const currentTabRaw = search.tab || "home";
  const activeTab: AppTab =
    currentTabRaw === "shelves" ||
    currentTabRaw === "history" ||
    currentTabRaw === "share"
      ? "library"
      : (currentTabRaw as AppTab);

  const { data: booksData } = useBooks();
  const { data: authors = [] } = useAuthors();
  const { data: collections = [] } = useCollections();
  const { data: shelves = [] } = useUserShelves();
  const { data: membership } = useMembershipSummary();

  const books = booksData?.data || [];
  const bulletinBook = booksData?.bulletin || null;
  const currentlyReading = shelves.filter(
    (item) => item.shelfStatus === "reading",
  );

  const [isAllHighlightsOpen, setIsAllHighlightsOpen] = useState(false);
  const [flexStoryState, setFlexStoryState] = useState<{
    isOpen: boolean;
    session: ReadingSessionDto | null;
    bookTitle: string;
  }>({
    isOpen: false,
    session: null,
    bookTitle: "",
  });

  const [quoteStoryState, setQuoteStoryState] = useState<{
    isOpen: boolean;
    highlight: BookHighlightDto | null;
  }>({
    isOpen: false,
    highlight: null,
  });

  const handleTabChange = (tab: AppTab) => {
    navigate({
      to: "/app",
      search: { tab },
    });
  };

  const sidebarTab =
    activeTab === "community"
      ? "events"
      : activeTab === "publisher"
        ? "profile"
        : (activeTab as Exclude<AppTab, "community" | "publisher" | "shelves" | "history" | "share">);

  const title =
    activeTab === "profile"
      ? search.view === "edit"
        ? "Edit Profile"
        : "Profil Saya"
      : (TAB_TITLES[activeTab] ?? "Settings");

  return (
    <AppShell user={user} activeTab={sidebarTab} title={title} wide>
      {activeTab === "home" && membership?.status === "expired" && (
        <section
          aria-label="Keanggotaan Nakama"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
        >
          <p className="text-sm">
            Masa aktif Nakama sudah berakhir. Perpanjang untuk melanjutkan buku
            Premium dari posisi terakhir.
          </p>
          <button
            type="button"
            onClick={() => handleTabChange("settings")}
            className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          >
            Perpanjang Nakama
          </button>
        </section>
      )}

      {activeTab === "home" && (
        <DashboardHome
          books={books}
          authors={authors}
          bulletinBook={bulletinBook}
          collections={collections}
          currentlyReading={currentlyReading}
        />
      )}

      {activeTab === "explore" && (
        <DashboardExplore
          category={search.category}
          collection={search.collection}
        />
      )}

      {activeTab === "events" && <DashboardEvents />}

      {activeTab === "community" &&
        (search.slug ? (
          <CommunityHubView slug={search.slug} isInsideApp />
        ) : (
          <DashboardEvents />
        ))}

      {activeTab === "library" && (
        <DashboardLibrary
          shelves={shelves}
          onOpenAllHighlights={() => setIsAllHighlightsOpen(true)}
          onOpenFlexStory={(session, bookTitle) => {
            setFlexStoryState({ isOpen: true, session, bookTitle });
          }}
        />
      )}

      {activeTab === "profile" && (
        <DashboardProfile
          isOwnProfile
          isEditing={search.view === "edit"}
          onStartEdit={() => {
            navigate({
              to: "/app",
              search: { tab: "profile", view: "edit" },
            });
          }}
          onFinishEdit={() => {
            navigate({
              to: "/app",
              search: { tab: "profile" },
            });
          }}
          onNavigateSettings={() => handleTabChange("settings")}
          onOpenFlexStory={(session, bookTitle) => {
            setFlexStoryState({ isOpen: true, session, bookTitle });
          }}
        />
      )}

      {activeTab === "settings" && (
        <DashboardSettings
          userName={user.name}
          userEmail={user.email}
          userRole={user.role ?? undefined}
          userImage={user.image}
          emailVerified={user.emailVerified}
          memberSince={
            typeof user.createdAt === "string"
              ? user.createdAt
              : user.createdAt.toISOString()
          }
        />
      )}

      <AllHighlightsDialog
        isOpen={isAllHighlightsOpen}
        onClose={() => setIsAllHighlightsOpen(false)}
        onOpenStory={(hl) => {
          setIsAllHighlightsOpen(false);
          setQuoteStoryState({ isOpen: true, highlight: hl });
        }}
      />

      <FlexReadingDialog
        isOpen={flexStoryState.isOpen}
        session={flexStoryState.session}
        bookTitle={flexStoryState.bookTitle}
        userName={user.name}
        onClose={() =>
          setFlexStoryState((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {quoteStoryState.highlight && (
        <HighlightStoryDialog
          isOpen={quoteStoryState.isOpen}
          onClose={() =>
            setQuoteStoryState({ isOpen: false, highlight: null })
          }
          bookTitle="Sains, Logika, dan Seni untuk Hidup Bermutu"
          bookAuthor="Zenius"
          chapterNumber={quoteStoryState.highlight.chapterNumber}
          highlightText={quoteStoryState.highlight.selectedText}
          color={quoteStoryState.highlight.color}
          note={quoteStoryState.highlight.note || undefined}
          readerName={user.name}
        />
      )}
    </AppShell>
  );
}
