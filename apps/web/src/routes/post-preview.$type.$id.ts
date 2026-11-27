import { createFileRoute } from "@tanstack/react-router";
import type { DataResponse, ExplorePostItemDto } from "@starter/shared/types";
import { publicSocialPostParamsSchema } from "@starter/shared/validators/social";
import { apiBaseUrl } from "@/lib/api/upstream.server";
import { checkPreviewRateLimit } from "@/lib/preview-rate-limit.server";

export const Route = createFileRoute("/post-preview/$type/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const limit = checkPreviewRateLimit(request);
        if (!limit.allowed) {
          return new Response("Too Many Requests", {
            status: 429,
            headers: {
              "Retry-After": String(limit.retryAfterSeconds),
              "Cache-Control": "no-store",
            },
          });
        }

        const parsed = publicSocialPostParamsSchema.safeParse(params);
        if (!parsed.success) {
          return new Response(null, { status: 404 });
        }

        const path = `/api/social/posts/${encodeURIComponent(parsed.data.type)}/${encodeURIComponent(parsed.data.id)}`;
        const response = await fetch(new URL(path, apiBaseUrl()), {
          signal: AbortSignal.any([
            request.signal,
            AbortSignal.timeout(10_000),
          ]),
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
