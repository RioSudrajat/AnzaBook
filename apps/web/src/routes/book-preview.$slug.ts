import { createFileRoute } from "@tanstack/react-router";
import type { BookSummaryDto, DataResponse } from "@starter/shared/types";
import { bookSlugSchema } from "@starter/shared/validators/books";
import { apiBaseUrl } from "@/lib/api/upstream.server";
import { checkPreviewRateLimit } from "@/lib/preview-rate-limit.server";

export const Route = createFileRoute("/book-preview/$slug")({
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

        const parsed = bookSlugSchema.safeParse(params);
        if (!parsed.success) {
          return new Response(null, { status: 404 });
        }

        const path = `/api/books/${encodeURIComponent(parsed.data.slug)}`;
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
          (await response.json()) as DataResponse<BookSummaryDto>;
        const { renderBookPreview } =
          await import("@/features/books/book-preview.server");
        return new Response(await renderBookPreview(data), {
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
