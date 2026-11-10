import type {
  CommunityCalendarDto,
  CommunityEventDetailDto,
  CommunityEventSummaryDto,
  DataResponse,
  EventRsvpDto,
  LocationSuggestionDto,
  PageMeta,
} from "@starter/shared/types";
import type {
  CheckInRsvpInput,
  CreateCalendarInput,
  CreateEventInput,
  ListEventsInput,
  ListEventsQuery,
  ReportEventInput,
  RsvpEventInput,
  UpdateEventInput,
} from "@starter/shared/validators/community";
import { apiFetch } from "@/lib/api/client";

export type EventsListResponse = {
  data: CommunityEventSummaryDto[];
  meta: PageMeta;
};

export type LocationSuggestion = LocationSuggestionDto;

// ==========================================
// 1. Events API
// ==========================================

export function listEvents(params?: ListEventsInput, signal?: AbortSignal) {
  return apiFetch<EventsListResponse>("/api/events", {
    query: params as Record<string, string | number | boolean | undefined>,
    signal,
  });
}

export async function getEvent(slug: string, signal?: AbortSignal) {
  const { data } = await apiFetch<DataResponse<CommunityEventDetailDto>>(
    `/api/events/${encodeURIComponent(slug)}`,
    { signal },
  );
  return data;
}

export async function createEvent(input: CreateEventInput) {
  const { data } = await apiFetch<DataResponse<CommunityEventDetailDto>>(
    "/api/events",
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function rsvpEvent(slug: string, input: RsvpEventInput) {
  const { data } = await apiFetch<DataResponse<EventRsvpDto>>(
    `/api/events/${encodeURIComponent(slug)}/rsvp`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function cancelRsvp(slug: string) {
  const { data } = await apiFetch<DataResponse<{ success: boolean; message: string }>>(
    `/api/events/${encodeURIComponent(slug)}/rsvp`,
    {
      method: "DELETE",
    },
  );
  return data;
}

export async function updateEvent(slug: string, input: UpdateEventInput) {
  const { data } = await apiFetch<DataResponse<CommunityEventDetailDto>>(
    `/api/events/${encodeURIComponent(slug)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data;
}

export async function deleteEvent(slug: string) {
  const { data } = await apiFetch<DataResponse<{ success: boolean; message: string }>>(
    `/api/events/${encodeURIComponent(slug)}`,
    {
      method: "DELETE",
    },
  );
  return data;
}

export async function getEventAttendees(slug: string, signal?: AbortSignal) {
  const { data } = await apiFetch<DataResponse<EventRsvpDto[]>>(
    `/api/events/${encodeURIComponent(slug)}/attendees`,
    { signal },
  );
  return data;
}

export async function approveRsvp(slug: string, rsvpId: string) {
  const { data } = await apiFetch<DataResponse<EventRsvpDto>>(
    `/api/events/${encodeURIComponent(slug)}/rsvp/${encodeURIComponent(rsvpId)}/approve`,
    {
      method: "POST",
    },
  );
  return data;
}

export async function rejectRsvp(slug: string, rsvpId: string) {
  const { data } = await apiFetch<DataResponse<EventRsvpDto>>(
    `/api/events/${encodeURIComponent(slug)}/rsvp/${encodeURIComponent(rsvpId)}/reject`,
    {
      method: "POST",
    },
  );
  return data;
}

export async function checkInRsvp(slug: string, input: CheckInRsvpInput) {
  const { data } = await apiFetch<DataResponse<EventRsvpDto>>(
    `/api/events/${encodeURIComponent(slug)}/check-in`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function reportEvent(slug: string, input: ReportEventInput) {
  const { data } = await apiFetch<DataResponse<{ success: boolean }>>(
    `/api/events/${encodeURIComponent(slug)}/report`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

// ==========================================
// 2. Calendars API
// ==========================================

export async function listCalendars(signal?: AbortSignal) {
  const { data } = await apiFetch<DataResponse<CommunityCalendarDto[]>>(
    "/api/events/calendars",
    { signal },
  );
  return data;
}

export async function getCalendar(slug: string, signal?: AbortSignal) {
  const { data } = await apiFetch<DataResponse<CommunityCalendarDto>>(
    `/api/events/calendars/${encodeURIComponent(slug)}`,
    { signal },
  );
  return data;
}

export async function createCalendar(input: CreateCalendarInput) {
  const { data } = await apiFetch<DataResponse<CommunityCalendarDto>>(
    "/api/events/calendars",
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function toggleFollowCalendar(slug: string) {
  const { data } = await apiFetch<DataResponse<{ following: boolean }>>(
    `/api/events/calendars/${encodeURIComponent(slug)}/follow`,
    {
      method: "POST",
    },
  );
  return data;
}

export async function getLocationSuggestions(signal?: AbortSignal) {
  const { data } = await apiFetch<DataResponse<LocationSuggestion[]>>(
    "/api/events/locations/suggestions",
    { signal },
  );
  return data;
}
