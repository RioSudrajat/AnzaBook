import { Router } from "express";
import { z } from "zod";
import {
  checkInRsvpSchema,
  createCalendarSchema,
  createEventSchema,
  listEventsQuerySchema,
  reportEventSchema,
  rsvpEventSchema,
  updateCalendarSchema,
  updateEventSchema,
} from "@starter/shared/validators/community";
import { HttpError } from "../lib/http-error";
import {
  getAuth,
  optionalAuth,
  requireAuth,
  requirePermission,
} from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  approveRsvp,
  cancelRsvp,
  checkInRsvp,
  createCalendar,
  createEvent,
  deleteEvent,
  getCalendarBySlug,
  getCalendarMembers,
  getCommunityWallet,
  getEventAttendees,
  getEventBySlug,
  getLocationSuggestions,
  joinCalendar,
  leaveCalendar,
  listCalendars,
  listEvents,
  rejectRsvp,
  reportEvent,
  rsvpEvent,
  toggleFollowCalendar,
  updateCalendar,
  updateEvent,
  verifyCalendar,
} from "../services/events.service";

export const eventsRouter = Router();

// ==========================================
// 1. Calendar Hub Endpoints
// ==========================================

// List public calendars
eventsRouter.get("/calendars", optionalAuth, async (req, res) => {
  const calendars = await listCalendars(req.auth?.user.id);
  res.json({ data: calendars });
});

// Calendar detail by slug
eventsRouter.get("/calendars/:slug", optionalAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const calendar = await getCalendarBySlug(slug, req.auth?.user.id);
  if (!calendar) {
    throw new HttpError(404, "CALENDAR_NOT_FOUND", "Kalender komunitas tidak ditemukan.");
  }
  res.json({ data: calendar });
});

// Create new calendar (requires auth + trusted origin)
eventsRouter.post(
  "/calendars",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const input = createCalendarSchema.parse(req.body);
    const calendar = await createCalendar(getAuth(req).user.id, input);
    res.status(201).json({ data: calendar });
  },
);

// Update calendar profile (manager or admin)
eventsRouter.patch(
  "/calendars/:slug",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const slug = String(req.params.slug);
    const input = updateCalendarSchema.parse(req.body);
    const calendar = await updateCalendar(
      getAuth(req).user.id,
      slug,
      input,
      getAuth(req).user.role || undefined,
    );
    res.json({ data: calendar });
  },
);

// Verify calendar (admin only)
eventsRouter.patch(
  "/calendars/:slug/verify",
  requireAuth,
  requirePermission({ events: ["manage-any"] }),
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const slug = String(req.params.slug);
    const { status } = z
      .object({ status: z.enum(["verified", "trusted", "rejected"]) })
      .parse(req.body);
    const calendar = await verifyCalendar(slug, status);
    res.json({ data: calendar });
  },
);

// Follow / Unfollow calendar
eventsRouter.post(
  "/calendars/:slug/follow",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const slug = String(req.params.slug);
    const result = await toggleFollowCalendar(slug, getAuth(req).user.id);
    res.json({ data: result });
  },
);

// Join community calendar
eventsRouter.post(
  "/calendars/:slug/join",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const slug = String(req.params.slug);
    const result = await joinCalendar(getAuth(req).user.id, slug);
    res.json({ data: result });
  },
);

// Leave community calendar
eventsRouter.delete(
  "/calendars/:slug/leave",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const slug = String(req.params.slug);
    const result = await leaveCalendar(getAuth(req).user.id, slug);
    res.json({ data: result });
  },
);

// List community calendar members
eventsRouter.get("/calendars/:slug/members", optionalAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const members = await getCalendarMembers(slug);
  res.json({ data: members });
});

// Community Wallet balance and ledgers (Owner/Admin only)
eventsRouter.get("/calendars/:slug/wallet", requireAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const user = getAuth(req).user;
  const wallet = await getCommunityWallet(user.id, slug, user.role ?? undefined);
  res.json({ data: wallet });
});

