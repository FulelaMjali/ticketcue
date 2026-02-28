# TicketCue — Backend Build Plan

## What TicketCue Is

A ticket-sale reminder app. Users browse events, set reminders for when tickets go on sale, view a calendar, and get notified before sales open. The core value is: **don't miss the moment tickets drop**.

**Current state:** All data is hardcoded mock data. Reminders and event statuses live in `localStorage`. There is no auth, no real email, no real push from a server, and no persistent user data.

---

## Recommended Stack

Since the frontend is already **Next.js with TypeScript**, the natural choice is to keep it as a monolith using **Next.js API Routes (App Router)** backed by:

| Layer | Choice | Why |
|---|---|---|
| Database | PostgreSQL + Prisma | Typed schema maps directly to your existing `types/index.ts` models |
| Auth | NextAuth.js | Native Next.js integration, supports credentials + OAuth |
| Job Queue | BullMQ + Redis | Reliable scheduled jobs for reminder delivery — `setTimeout` on the client is not trustworthy |
| Email | Resend | Modern, developer-friendly, great TypeScript SDK |
| Web Push | `web-push` library | Server-side VAPID push to replace the current browser-only push |
| Deployment | Vercel (app) + Railway or Supabase (DB + Redis) | Aligns with Vercel Analytics already installed |

---

## Phased Plan

---

### Phase 1 — Foundation: Auth + Events API

**Features:** User registration/login, user sessions, Events read API

**Why this first:** Nothing else can exist without it. Reminders need a `userId`. The calendar and event pages need real data. Auth is the root dependency for everything downstream. Doing this first also lets you replace `'default-user'` and `mockEvents` in one clean sweep.

**What to build:**
- `POST /api/auth/register` and `POST /api/auth/login` via NextAuth
- User table: `id`, `name`, `email`, `hashedPassword`, `createdAt`
- `GET /api/events` — paginated, filterable by category, search, status
- `GET /api/events/[id]` — single event detail
- Seed the database with the existing mock events
- Wire the frontend to call the API instead of importing `mockEvents`

**Deliverable:** The app works exactly as it does now, but data comes from a real database and users can create an account and log in.

---

### Phase 2 — Reminders Engine (Server-Side)

**Features:** Reminders CRUD API, persistent reminder state, reminder list filtering UX (past + event type)

**Why this second:** This is the entire reason the app exists. `localStorage` reminders are fragile — they disappear if the user clears their browser, switches devices, or the tab is closed. Moving reminders to the server is what makes the product real. We are explicitly deferring email delivery in this phase, while still persisting reminder preferences and improving reminder list usability.

**What to build:**
- Reminder table: `id`, `userId`, `eventId`, `intervals` (JSON), `notificationMethods` (JSON), `status`, `createdAt`
- `POST /api/reminders` — create, persisted to DB
- `GET /api/reminders` — fetch all reminders for logged-in user
- `DELETE /api/reminders/[id]`
- `PATCH /api/reminders/[id]/status` — dismiss/complete
- `PATCH /api/reminders/[id]` — update reminder intervals/methods/status
- Replace `reminder-storage.ts` (localStorage) with API calls in reminder flows
- Reminders page controls to reduce list noise:
	- Hide/show past reminders
	- Filter reminders by event category (`concert`, `sports`, `festival`, etc.)
- Keep `notificationMethods.email` disabled in UI for now (deferred)

**Deferred from this phase:**
- BullMQ reminder scheduling worker
- Email delivery via Resend

**Deliverable:** Reminders survive browser refreshes and work across devices. Users can keep the reminders list focused by hiding past reminders and filtering by event type.

---

### Phase 3 — Real-Time & Push Notifications

**Features:** Server-side Web Push, notification history, real-time event updates feed

**Why this third:** Phase 2 handles email. This phase handles browser push properly — not from the client polling, but triggered by the server job queue the moment an interval fires. It also brings the "Event Updates" feed (currently `mockUpdates`) to life with real data. These two features are grouped because they share the same delivery infrastructure: the BullMQ worker dispatches both email and push in the same job.

**What to build:**
- Push subscription table: `id`, `userId`, `endpoint`, `keys` (p256dh, auth)
- `POST /api/push/subscribe` — save user's browser push subscription
- Server-side Web Push using the `web-push` library with VAPID keys — the reminder worker sends push at the same time it sends email
- EventUpdate table: `id`, `eventId`, `type`, `title`, `description`, `priority`, `timestamp`
- `GET /api/events/[id]/updates` — fetch updates for a specific event
- `GET /api/updates/feed` — personalized feed based on the user's reminders
- Admin endpoint or webhook to post new event updates (e.g. lineup change, weather alert)
- Wire the dashboard "Latest News" section to the real feed API

**Deliverable:** Push notifications actually fire from the server. The updates feed shows real, admin-posted content instead of hardcoded mock data.

---

### Phase 4 — User Event Statuses & Personalization

**Features:** Interested / Going / Tickets Secured tracking, user profile, preferences

**Why this fourth:** The type `EventUserStatus` is already defined in `types/index.ts` and `event-status-storage.ts` exists but stores in `localStorage`. At this stage auth is solid, reminders work, and now you can enrich the user's personal experience. This is also the phase where the dashboard becomes truly personalized rather than showing the same data to everyone.

**What to build:**
- EventUserStatus table: `userId`, `eventId`, `status` (interested/going/secured), `updatedAt`
- `PUT /api/events/[id]/status` — set the user's status for an event
- `GET /api/events/[id]/status` — get the user's status
- User preferences table: `userId`, `preferredCategories`, `emailNotifications`, `pushNotifications`
- `GET /api/user/profile` and `PATCH /api/user/profile`
- Wire dashboard stats (tickets secured, events this month) to real data
- Replace the hardcoded `"JD"` initials and `"Event enthusiast"` label on the dashboard with real user data

**Deliverable:** The dashboard is personal. Statuses persist across devices. User can set notification preferences.

---

### Phase 5 — External Event Ingestion & Discovery

**Features:** Ticketmaster / Songkick API sync, event admin panel, searchable events at scale

**Why this last:** Everything before this phase is internal data. Phase 5 is about growing the content. It's last because it's the most operationally complex (rate limiting, data normalization, deduplication) and the app needs to be solid end-to-end before you layer on an external data dependency. It also introduces an admin role, which requires auth (Phase 1) and a mature API surface.

**What to build:**
- Ticketmaster / Bandsintown API integration with a scheduled sync job (BullMQ cron)
- Event deduplication and normalization layer
- Admin role + `POST /api/admin/events`, `PATCH /api/admin/events/[id]`
- Full-text search using PostgreSQL `tsvector` or an Algolia index
- `GET /api/events/trending` — events with the most reminders set
- Webhook receiver for ticket sale status changes from external sources

**Deliverable:** The event catalog is real and automatically updated. Trending events surface organically based on what users are tracking.

---

## Summary

```
Phase 1 → Auth + Events API          (foundation everything depends on)
Phase 2 → Reminders Engine           (the core product value)
Phase 3 → Push + Updates Feed        (delivery + real-time content)
Phase 4 → User Statuses + Profile    (personalization)
Phase 5 → External Data Ingestion    (scale and content growth)
```

Each phase ships a working vertical slice. After Phase 2 you have a genuinely usable product. Phases 3–5 progressively make it stickier and scalable.
