import { queryOptions } from "@tanstack/react-query";
import type { ListEventsInput } from "@starter/shared/validators/community";
import {
  getCalendar,
  getCalendarMembers,
  getCommunityWallet,
  getEvent,
  getEventAttendees,
  getLocationSuggestions,
  listCalendars,
  listEvents,
} from "./api";

export const eventsKeys = {
  all: ["events"] as const,
  lists: () => [...eventsKeys.all, "list"] as const,
  list: (params?: ListEventsInput) =>
    [...eventsKeys.lists(), params ?? {}] as const,
  details: () => [...eventsKeys.all, "detail"] as const,
  detail: (slug: string) => [...eventsKeys.details(), slug] as const,
  attendees: (slug: string) => [...eventsKeys.all, "attendees", slug] as const,
  calendars: () => [...eventsKeys.all, "calendars"] as const,
  calendar: (slug: string) => [...eventsKeys.calendars(), slug] as const,
  calendarMembers: (slug: string) =>
    [...eventsKeys.calendars(), "members", slug] as const,
  wallet: (slug: string) => [...eventsKeys.calendars(), "wallet", slug] as const,
  locations: () => [...eventsKeys.all, "locations"] as const,
};

export function eventsQuery(params?: ListEventsInput) {
  return queryOptions({
    queryKey: eventsKeys.list(params),
    queryFn: ({ signal }) => listEvents(params, signal),
  });
}

export function eventAttendeesQuery(slug: string) {
  return queryOptions({
    queryKey: eventsKeys.attendees(slug),
    queryFn: ({ signal }) => getEventAttendees(slug, signal),
    enabled: Boolean(slug),
  });
}

export function eventDetailQuery(slug: string) {
  return queryOptions({
    queryKey: eventsKeys.detail(slug),
    queryFn: ({ signal }) => getEvent(slug, signal),
    enabled: Boolean(slug),
  });
}

export function calendarsQuery() {
  return queryOptions({
    queryKey: eventsKeys.calendars(),
    queryFn: ({ signal }) => listCalendars(signal),
  });
}

export function calendarDetailQuery(slug: string) {
  return queryOptions({
    queryKey: eventsKeys.calendar(slug),
    queryFn: ({ signal }) => getCalendar(slug, signal),
    enabled: Boolean(slug),
  });
}

export function calendarMembersQuery(slug: string) {
  return queryOptions({
    queryKey: eventsKeys.calendarMembers(slug),
    queryFn: ({ signal }) => getCalendarMembers(slug, signal),
    enabled: Boolean(slug),
  });
}

export function communityWalletQuery(slug: string) {
  return queryOptions({
    queryKey: eventsKeys.wallet(slug),
    queryFn: ({ signal }) => getCommunityWallet(slug, signal),
    enabled: Boolean(slug),
  });
}

export function locationSuggestionsQuery() {
  return queryOptions({
    queryKey: eventsKeys.locations(),
    queryFn: ({ signal }) => getLocationSuggestions(signal),
  });
}
