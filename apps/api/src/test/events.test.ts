import { describe, expect, it } from "vitest";
import { agent, originHeader, setRole, signUp } from "./helpers";
import { db } from "../db";
import { user } from "../db/schema";
import { eq } from "drizzle-orm";

describe("Community Calendars & Events API", () => {
  it("allows users to apply for a calendar and admins to verify it", async () => {
    const creator = agent();
    const creatorEmail = await signUp(creator, "Pegiat Komunitas");

    const calPayload = {
      name: "Klub Diskusi Senja",
      slug: "klub-diskusi-senja",
      type: "community",
      description: "Komunitas diskusi buku dan literasi alternatif senja.",
      city: "Jakarta Selatan",
    };

    const createRes = await creator
      .post("/api/events/calendars")
      .set(originHeader)
      .send(calPayload);

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.slug).toBe("klub-diskusi-senja");
    expect(createRes.body.data.verificationStatus).toBe("pending");

    // Admin verifies calendar
    const adminClient = agent();
    const adminEmail = await signUp(adminClient, "Admin Moderator");
    await setRole(adminEmail, "admin");

    const verifyRes = await adminClient
      .patch(`/api/events/calendars/${createRes.body.data.slug}/verify`)
      .set(originHeader)
      .send({ status: "verified" });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verificationStatus).toBe("verified");
  });

  it("creates an event with optional featuredWork (film) and enforces 1km pin limit", async () => {
    const hostClient = agent();
    const hostEmail = await signUp(hostClient, "Host Penulis");
    await setRole(hostEmail, "admin"); // admin can publish directly

    const calRes = await hostClient
      .post("/api/events/calendars")
      .set(originHeader)
      .send({
        name: "Sinema & Aksara",
        slug: "sinema-aksara",
        type: "community",
        description: "Diskusi adaptasi naskah.",
      });

    const calendarId = calRes.body.data.id;

    // Out of bounds pin (> 1km)
    const invalidPinRes = await hostClient
      .post("/api/events")
      .set(originHeader)
      .send({
        calendarId,
        title: "Bedah Naskah ke Film",
        description: "Sesi diskusi mendalam naskah skenario.",
        coverUrl: "https://example.com/banner.jpg",
        themePreset: "midnight_ink",
        visibility: "public",
        eventType: "film_discussion",
        format: "offline",
        venueName: "Perpustakaan Cikini",
        venueAddress: "Taman Ismail Marzuki",
        latitude: -6.2200,
        longitude: 106.8400,
        placeSourceLat: -6.1900,
        placeSourceLng: 106.8300, // >3 km away
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 90000000).toISOString(),
      });

    expect([400, 422]).toContain(invalidPinRes.status);

    // Valid event with featuredWork
    const validEventRes = await hostClient
      .post("/api/events")
      .set(originHeader)
      .send({
        calendarId,
        title: "Bedah Naskah ke Film: Laut Bercerita",
        description: "Sesi diskusi adaptasi naskah Leila Chudori ke layar sinema.",
        coverUrl: "https://example.com/banner.jpg",
        themePreset: "midnight_ink",
        visibility: "public",
        eventType: "film_discussion",
        format: "offline",
        district: "Kecamatan Menteng",
        city: "Jakarta Pusat",
        venueName: "Taman Ismail Marzuki",
        venueAddress: "Jl. Cikini Raya No.73",
        hideAddressUntilApproved: true,
        latitude: -6.1895,
        longitude: 106.8385,
        placeSourceLat: -6.1895,
        placeSourceLng: 106.8385,
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 93600000).toISOString(),
        featuredWork: {
          mediaType: "film",
          title: "Laut Bercerita",
          creator: "Pritagita Arianegara",
        },
        requiresApproval: true,
        capacity: 25,
      });

    expect(validEventRes.status).toBe(201);
    expect(validEventRes.body.data.slug).toContain("bedah-naskah-ke-film");
    expect(validEventRes.body.data.featuredWork?.mediaType).toBe("film");
  });

  it("masks exact venue address and meeting URL until approved (privacy gating)", async () => {
    const hostClient = agent();
    const hostEmail = await signUp(hostClient, "Host Komunitas Rahasia");
    await setRole(hostEmail, "admin");

    const calRes = await hostClient
      .post("/api/events/calendars")
      .set(originHeader)
      .send({
        name: "Ruang Rahasia",
        slug: `ruang-rahasia-${Date.now()}`,
      });

    const eventRes = await hostClient
      .post("/api/events")
      .set(originHeader)
      .send({
        calendarId: calRes.body.data.id,
        title: "Kumpul Diskusi Terbatas",
        description: "Sesi diskusi tertutup untuk anggota terpilih.",
        coverUrl: "https://example.com/banner.jpg",
        format: "offline",
        district: "Kecamatan Setiabudi",
        city: "Jakarta Selatan",
        venueName: "Menara Rajawali Lt. 12",
        venueAddress: "Jl. DR. Ide Anak Agung Gde Agung Lot 5.1",
        hideAddressUntilApproved: true,
        requiresApproval: true,
        latitude: -6.2284,
        longitude: 106.8353,
        startsAt: new Date(Date.now() + 100000000).toISOString(),
        endsAt: new Date(Date.now() + 110000000).toISOString(),
        capacity: 10,
      });

    const eventSlug = eventRes.body.data.slug;

    // Anonymous visitor
    const anonClient = agent();
    const anonDetail = await anonClient.get(`/api/events/${eventSlug}`);
    expect(anonDetail.status).toBe(200);
    expect(anonDetail.body.data.isAddressHidden).toBe(true);
    expect(anonDetail.body.data.venueName).toBeNull();
    expect(anonDetail.body.data.venueAddress).toBeNull();
    expect(anonDetail.body.data.district).toBe("Kecamatan Setiabudi");
    expect(anonDetail.body.data.city).toBe("Jakarta Selatan");

    // Regular attendee signs up & RSVPs
    const attendeeClient = agent();
    await signUp(attendeeClient, "Peserta Rahasia");

    const rsvpRes = await attendeeClient
      .post(`/api/events/${eventSlug}/rsvp`)
      .set(originHeader)
      .send({ note: "Saya ingin bergabung sesi ini." });

    expect(rsvpRes.status).toBe(201);
    expect(rsvpRes.body.data.status).toBe("pending_approval");

    // Detail while pending_approval still hides exact address
    const pendingDetail = await attendeeClient.get(`/api/events/${eventSlug}`);
    expect(pendingDetail.body.data.isAddressHidden).toBe(true);
    expect(pendingDetail.body.data.venueName).toBeNull();

    // Host approves attendee
    const approveRes = await hostClient
      .post(`/api/events/${eventSlug}/rsvp/${rsvpRes.body.data.id}/approve`)
      .set(originHeader)
      .send();

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe("going");

    // Detail once approved reveals exact venue address
    const approvedDetail = await attendeeClient.get(`/api/events/${eventSlug}`);
    expect(approvedDetail.body.data.isAddressHidden).toBe(false);
    expect(approvedDetail.body.data.venueName).toBe("Menara Rajawali Lt. 12");
    expect(approvedDetail.body.data.venueAddress).toContain("Gde Agung");
  });

  it("handles capacity waitlist and auto-promotes waitlisted user upon cancellation", async () => {
    const host = agent();
    const hostEmail = await signUp(host, "Host Kuota");
    await setRole(hostEmail, "admin");

    const calRes = await host
      .post("/api/events/calendars")
      .set(originHeader)
      .send({
        name: "Sesi Satu Kursi",
        slug: `sesi-satu-kursi-${Date.now()}`,
      });

    const eventRes = await host
      .post("/api/events")
      .set(originHeader)
      .send({
        calendarId: calRes.body.data.id,
        title: "Sesi Eksklusif 1 Kursi",
        description: "Hanya satu peserta yang dapat bergabung.",
        coverUrl: "https://example.com/banner.jpg",
        format: "online",
        onlineMeetingUrl: "https://meet.google.com/one-seat",
        startsAt: new Date(Date.now() + 200000000).toISOString(),
        endsAt: new Date(Date.now() + 210000000).toISOString(),
        capacity: 1,
        requiresApproval: false,
        allowWaitlist: true,
      });

    const slug = eventRes.body.data.slug;

    // First attendee: gets "going"
    const user1 = agent();
    await signUp(user1, "Peserta Pertama");
    const rsvp1 = await user1.post(`/api/events/${slug}/rsvp`).set(originHeader).send({});
    expect(rsvp1.status).toBe(201);
    expect(rsvp1.body.data.status).toBe("going");

    // Second attendee: gets "waitlisted"
    const user2 = agent();
    await signUp(user2, "Peserta Kedua");
    const rsvp2 = await user2.post(`/api/events/${slug}/rsvp`).set(originHeader).send({});
    expect(rsvp2.status).toBe(201);
    expect(rsvp2.body.data.status).toBe("waitlisted");

    // Check onlineMeetingUrl privacy: user1 gets it, user2 does not
    const detail1 = await user1.get(`/api/events/${slug}`);
    expect(detail1.body.data.onlineMeetingUrl).toBe("https://meet.google.com/one-seat");

    const detail2 = await user2.get(`/api/events/${slug}`);
    expect(detail2.body.data.onlineMeetingUrl).toBeNull();

    // User1 cancels -> user2 is automatically promoted to "going"
    const cancelRes = await user1.delete(`/api/events/${slug}/rsvp`).set(originHeader).send();
    expect(cancelRes.status).toBe(200);

    const detail2After = await user2.get(`/api/events/${slug}`);
    expect(detail2After.body.data.userRsvpStatus).toBe("going");
    expect(detail2After.body.data.onlineMeetingUrl).toBe("https://meet.google.com/one-seat");

    // Check-in user2 by checkinCode
    const checkInRes = await host
      .post(`/api/events/${slug}/check-in`)
      .set(originHeader)
      .send({ checkinCode: detail2After.body.data.userRsvp?.checkinCode });

    expect(checkInRes.status).toBe(200);
    expect(checkInRes.body.data.checkedInAt).toBeTruthy();
  });

  it("allows attendees to submit reports against an event", async () => {
    const host = agent();
    await signUp(host, "Host Report");

    const calRes = await host
      .post("/api/events/calendars")
      .set(originHeader)
      .send({
        name: "Kalender Report",
        slug: `kalender-report-${Date.now()}`,
      });

    const eventRes = await host
      .post("/api/events")
      .set(originHeader)
      .send({
        calendarId: calRes.body.data.id,
        title: "Acara Dicurigai",
        description: "Acara yang memuat konten tidak pantas.",
        coverUrl: "https://example.com/banner.jpg",
        format: "online",
        onlineMeetingUrl: "https://meet.google.com/report",
        startsAt: new Date(Date.now() + 300000000).toISOString(),
        endsAt: new Date(Date.now() + 310000000).toISOString(),
      });

    const reporter = agent();
    await signUp(reporter, "Pelapor Acara");

    const reportRes = await reporter
      .post(`/api/events/${eventRes.body.data.slug}/report`)
      .set(originHeader)
      .send({ reason: "Informasi acara menyesatkan dan berpotensi spam." });

    expect(reportRes.status).toBe(201);
    expect(reportRes.body.data.success).toBe(true);
  });

  it("distinguishes upcoming events from user registered events (filter=my_rsvps)", async () => {
    const host = agent();
    const hostEmail = await signUp(host, "Host Filter Test");
    await setRole(hostEmail, "admin");

    const calRes = await host
      .post("/api/events/calendars")
      .set(originHeader)
      .send({
        name: "Kalender Filter",
        slug: `kalender-filter-${Date.now()}`,
      });

    const calId = calRes.body.data.id;

    // Event 1
    const ev1Res = await host
      .post("/api/events")
      .set(originHeader)
      .send({
        calendarId: calId,
        title: "Acara Satu Terdaftar",
        description: "Deskripsi acara pertama.",
        coverUrl: "https://example.com/banner1.jpg",
        format: "online",
        onlineMeetingUrl: "https://meet.google.com/ev1",
        startsAt: new Date(Date.now() + 400000000).toISOString(),
        endsAt: new Date(Date.now() + 410000000).toISOString(),
      });

    // Event 2
    const ev2Res = await host
      .post("/api/events")
      .set(originHeader)
      .send({
        calendarId: calId,
        title: "Acara Dua Publik",
        description: "Deskripsi acara kedua.",
        coverUrl: "https://example.com/banner2.jpg",
        format: "online",
        onlineMeetingUrl: "https://meet.google.com/ev2",
        startsAt: new Date(Date.now() + 500000000).toISOString(),
        endsAt: new Date(Date.now() + 510000000).toISOString(),
      });

    const slug1 = ev1Res.body.data.slug;
    const slug2 = ev2Res.body.data.slug;

    // User A signs up and RSVPs ONLY to Event 1
    const userA = agent();
    await signUp(userA, "Peserta A");
    const rsvpA = await userA.post(`/api/events/${slug1}/rsvp`).set(originHeader).send({});
    expect(rsvpA.status).toBe(201);

    // User A checks upcoming: sees both
    const upcomingRes = await userA.get("/api/events?filter=upcoming");
    const upcomingSlugs = upcomingRes.body.data.map((e: any) => e.slug);
    expect(upcomingSlugs).toContain(slug1);
    expect(upcomingSlugs).toContain(slug2);

    // User A checks my_rsvps: sees ONLY Event 1
    const myRsvpsRes = await userA.get("/api/events?filter=my_rsvps");
    const myRsvpsSlugs = myRsvpsRes.body.data.map((e: any) => e.slug);
    expect(myRsvpsSlugs).toContain(slug1);
    expect(myRsvpsSlugs).not.toContain(slug2);
    expect(myRsvpsRes.body.data[0].userRsvpStatus).toBe("going");

    // User B (no RSVPs) checks my_rsvps: gets 0 events
    const userB = agent();
    await signUp(userB, "Peserta B");
    const userBRes = await userB.get("/api/events?filter=my_rsvps");
    expect(userBRes.body.data).toHaveLength(0);

    // Anonymous checks my_rsvps: gets 0 events
    const anon = agent();
    const anonRes = await anon.get("/api/events?filter=my_rsvps");
    expect(anonRes.body.data).toHaveLength(0);

    // User A cancels RSVP -> my_rsvps no longer contains Event 1
    await userA.delete(`/api/events/${slug1}/rsvp`).set(originHeader).send();
    const myRsvpsAfterCancel = await userA.get("/api/events?filter=my_rsvps");
    const afterCancelSlugs = myRsvpsAfterCancel.body.data.map((e: any) => e.slug);
    expect(afterCancelSlugs).not.toContain(slug1);
  });

  it("allows host to manage events: publish immediately, filter=hosting, update, attendees, and delete", async () => {
    const host = agent();
    await signUp(host, "Host Mandiri");

    // Host creates calendar
    const calRes = await host
      .post("/api/events/calendars")
      .set(originHeader)
      .send({
        name: "Klub Mandiri",
        slug: `klub-mandiri-${Date.now()}`,
      });
    expect(calRes.status).toBe(201);
    const calId = calRes.body.data.id;

    // Host creates event -> MUST be published immediately
    const evRes = await host
      .post("/api/events")
      .set(originHeader)
      .send({
        calendarId: calId,
        title: "Temu Komunitas Mandiri",
        description: "Diskusi pertama kami.",
        coverUrl: "https://example.com/banner-mandiri.jpg",
        format: "online",
        onlineMeetingUrl: "https://meet.google.com/mandiri",
        startsAt: new Date(Date.now() + 600000000).toISOString(),
        endsAt: new Date(Date.now() + 610000000).toISOString(),
        requiresApproval: true,
      });
    expect(evRes.status).toBe(201);
    expect(evRes.body.data.status).toBe("published");
    const slug = evRes.body.data.slug;

    // Check upcoming feed -> event is visible to everyone
    const upcomingRes = await host.get("/api/events?filter=upcoming");
    const upcomingSlugs = upcomingRes.body.data.map((e: any) => e.slug);
    expect(upcomingSlugs).toContain(slug);

    // Check hosting feed -> host sees it in hosting tab
    const hostingRes = await host.get("/api/events?filter=hosting");
    const hostingSlugs = hostingRes.body.data.map((e: any) => e.slug);
    expect(hostingSlugs).toContain(slug);
    expect(hostingRes.body.data[0].canManage).toBe(true);

    // Another user applies
    const attendee = agent();
    await signUp(attendee, "Calon Peserta");
    const rsvpRes = await attendee.post(`/api/events/${slug}/rsvp`).set(originHeader).send({});
    expect(rsvpRes.status).toBe(201);
    expect(rsvpRes.body.data.status).toBe("pending_approval");
    const rsvpId = rsvpRes.body.data.id;

    // Host views attendee list
    const attendeesRes = await host.get(`/api/events/${slug}/attendees`);
    expect(attendeesRes.status).toBe(200);
    expect(attendeesRes.body.data).toHaveLength(1);
    expect(attendeesRes.body.data[0].userName).toBe("Calon Peserta");

    // Host rejects attendee
    const rejectRes = await host
      .post(`/api/events/${slug}/rsvp/${rsvpId}/reject`)
      .set(originHeader)
      .send({});
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe("rejected");

    // Host updates event title
    const updateRes = await host
      .patch(`/api/events/${slug}`)
      .set(originHeader)
      .send({ title: "Temu Komunitas Mandiri - Edisi Revisi" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe("Temu Komunitas Mandiri - Edisi Revisi");

    // Host deletes event
    const delRes = await host.delete(`/api/events/${slug}`).set(originHeader).send();
    expect(delRes.status).toBe(200);

    // After deletion, event is gone
    const getRes = await host.get(`/api/events/${slug}`);
    expect(getRes.status).toBe(404);
  });
});
