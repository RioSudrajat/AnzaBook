import { createFileRoute } from "@tanstack/react-router";
import { bookDetailQuery } from "@/features/books/queries";

export const Route = createFileRoute("/books/$slug")({
  loader: ({ context, params }) => {
    return context.queryClient.ensureQueryData(bookDetailQuery(params.slug));
  },
  component: BookDetailPageStub,
});

function BookDetailPageStub() {
  return <div>Memuat detail buku...</div>;
}
