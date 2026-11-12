import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SmartBackButton } from "@/components/smart-back-button";
import { ApiError } from "@/lib/api/client";
import { AppShell } from "@/features/dashboard/components/app-shell";
import { useEvent } from "@/features/events/hooks";
import { eventDetailQuery } from "@/features/events/queries";
import { EventDetailView } from "@/features/events/components/event-detail-view";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ context, params }) => {
    try {
      const event = await context.queryClient.ensureQueryData(
        eventDetailQuery(params.slug),
      );
      return { event };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    const title = loaderData?.event?.title
      ? `${loaderData.event.title} | Agenda AnzaBook`
      : "Agenda Acara | AnzaBook";
    return { meta: [{ title }] };
  },
  component: EventPage,
});

export default function EventPage() {
  const { slug } = Route.useParams();
  const sessionUser = Route.useRouteContext().session?.user;
  const { data: event } = useEvent(slug);

  if (!event) return null;

  if (sessionUser) {
    return (
      <AppShell user={sessionUser} activeTab="events" title="Agenda">
        <SmartBackButton fallbackTo="/app" className="-ml-2 mb-3" />
        {/* The event card is designed on a dark canvas, so it keeps one inside the light shell. */}
        <div className="mx-auto max-w-xl rounded-2xl bg-[#0e0f12] px-4 py-8 text-white sm:px-6">
          <EventDetailView event={event} />
        </div>
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0f12] text-white flex flex-col justify-between">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0e0f12]/90 backdrop-blur-md px-4 sm:px-8 py-2 flex items-center justify-between">
        <SmartBackButton
          fallbackTo="/"
          className="text-white/70 hover:text-white"
        />
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-semibold text-white"
        >
          <img src="/icon.svg" alt="" className="size-6 rounded" />
          <span>AnzaBook</span>
        </Link>
      </header>

      <main
        id="main-content"
        className="flex-1 max-w-xl w-full mx-auto px-4 py-8 sm:py-12"
      >
        <EventDetailView event={event} />
      </main>

      <div className="border-t border-white/10 mt-12">
        <SiteFooter />
      </div>
    </div>
  );
}
