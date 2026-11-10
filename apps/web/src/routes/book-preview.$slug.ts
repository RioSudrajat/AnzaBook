import { createFileRoute } from "@tanstack/react-router";
import type { BookSummaryDto, DataResponse } from "@starter/shared/types";
import { apiBaseUrl } from "@/lib/api/upstream.server";

export const Route = createFileRoute("/book-preview/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = `/api/books/${encodeURIComponent(params.slug)}`;
        const response = await fetch(new URL(path, apiBaseUrl()), {
          signal: request.signal,
        });
        if (!response.ok) {
          return new Response(null, {
            status: response.status === 404 ? 404 : 502,
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
