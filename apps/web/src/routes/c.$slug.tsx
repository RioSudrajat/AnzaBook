import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { PageFrame } from "@/features/dashboard/components/page-frame";
import { ApiError } from "@/lib/api/client";
import { calendarDetailQuery, eventsQuery } from "@/features/events/queries";
import { CommunityHubView } from "@/features/events/components/community-hub-view";

const communitySearchSchema = z.object({
  tab: z.enum(["agenda", "anggota", "kas"]).optional().catch(undefined),
  returnTo: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/c/$slug")({
  validateSearch: communitySearchSchema,
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

function CalendarHubPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const sessionUser = Route.useRouteContext().session?.user;

  return (
    <PageFrame
      user={sessionUser}
      activeTab="events"
      title="Komunitas Literasi"
      showBack={false}
      backLabel="Kembali"
      wide
    >
      <CommunityHubView
        slug={slug}
        isInsideApp={Boolean(sessionUser)}
        tab={search.tab}
        returnTo={search.returnTo}
        onTabChange={(nextTab) => {
          void navigate({
            to: "/c/$slug",
            params: { slug },
            search: (prev) => ({ ...prev, tab: nextTab }),
            replace: true,
            resetScroll: false,
          });
        }}
      />
    </PageFrame>
  );
}