// ==========================================
// 2. Location Suggestions (AnzaBook stores / popular spots)
// ==========================================
eventsRouter.get("/locations/suggestions", requireAuth, async (_req, res) => {
  const suggestions = await getLocationSuggestions();
  res.json({ data: suggestions });
});

// ==========================================
// 3. Event List & Creation
// ==========================================

// List events with filters & pagination
eventsRouter.get("/", optionalAuth, async (req, res) => {
  const query = listEventsQuerySchema.parse(req.query);
  const result = await listEvents(
    query,
    req.auth?.user.id,
    req.auth?.user.role ?? undefined,
  );
  res.json(result);
});

// Create event (host must be authorized for the calendar)
eventsRouter.post(
  "/",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const user = getAuth(req).user;
    const input = createEventSchema.parse(req.body);
    const event = await createEvent(user.id, user.role || "user", input);
    res.status(201).json({ data: event });
  },
);

// ==========================================
// 4. Single Event Details & Actions
// ==========================================

// Event detail with privacy masking based on viewer's relationship
eventsRouter.get("/:slug", optionalAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const event = await getEventBySlug(
    slug,
    req.auth?.user.id,
    req.auth?.user.role ?? undefined,
  );
  if (!event) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Acara tidak ditemukan.");
  }
  res.json({ data: event });
});

// Update event details (host only)
eventsRouter.patch(
  "/:slug",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const user = getAuth(req).user;
    const slug = String(req.params.slug);
    const input = updateEventSchema.parse(req.body);
    const updated = await updateEvent(slug, user.id, user.role || "user", input);
    res.json({ data: updated });
  },
);

// Delete event (host only)
eventsRouter.delete(
  "/:slug",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const user = getAuth(req).user;
    const slug = String(req.params.slug);
    const result = await deleteEvent(slug, user.id, user.role || "user");
    res.json({ data: result });
  },
);

// Get event attendees (host only)
eventsRouter.get(
  "/:slug/attendees",
  requireAuth,
  async (req, res) => {
    const user = getAuth(req).user;
    const slug = String(req.params.slug);
    const attendees = await getEventAttendees(
      slug,
      user.id,
      user.role || "user",
    );
    res.json({ data: attendees });
  },
);

// RSVP to an event
eventsRouter.post(
  "/:slug/rsvp",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const slug = String(req.params.slug);
    const input = rsvpEventSchema.parse(req.body);
    const rsvp = await rsvpEvent(slug, getAuth(req).user.id, input);
    res.status(201).json({ data: rsvp });
  },
);

// Cancel RSVP
eventsRouter.delete(
  "/:slug/rsvp",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const slug = String(req.params.slug);
    const result = await cancelRsvp(slug, getAuth(req).user.id);
    res.json({ data: result });
  },
);

// Host approves pending RSVP
eventsRouter.post(
  "/:slug/rsvp/:rsvpId/approve",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const user = getAuth(req).user;
    const slug = String(req.params.slug);
    const rsvpId = String(req.params.rsvpId);
    const rsvp = await approveRsvp(
      slug,
      rsvpId,
      user.id,
      user.role || "user",
    );
    res.json({ data: rsvp });
  },
);

// Host rejects pending RSVP
eventsRouter.post(
  "/:slug/rsvp/:rsvpId/reject",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const user = getAuth(req).user;
    const slug = String(req.params.slug);
    const rsvpId = String(req.params.rsvpId);
    const rsvp = await rejectRsvp(
      slug,
      rsvpId,
      user.id,
      user.role || "user",
    );
    res.json({ data: rsvp });
  },
);

// Check-in attendee at venue
eventsRouter.post(
  "/:slug/check-in",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const user = getAuth(req).user;
    const slug = String(req.params.slug);
    const input = checkInRsvpSchema.parse(req.body);
    const result = await checkInRsvp(
      slug,
      input,
      user.id,
      user.role || "user",
    );
    res.json({ data: result });
  },
);

// Report event
eventsRouter.post(
  "/:slug/report",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const slug = String(req.params.slug);
    const input = reportEventSchema.parse(req.body);
    const report = await reportEvent(slug, getAuth(req).user.id, input.reason);
    res.status(201).json({ data: report });
  },
);
