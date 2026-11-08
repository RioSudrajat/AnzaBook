import { queryOptions } from "@tanstack/react-query";
import type { ListEventsQuery } from "@starter/shared/validators/community";
import {
  getCalendar,
  getEvent,
  getLocationSuggestions,
  listCalendars,
  listEvents,
} from "./api";

export const eventsKeys = {
  all: ["events"] as const,
  lists: () => [...eventsKeys.all, "list"] as const,
  list: (params?: ListEventsQuery) =>
    [...eventsKeys.lists(), params ?? {}] as const,
  details: () => [...eventsKeys.all, "detail"] as const,
  detail: (slug: string) => [...eventsKeys.details(), slug] as const,
  calendars: () => [...eventsKeys.all, "calendars"] as const,
  calendar: (slug: string) => [...eventsKeys.calendars(), slug] as const,
  locations: () => [...eventsKeys.all, "locations"] as const,
};

export function eventsQuery(params?: ListEventsQuery) {
  return queryOptions({
    queryKey: eventsKeys.list(params),
    queryFn: ({ signal }) => listEvents(params, signal),
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

export function locationSuggestionsQuery() {
  return queryOptions({
    queryKey: eventsKeys.locations(),
    queryFn: ({ signal }) => getLocationSuggestions(signal),
  });
}
