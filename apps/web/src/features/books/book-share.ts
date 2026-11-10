import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

export const bookPagePath = (slug: string) =>
  `/books/${encodeURIComponent(slug)}`;
export const bookPreviewPath = (slug: string) =>
  `/book-preview/${encodeURIComponent(slug)}`;

export const bookShareOrigin = createIsomorphicFn()
  .server(() => new URL(process.env.WEB_URL ?? getRequestUrl()).origin)
  .client(() => window.location.origin);
