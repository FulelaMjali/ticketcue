# TicketCue — Social Features Implementation Plan

## Context

Phases 1–4 of the original backend plan are complete. Phase 5 (external event ingestion) has not started but is independent — it can be worked alongside or after the social features.

The social feature set introduces a dependency graph that dictates order:

```
Phase A: Friends System          ← foundation; everything social depends on this
Phase B: Event URL Import        ← independent; can ship anytime
Phase C: Friend Calendar Overlay ← depends on Phase A
Phase D: Social Notifications    ← depends on Phase A; uses existing push/email infra
Phase E: Group Calendars         ← depends on Phase A + C; the most complex piece
```

---

## Phase A — Friends System

**Why first:** Every social feature (visibility, notifications, groups) requires knowing who a user's friends are. This is the social graph layer and blocks everything else.

### Database

```prisma
model Friendship {
  id          String   @id @default(cuid())
  requesterId String
  addresseeId String
  status      String   // "pending" | "accepted" | "declined"
  color       String   // hex color assigned for calendar display
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  requester   User @relation("FriendshipRequester", fields: [requesterId], references: [id])
  addressee   User @relation("FriendshipAddressee", fields: [addresseeId], references: [id])

  @@unique([requesterId, addresseeId])
}
```

A color is assigned at request-send time from a fixed palette. The same color is used by both sides (each sees the other in that color).

### API routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/users/search?q=` | Search users by name or email |
| POST | `/api/friends/request` | Send a friend request |
| PATCH | `/api/friends/[id]/respond` | Accept or decline (body: `{ action: "accept" \| "decline" }`) |
| GET | `/api/friends` | List accepted friends |
| GET | `/api/friends/requests` | Pending incoming requests |
| DELETE | `/api/friends/[id]` | Remove a friend |

### Frontend

- Friends page at `/friends`
  - Tab: My Friends (list with remove option)
  - Tab: Requests (incoming pending requests with accept/decline)
- Search bar on the page to find and add new friends
- Notification badge on the Friends nav item when there are pending requests

### Deliverable

Users can find each other, send/accept friend requests, and manage their friends list.

---

## Phase B — Event Import via URL

**Why here:** This is fully independent of the social features and delivers immediate standalone value. It can be built in parallel with Phase A or shipped between A and C.

### API route

`POST /api/events/import-url`

```ts
// Request body
{ url: string }

// Response
{
  title?: string
  description?: string
  date?: string         // ISO
  venue?: string
  location?: string
  imageUrl?: string
  ticketSaleDate?: string
  priceRange?: string
  sourceUrl: string
  confidence: "high" | "partial" | "low"
}
```

### Extraction pipeline (server-side)

1. Validate URL (http/https only; block private IP ranges via allowlist/blocklist)
2. Fetch the page with a 10s timeout and a `User-Agent` header
3. Parse in order of reliability:
   - JSON-LD `<script type="application/ld+json">` — look for `@type: "Event"`
   - Open Graph meta tags (`og:title`, `og:description`, `og:image`, `event:start_time`, etc.)
   - Site-specific parsers for Ticketmaster, Eventbrite, Bandsintown, Songkick
4. Normalise dates to ISO 8601
5. Return parsed fields with a `confidence` indicator

### Security

- Server-side only — never expose the fetch to the browser directly
- Block `localhost`, `127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `169.254.x.x`
- Maximum response size: 2MB — abort larger fetches
- No following of redirects to private networks

### Frontend

- On the `/events/create` page, add a collapsible "Import from link" section at the top
- User pastes URL → hits "Fetch" → server parses → form fields populate
- User reviews and edits before saving
- Clear "Fetched from [domain]" label so the user knows what was imported
- Error state if the URL fails: "Couldn't read this page — please fill in the details manually"

### Deliverable

Users can paste a Ticketmaster/Eventbrite/etc. link and get the event form pre-filled.

---

## Phase C — Friend Calendar Overlay

**Why here:** Friends exist (Phase A). Now the core social value — seeing what your friends are up to — can be surfaced in the calendar. This is the feature that makes friendship useful day-to-day.

### Data requirements

No new tables needed. Requires:
- `Friendship` (Phase A)
- `EventUserStatus` (Phase 4 — already built)

### API routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/friends/events` | Returns friends' EventUserStatus entries for calendar rendering |

Query params: `startDate`, `endDate` — limit to the calendar's visible range.

Response shape:
```ts
[{
  friendId: string
  friendName: string
  friendColor: string       // from Friendship.color
  eventId: string
  status: "interested" | "going" | "tickets_secured"
  event: { id, title, date, venue, ... }
}]
```

### Frontend

- Calendar page fetches both the user's own events and `GET /api/friends/events`
- Friend events are rendered on the calendar with a colored dot/badge using `Friendship.color`
- Sidebar panel: "Friends" section with per-friend visibility toggles (checkbox + colored dot)
- Clicking a friend's event opens a read-only modal showing:
  - Event details
  - Friend's status (e.g. "Alex has tickets")
  - Button: "Set my own reminder" → opens the reminder flow
  - Button: "Set my status"
- Legend strip below or beside the calendar showing each friend's color

### Deliverable

