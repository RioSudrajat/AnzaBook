import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CheckInRsvpInput,
  CreateCalendarInput,
  CreateEventInput,
  ListEventsInput,
  ReportEventInput,
  RsvpEventInput,
  UpdateEventInput,
} from "@starter/shared/validators/community";
import {
  approveRsvp,
  cancelRsvp,
  checkInRsvp,
  createCalendar,
  createEvent,
  deleteEvent,
  getEventAttendees,
  rejectRsvp,
  reportEvent,
  rsvpEvent,
  toggleFollowCalendar,
  updateEvent,
} from "./api";
import {
  calendarDetailQuery,
  calendarsQuery,
  eventAttendeesQuery,
  eventDetailQuery,
  eventsKeys,
  eventsQuery,
  locationSuggestionsQuery,
} from "./queries";

export function useEvents(params?: ListEventsInput) {
  return useQuery(eventsQuery(params));
}

export function useEvent(slug: string) {
  return useQuery(eventDetailQuery(slug));
}

export const useEventDetail = useEvent;

export function useCalendars() {
  return useQuery(calendarsQuery());
}

export function useCalendar(slug: string) {
  return useQuery(calendarDetailQuery(slug));
}

export function useLocationSuggestions() {
  return useQuery(locationSuggestionsQuery());
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(input),
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      return newEvent;
    },
  });
}

export function useRsvpEvent(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RsvpEventInput) => rsvpEvent(slug, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(slug) });
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() });
    },
  });
}

export function useCancelRsvp(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelRsvp(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(slug) });
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() });
    },
  });
}

export function useEventAttendees(slug: string) {
  return useQuery(eventAttendeesQuery(slug));
}

export function useUpdateEvent(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEventInput) => updateEvent(slug, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(slug) });
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() });
      return updated;
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => deleteEvent(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
    },
  });
}

export function useApproveRsvp(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rsvpId: string) => approveRsvp(slug, rsvpId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(slug) });
      queryClient.invalidateQueries({ queryKey: eventsKeys.attendees(slug) });
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() });
    },
  });
}

export function useRejectRsvp(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rsvpId: string) => rejectRsvp(slug, rsvpId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(slug) });
      queryClient.invalidateQueries({ queryKey: eventsKeys.attendees(slug) });
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() });
    },
  });
}

export function useCheckInRsvp(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckInRsvpInput) => checkInRsvp(slug, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(slug) });
      queryClient.invalidateQueries({ queryKey: eventsKeys.attendees(slug) });
    },
  });
}

export function useReportEvent(slug: string) {
  return useMutation({
    mutationFn: (input: ReportEventInput) => reportEvent(slug, input),
  });
}

export function useCreateCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarInput) => createCalendar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.calendars() });
    },
  });
}

export function useToggleFollowCalendar(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => toggleFollowCalendar(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.calendar(slug) });
      queryClient.invalidateQueries({ queryKey: eventsKeys.calendars() });
    },
  });
}
