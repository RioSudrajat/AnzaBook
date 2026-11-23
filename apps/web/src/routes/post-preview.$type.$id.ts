import { createFileRoute } from "@tanstack/react-router";
import type { DataResponse, ExplorePostItemDto } from "@starter/shared/types";
import { publicSocialPostParamsSchema } from "@starter/shared/validators/social";
import { apiBaseUrl } from "@/lib/api/upstream.server";

export const Route = createFileRoute("/post-preview/$type/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const parsed = publicSocialPostParamsSchema.safeParse(params);
        if (!parsed.success) {
          return new Response(null, { status: 404 });
        }

        const path = `/api/social/posts/${encodeURIComponent(parsed.data.type)}/${encodeURIComponent(parsed.data.id)}`;
        const response = await fetch(new URL(path, apiBaseUrl()), {
          signal: request.signal,
        });

        if (!response.ok) {
          return new Response(null, {
            status:
              response.status === 404 || response.status === 422 ? 404 : 502,
          });
        }

        const { data } =
          (await response.json()) as DataResponse<ExplorePostItemDto>;
        const { renderPostPreview } =
          await import("@/features/share/post-preview.server");
        const png = await renderPostPreview(data);

        return new Response(png, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control":
              "public, max-age=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
