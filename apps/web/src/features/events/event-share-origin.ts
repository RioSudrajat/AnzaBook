import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

export const eventPagePath = (slug: string) =>
  `/events/${encodeURIComponent(slug)}`;

export const eventPreviewPath = (slug: string) =>
  `/event-preview/${encodeURIComponent(slug)}`;

export const eventShareOrigin = createIsomorphicFn()
  .server(() => new URL(process.env.WEB_URL ?? getRequestUrl()).origin)
  .client(() => window.location.origin);
