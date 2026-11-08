import * as React from "react";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle,
  MapPin,
  Mail,
  Users,
  Plus,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  useCalendar,
  useEvents,
  useToggleFollowCalendar,
} from "@/features/events/hooks";
import {
  calendarDetailQuery,
  eventsQuery,
} from "@/features/events/queries";
import { EventDetailDrawer } from "@/features/events/components/event-detail-drawer";
import { CreateEventDialog } from "@/features/events/components/create-event-dialog";

export const Route = createFileRoute("/c/$slug")({
  loader: async ({ context, params }) => {
    try {
      const calendar = await context.queryClient.ensureQueryData(
        calendarDetailQuery(params.slug),
      );
      await context.queryClient.ensureQueryData(
        eventsQuery({ calendarSlug: params.slug }),
      );
      return { calendar };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    const title = loaderData?.calendar?.name
      ? `${loaderData.calendar.name} | Kalender Komunitas AnzaBook`
      : "Kalender Komunitas | AnzaBook";
    return { meta: [{ title }] };
  },
  component: CalendarHubPage,
});

export default function CalendarHubPage() {
  const { slug } = Route.useParams();
  const { data: calendar } = useCalendar(slug);
  const { data: eventsData } = useEvents({ calendarSlug: slug });
  const toggleFollowMutation = useToggleFollowCalendar(slug);

  const [selectedEventSlug, setSelectedEventSlug] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  if (!calendar) return null;

  const events = eventsData?.data || [];
  const selectedEvent = events.find((e) => e.slug === selectedEventSlug) || null;

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

        <Link
          to="/app"
          search={{ tab: "home" }}
          className="flex items-center gap-2 text-xs font-semibold text-white"
        >
          <img src="/icon.svg" alt="AnzaBook" className="size-6 rounded" />
          <span>AnzaBook</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Calendar Profile Banner & Info */}
        <div className="relative rounded-2xl border border-white/10 bg-[#16171b] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 font-bold text-2xl border border-amber-500/30">
                {calendar.name[0]}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    {calendar.name}
                  </h1>
                  {calendar.verificationStatus === "verified" && (
                    <CheckCircle className="size-5 text-amber-400" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-white/50">
                  <span>{calendar.city || "Indonesia"}</span>
                  <span>•</span>
                  <span>{calendar.followerCount} Pengikut</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {calendar.isManager && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
                >
                  <Plus className="size-4 mr-1" />
                  Buat Acara
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={toggleFollowMutation.isPending}
                onClick={() => toggleFollowMutation.mutate()}
                className={`rounded-lg border text-xs font-medium ${
                  calendar.isFollowing
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/30 bg-white text-black hover:bg-white/90"
                }`}
              >
                {calendar.isFollowing ? "Mengikuti ✓" : "Ikuti Kalender"}
              </Button>
            </div>
          </div>

          {calendar.description && (
            <p className="text-xs text-white/70 max-w-2xl leading-relaxed">
              {calendar.description}
            </p>
          )}
        </div>

        {/* Calendar Events Timeline Feed */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CalendarIcon className="size-4 text-amber-400" />
            Agenda Mendatang
          </h2>

          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/50">
              Belum ada acara mendatang yang diterbitkan oleh kalender ini.
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <article
                  key={ev.id}
                  onClick={() => setSelectedEventSlug(ev.slug)}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#16171b] p-4 hover:border-white/25 hover:bg-white/5 transition-all"
                >
                  <div className="space-y-1">
                    <div className="text-xs text-amber-400 font-medium">
                      {new Date(ev.startsAt).toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                    <h3 className="text-sm font-semibold text-white">{ev.title}</h3>
                    <div className="text-xs text-white/50">
                      {ev.isAddressHidden ? ev.city : ev.venueName || "Lokasi Acara"}
                    </div>
                  </div>

                  <img
                    src={ev.coverUrl}
                    alt=""
                    className="size-16 rounded-lg object-cover border border-white/10 shrink-0"
                  />
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Drawer */}
      <EventDetailDrawer
        open={Boolean(selectedEventSlug)}
        onClose={() => setSelectedEventSlug(null)}
        event={selectedEvent}
      />

      <CreateEventDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(eventSlug) => setSelectedEventSlug(eventSlug)}
      />

      {/* Footer */}
      <div className="border-t border-white/10 mt-12">
        <SiteFooter />
      </div>
    </div>
  );
}