The calendar shows friends' event activity color-coded by friend with per-friend toggle controls.

---

## Phase D — Social Notifications

**Why here:** Friends and their calendar activity exist. Now we wire up the notifications that make the social layer feel alive. This reuses the existing push/email delivery infrastructure from Phases 2–3.

### New table

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String                           // recipient
  type      String                           // see types below
  actorId   String                           // the user who triggered it
  eventId   String?
  groupId   String?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User  @relation(fields: [userId], references: [id])
  actor     User  @relation("NotificationActor", fields: [actorId], references: [id])
}
```

Notification types:
- `friend_request_received`
- `friend_request_accepted`
- `friend_event_added`
- `friend_tickets_secured`
- `friend_going`
- `group_event_added` *(used in Phase E)*
- `group_member_tickets_secured` *(used in Phase E)*

### API routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/notifications` | Paginated list for the current user |
| PATCH | `/api/notifications/[id]/read` | Mark one as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |

### Notification triggers

Notifications are created in the same API handler that changes the state:
- `POST /api/friends/request` → creates `friend_request_received` for the addressee
- `PATCH /api/friends/[id]/respond` (accept) → creates `friend_request_accepted` for the requester
- `PUT /api/events/[id]/status` → if the new status is `going` or `tickets_secured`, creates a notification for each of the user's friends
- `POST /api/events/create` (user-created event) → creates `friend_event_added` for each friend (if the event's visibility is not private)

Push and email delivery: insert the notification record, then enqueue a BullMQ job that calls the existing push/email delivery functions from Phase 3.

### Frontend

- Notification bell icon in the nav bar with an unread count badge
- Notification dropdown / panel listing recent notifications with timestamps
- Clicking a notification navigates to the relevant event or friend
- Profile settings: granular toggles for each social notification type (push / email / in-app)

### Deliverable

Users get in-app, push, and email notifications for friend activity without having to check the calendar manually.

---

## Phase E — Group Calendars

**Why last:** Groups are the most complex feature: new data model, new UI surface, group-scoped notification logic, and membership management. All prior phases must be solid before layering this on. Groups also benefit from the notification system (Phase D) being in place.

### New tables

```prisma
model Group {
  id        String   @id @default(cuid())
  name      String
  ownerId   String
  createdAt DateTime @default(now())

  owner     User              @relation(fields: [ownerId], references: [id])
  members   GroupMembership[]
  events    GroupEvent[]
}

model GroupMembership {
  id       String   @id @default(cuid())
  groupId  String
  userId   String
  role     String   // "owner" | "member"
  status   String   // "invited" | "active"
  joinedAt DateTime?

  group    Group @relation(fields: [groupId], references: [id])
  user     User  @relation(fields: [userId], references: [id])

  @@unique([groupId, userId])
}

model GroupEvent {
  id           String   @id @default(cuid())
  groupId      String
  eventId      String
  addedByUserId String
  addedAt      DateTime @default(now())

  group        Group @relation(fields: [groupId], references: [id])
  event        Event @relation(fields: [eventId], references: [id])
  addedBy      User  @relation(fields: [addedByUserId], references: [id])

  @@unique([groupId, eventId])
}
```

### API routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/groups` | Create a group |
| GET | `/api/groups` | List the user's groups |
| GET | `/api/groups/[id]` | Group detail + members + events |
| PATCH | `/api/groups/[id]` | Rename group (owner only) |
| DELETE | `/api/groups/[id]` | Delete group (owner only) |
| POST | `/api/groups/[id]/invite` | Invite a friend to the group |
| PATCH | `/api/groups/[id]/membership` | Accept/decline invitation |
| DELETE | `/api/groups/[id]/members/[userId]` | Remove member or leave group |
| POST | `/api/groups/[id]/events` | Add an event to the group |
| DELETE | `/api/groups/[id]/events/[eventId]` | Remove event from group |

### Frontend

- Groups list at `/groups` — card per group showing name, members, upcoming events
- Group detail at `/groups/[id]` — calendar view scoped to group events, member list
- "Add to group" option when creating/editing events (multi-select if user is in multiple groups)
- Group members shown with their assigned color; group calendar color-coded by member
- Invitation in the notification center and `/groups` page
- Group settings page (rename, manage members, delete)

### Deliverable

Users can create named groups with friends, add events specifically to those groups, and see a shared calendar view per group — fully separate from their personal event list.

---

## Implementation Order Summary

```
Phase A → Friends System             (social graph foundation)
Phase B → Event URL Import           (independent; high value; can ship alongside A)
Phase C → Friend Calendar Overlay    (depends on A; core social visibility)
Phase D → Social Notifications       (depends on A; uses existing push/email infra)
Phase E → Group Calendars            (depends on A + C + D; most complex)
```

Phases A and B can be built in parallel by splitting the work. Phases C, D, and E must follow A.

---

## Relation to Phase 5 (External Event Ingestion)

Phase 5 (Ticketmaster sync, admin panel, full-text search) remains independent. The event URL import in Phase B is a user-facing complement to it — Phase 5 bulk-imports events on a schedule, Phase B lets individual users bring in one-off events. They do not conflict and can be worked on in parallel.
