import { z } from "zod";

const returnPath =
  /^\/(?:app|notes|admin|membership(?:\/checkout\/[a-f0-9-]{36})?|(?:books|read)\/[a-z0-9-]{1,120}|(?:publishers|authors|communities)\/new|profile\/edit)$/;
const internalOrigin = "https://anzabook.invalid";

export function authDestination(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.length > 1024 ||
    /[\\\s]/.test(value)
  )
    return undefined;

  const url = new URL(value, internalOrigin);
  if (url.origin !== internalOrigin || !returnPath.test(url.pathname))
    return undefined;
  return url.pathname + url.search;
}

export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined).transform(authDestination),
  error: z.string().optional().catch(undefined),
});
