import { createFileRoute } from "@tanstack/react-router";
import type {
  CommunityEventDetailDto,
  DataResponse,
} from "@starter/shared/types";
import { apiBaseUrl } from "@/lib/api/upstream.server";
import { checkPreviewRateLimit } from "@/lib/preview-rate-limit.server";

const EVENT_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,120}$/;

export const Route = createFileRoute("/event-preview/$slug")({
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

        const slug = String(params.slug || "").trim();
        if (!EVENT_SLUG_REGEX.test(slug)) {
          return new Response(null, { status: 404 });
        }

        const path = `/api/events/${encodeURIComponent(slug)}`;
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
          (await response.json()) as DataResponse<CommunityEventDetailDto>;
        const { renderEventPreview } =
          await import("@/features/events/event-preview.server");
        const png = await renderEventPreview(data);

        return new Response(png, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control":
              data.visibility === "private_link"
                ? "private, max-age=300"
                : "public, max-age=1800, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
