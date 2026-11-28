import type { BookSummaryDto } from "@starter/shared/types";
import { BookCard } from "./book-card";

interface BookCatalogCardProps {
  book: BookSummaryDto;
  className?: string;
}

export function BookCatalogCard({ book, className }: BookCatalogCardProps) {
  return <BookCard book={book} variant="catalog" className={className} />;
}
