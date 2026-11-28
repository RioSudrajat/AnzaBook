import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { AnzaLogoMark } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { SmartBackButton } from "@/components/smart-back-button";
import { ApiError } from "@/lib/api/client";
import { AppShell } from "@/features/dashboard/components/app-shell";
import { eventDescriptionToPlainExcerpt } from "@/features/events/event-description-doc";
import {
  formatEventShareSchedule,
  getSafeEventShareLocation,
} from "@/features/events/event-share";
import {
  eventPagePath,
  eventPreviewPath,
  eventShareOrigin,
} from "@/features/events/event-share-origin";
import { useEvent } from "@/features/events/hooks";
import { eventDetailQuery } from "@/features/events/queries";
import { EventDetailView } from "@/features/events/components/event-detail-view";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ context, params }) => {
    try {
      const event = await context.queryClient.ensureQueryData(
        eventDetailQuery(params.slug),
      );
      return {
        event,
        origin: eventShareOrigin(),
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData?.event) {
      return { meta: [{ title: "Agenda Acara | AnzaBook" }] };
    }
    const { event, origin } = loaderData;
    const schedule = formatEventShareSchedule(event.startsAt, event.endsAt);
    const location = getSafeEventShareLocation(event);
    const excerpt = eventDescriptionToPlainExcerpt(event.description)
      .slice(0, 140)
      .trim();
    const metaDesc = `${schedule.dateLine}, ${schedule.timeRange} di ${location.primaryLine}${excerpt ? `. ${excerpt}` : ""}`;
    const url = new URL(eventPagePath(event.slug), origin).href;
    const image = new URL(eventPreviewPath(event.slug), origin).href;

    const meta = [
      { title: `${event.title} | Agenda AnzaBook` },
      { name: "description", content: metaDesc },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "AnzaBook" },
      { property: "og:title", content: event.title },
      { property: "og:description", content: metaDesc },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: event.title },
      { name: "twitter:description", content: metaDesc },
      { name: "twitter:image", content: image },
    ];

    if (event.visibility === "private_link") {
      meta.push({ name: "robots", content: "noindex, nofollow" });
    }

    return { meta };
  },
  component: EventPage,
});

function EventPage() {
  const { slug } = Route.useParams();
  const sessionUser = Route.useRouteContext().session?.user;
  const { data: event } = useEvent(slug);

  if (!event) return null;

  if (sessionUser) {
    return (
      <AppShell
        user={sessionUser}
        activeTab="events"
        title="Detail Agenda"
        wide
      >
        <div className="mb-4">
          <SmartBackButton fallbackTo="/app" />
        </div>
        <EventDetailView
          event={event}
          isInsideAppShell
          currentUserName={sessionUser.name}
        />
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <SmartBackButton fallbackTo="/" />
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-foreground"
        >
          <AnzaLogoMark className="size-5 shrink-0" />
          <span className="font-serif text-sm">AnzaBook</span>
        </Link>
      </header>

      <main
        id="main-content"
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10"
      >
        <EventDetailView event={event} />
      </main>

      <div className="border-t border-border mt-12">
        <SiteFooter />
      </div>
    </div>
  );
}
