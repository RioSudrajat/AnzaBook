import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageFrame } from "@/features/dashboard/components/page-frame";
import { ApiError } from "@/lib/api/client";
import {
  calendarDetailQuery,
  eventsQuery,
} from "@/features/events/queries";
import { CommunityHubView } from "@/features/events/components/community-hub-view";

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
  const sessionUser = Route.useRouteContext().session?.user;

  return (
    <PageFrame
      user={sessionUser}
      activeTab="events"
      title="Komunitas Literasi"
      showBack={false}
      backLabel="Kembali"
    >
      <CommunityHubView slug={slug} isInsideApp={Boolean(sessionUser)} />
    </PageFrame>
  );
}
