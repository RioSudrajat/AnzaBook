import { classicBooks } from "./classic-books";
import { scienceBooks } from "./science-books";
import { specialBooks } from "./special-books";
import type { BookSeed } from "./types";

export const allBooksData: BookSeed[] = [
  ...classicBooks,
  ...scienceBooks,
  ...specialBooks,
];
