import type {
  DataResponse,
  PageMeta,
  PrintEconomicsResult,
  ReadingSessionDto,
  ReadingTelemetrySummaryDto,
  ShelfItemDto,
} from "@starter/shared/types";
import type { UpsertShelfInput } from "@starter/shared/validators/community";
import type { SimulatePrintSchemaInput } from "@starter/shared/validators/publisher";
import type {
  CreateReadingSessionInput,
  ListReadingSessionsQuery,
} from "@starter/shared/validators/reading";
import { apiFetch } from "@/lib/api/client";

export type ReadingSessionsResponse = {
  data: ReadingSessionDto[];
  summary: ReadingTelemetrySummaryDto;
  meta: PageMeta;
};

export async function getUserShelves(signal?: AbortSignal) {
  const { data } = await apiFetch<DataResponse<ShelfItemDto[]>>(
    "/api/shelves",
    { signal },
  );
  return data;
}

export async function upsertShelf(input: UpsertShelfInput) {
  const { data } = await apiFetch<DataResponse<ShelfItemDto>>("/api/shelves", {
    method: "POST",
    body: input,
  });
  return data;
}

export function listReadingSessions(
  params?: ListReadingSessionsQuery,
  signal?: AbortSignal,
) {
  return apiFetch<ReadingSessionsResponse>("/api/reading-sessions", {
    query: params,
    signal,
  });
}

export async function createReadingSession(input: CreateReadingSessionInput) {
  const { data } = await apiFetch<DataResponse<ReadingSessionDto>>(
    "/api/reading-sessions",
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function simulatePrintEconomics(input: SimulatePrintSchemaInput) {
  const { data } = await apiFetch<DataResponse<PrintEconomicsResult>>(
    "/api/publisher/simulate",
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}
