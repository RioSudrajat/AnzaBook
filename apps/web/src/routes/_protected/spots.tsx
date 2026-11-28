import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  spotCategoryValues,
  spotFacilityKeyValues,
} from "@starter/shared/validators/spots";
import { siteConfig } from "@/config/site";
import { AppShell } from "@/features/dashboard/components/app-shell";
import {
  SpotsExplorerView,
  type SpotsSearchParams,
} from "@/features/spots/components/spots-explorer-view";
import {
  spotCitiesQuery,
  spotDetailQuery,
  spotsListQuery,
} from "@/features/spots/queries";
import { INDONESIA_DEFAULT_VIEW } from "@/features/spots/types";

const spotsSearchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional().catch(undefined),
  lng: z.coerce.number().min(-180).max(180).optional().catch(undefined),
  z: z.coerce.number().min(3).max(20).optional().catch(undefined),
  spot: z.string().min(1).max(160).optional().catch(undefined),
  category: z.enum(spotCategoryValues).optional().catch(undefined),
  city: z.string().min(1).max(100).optional().catch(undefined),
  facility: z.enum(spotFacilityKeyValues).optional().catch(undefined),
  q: z.string().max(120).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/spots")({
  validateSearch: spotsSearchSchema,
  loaderDeps: ({ search }) => ({
    lat: search.lat,
    lng: search.lng,
    spot: search.spot,
    category: search.category,
    city: search.city,
    facility: search.facility,
    q: search.q,
  }),
  loader: async ({ context, deps }) => {
    const prefetches: Promise<unknown>[] = [
      context.queryClient.ensureQueryData(spotCitiesQuery()),
      context.queryClient.ensureQueryData(
        spotsListQuery({
          lat: deps.lat ?? INDONESIA_DEFAULT_VIEW.lat,
          lng: deps.lng ?? INDONESIA_DEFAULT_VIEW.lng,
          city: deps.city,
          category: deps.category,
          facility: deps.facility,
          q: deps.q,
          sort: "nearest",
          limit: 200,
        }),
      ),
    ];
    if (deps.spot) {
      prefetches.push(
        context.queryClient.ensureQueryData(spotDetailQuery(deps.spot)),
      );
    }
    await Promise.all(prefetches);
  },
  head: () => ({
    meta: [{ title: `Peta Sudut Baca | ${siteConfig.name}` }],
  }),
  component: SpotsPage,
});

function SpotsPage() {
  const { user } = Route.useRouteContext().session;
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const handleUpdateSearch = (
    patch: Partial<SpotsSearchParams>,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
      }),
      replace: options?.replace ?? false,
    });
  };

  return (
    <AppShell user={user} activeTab="home" title="Peta Sudut Baca" fullBleed>
      <SpotsExplorerView search={search} onUpdateSearch={handleUpdateSearch} />
    </AppShell>
  );
}
