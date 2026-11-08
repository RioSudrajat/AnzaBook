import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Share2 } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { ApiError } from "@/lib/api/client";
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
  const { data: event } = useEvent(slug);

  if (!event) return null;

  return (
    <div className="min-h-screen bg-[#0e0f12] text-white flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0e0f12]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          to="/app"
          search={{ tab: "events" }}
          className="flex items-center gap-2 text-xs font-medium text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Agenda</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/app"
            search={{ tab: "home" }}
            className="flex items-center gap-2 text-xs font-semibold text-white"
          >
            <img src="/icon.svg" alt="AnzaBook" className="size-6 rounded" />
            <span>AnzaBook</span>
          </Link>
        </div>
      </header>

      {/* Main Event Content */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 sm:py-12">
        <EventDetailView event={event} />
      </main>

      {/* Footer */}
      <div className="border-t border-white/10 mt-12">
        <SiteFooter />
      </div>
    </div>
  );
}
