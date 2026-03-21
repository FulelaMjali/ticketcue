# Phase 3 Implementation Plan — Real-Time & Push Notifications

Goal: Deliver Phase 3 from BACKEND_PLAN (server-side web push, updates feed) while keeping scope tight and compatible with existing Next.js App Router + Prisma setup.

## Scope (to build now)
1) Push subscriptions
- POST /api/push/subscribe: save endpoint + keys (p256dh, auth) for the logged-in user.
- Data model exists (PushSubscription in prisma schema). Use Prisma to upsert by userId + endpoint.

2) Server-side Web Push plumbing
- Add web-push config (VAPID keys via env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT).
- Utility to sendPush({ subscription, title, body, data?, tag? }).
- For now, trigger sendPush via a simple POST /api/push/test (auth required) that sends to all of the user’s subscriptions; later the worker will call the same util.

3) Event updates feed APIs
- GET /api/events/[id]/updates: list updates for an event (ordered desc).
- GET /api/updates/feed: personalized feed based on user’s reminders (events they track) ordered by timestamp desc.
- POST /api/events/[id]/updates (admin placeholder, auth required) to create an update (for manual testing). Keep minimal fields: type, title, description, priority, imageUrl?.

4) Seed/update data
- Update prisma/seed.ts to insert a few EventUpdate rows linked to existing events.

5) Frontend wiring (lightweight)
- Hook/use-updates.ts: fetch feed and per-event updates (client). Minimal loading/error state.
- Wire dashboard “Latest News” to feed API; wire event detail page updates section to API instead of mockUpdates.

## Out-of-scope (defer)
- BullMQ worker and scheduling.
- Email delivery.
- Push permission UX improvements beyond existing NotificationProvider.
- Admin role/authZ. For now, restrict POST updates to logged-in users only.

## Key touch points (files/endpoints)
- New routes: app/api/push/subscribe/route.ts, app/api/push/test/route.ts, app/api/events/[id]/updates/route.ts, app/api/updates/feed/route.ts.
- Lib: new lib/push.ts for web-push setup and send helper.
- Hooks: new hooks/use-updates.ts.
- Frontend: app/dashboard/page.tsx (Latest News), app/events/[id]/page.tsx updates section.
- Seed: prisma/seed.ts add EventUpdate seeds.

## Config/env
- Need env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g., mailto:support@example.com).
- Consider adding example placeholders to .env.example (if present) or README snippet.

## Risks/notes
- Edge vs Node: web-push requires Node runtime; ensure routes use runtime: 'nodejs' if needed.
- SQLite for dev is fine; prod should move to Postgres later.
- Auth dependency: all new routes require session; reuse auth() helper.
