# TicketCue — Social Features Technical Specification

**Audience:** Dev team
**Status:** Ready for implementation
**Prerequisites:** Phases 1–4 complete (auth, reminders, push notifications, event statuses, user profile)

---

## 0. Codebase conventions to follow

Before writing any code, be familiar with how the existing codebase works:

| Pattern | How it's done |
|---|---|
| Auth check | `const session = await auth()` from `@/lib/auth`, then `prisma.user.findUnique({ where: { email: session.user.email } })` |
| Input validation | Zod schema defined at the top of the route file, `schema.parse(body)` throws and is caught in the catch block |
| JSON fields in DB | SQLite has no JSON type — store as `String`, call `JSON.stringify()` on write and `JSON.parse()` on read |
| Date fields in responses | Always serialize as `.toISOString()` strings; the hook layer converts them back to `Date` objects |
| Error responses | `{ error: string }` — never expose stack traces |
| Protected routes | Add new API paths to the `authorized` callback in `lib/auth.ts` |
| New hooks | Follow the `useState` + `useEffect` + `fetch` pattern in `hooks/use-events.ts` |
| Push delivery | `sendPush()` from `lib/push.ts` — already wired to VAPID |

### Shared utility to add first

The `getCurrentUserId()` helper is copy-pasted in several route files. Extract it once before starting:

**`lib/get-current-user-id.ts`**
```ts
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma-client';

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return user?.id ?? null;
}
```

Use this in every new route instead of duplicating the pattern.

---

## 1. Database schema additions

Add the following models to `prisma/schema.prisma`. Run `npx prisma migrate dev --name <migration-name>` after each phase or batch them if adding multiple models at once.

### 1.1 Friendship

```prisma
model Friendship {
  id          String   @id @default(cuid())
  requesterId String
  addresseeId String
  status      String   // "pending" | "accepted" | "declined"
  color       String   // hex color string e.g. "#e05c5c" — assigned at request time
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  requester User @relation("FriendshipRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  addressee User @relation("FriendshipAddressee", fields: [addresseeId], references: [id], onDelete: Cascade)

  @@unique([requesterId, addresseeId])
  @@map("friendships")
  @@index([requesterId])
  @@index([addresseeId])
}
```

Add to the `User` model:
```prisma
sentFriendRequests     Friendship[] @relation("FriendshipRequester")
receivedFriendRequests Friendship[] @relation("FriendshipAddressee")
notifications          Notification[]
actorNotifications     Notification[] @relation("NotificationActor")
groupMemberships       GroupMembership[]
groupEventsAdded       GroupEvent[]
```

**Color palette** — assign from this fixed list in order of first available, cycling if exhausted:
```ts
const FRIEND_COLORS = [
  '#e05c5c', '#e08c3c', '#d4c43c', '#5cb85c',
  '#3ca8d4', '#7b5cd4', '#d45cb8', '#5cd4c4',
];
```

Store which color was assigned per friendship. Since both rows of the relationship share one record, both users see each other in the same color.

---

### 1.2 Notification

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String   // recipient
  type      String   // see NotificationType below
  actorId   String   // the user who triggered it
  eventId   String?
  groupId   String?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  actor User  @relation("NotificationActor", fields: [actorId], references: [id], onDelete: Cascade)

  @@map("notifications")
  @@index([userId, read])
  @@index([userId, createdAt])
}
```

---

### 1.3 Group and GroupMembership

```prisma
model Group {
  id        String   @id @default(cuid())
  name      String
  ownerId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner   User              @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members GroupMembership[]
  events  GroupEvent[]

  @@map("groups")
  @@index([ownerId])
}

model GroupMembership {
  id       String    @id @default(cuid())
  groupId  String
  userId   String
  role     String    // "owner" | "member"
  status   String    // "invited" | "active"
  joinedAt DateTime?

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
  @@map("group_memberships")
  @@index([groupId])
  @@index([userId])
}

model GroupEvent {
  id            String   @id @default(cuid())
  groupId       String
  eventId       String
  addedByUserId String
  addedAt       DateTime @default(now())

  group   Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  event   Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  addedBy User  @relation(fields: [addedByUserId], references: [id], onDelete: Cascade)

  @@unique([groupId, eventId])
  @@map("group_events")
  @@index([groupId])
}
```

Add to the `Event` model:
```prisma
groupEvents GroupEvent[]
```

---

## 2. TypeScript type additions

Append to `types/index.ts`:

```ts
// ─── Social ──────────────────────────────────────────────────────────────────

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface Friend {
  id: string;           // friendship record id
  userId: string;       // the other person's user id
  name: string | null;
  email: string;
  color: string;        // hex color for calendar display
  status: FriendshipStatus;
  createdAt: Date;
}

export type NotificationType =
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'friend_event_added'
  | 'friend_going'
  | 'friend_tickets_secured'
  | 'group_event_added'
  | 'group_member_tickets_secured';

export interface AppNotification {
  id: string;
  type: NotificationType;
  actorId: string;
  actorName: string | null;
  eventId?: string;
  eventTitle?: string;
  groupId?: string;
  groupName?: string;
  read: boolean;
  createdAt: Date;
}

export interface FriendEventEntry {
  friendId: string;       // the friend's user id
  friendName: string | null;
  friendColor: string;
  eventId: string;
  status: 'interested' | 'going' | 'secured';
  event: Event;
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export type GroupMemberRole = 'owner' | 'member';
export type GroupMemberStatus = 'invited' | 'active';

export interface GroupMember {
  userId: string;
  name: string | null;
  email: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  color: string;      // friendship color, for calendar display within the group
  joinedAt: Date | null;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: GroupMember[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Event URL Import ─────────────────────────────────────────────────────────

export type ImportConfidence = 'high' | 'partial' | 'low';

export interface ImportedEventData {
  title?: string;
  description?: string;
  date?: string;          // ISO string
  venue?: string;
  location?: string;
  imageUrl?: string;
  ticketSaleDate?: string;
  ticketUrl?: string;
  priceRange?: string;
  sourceUrl: string;
  confidence: ImportConfidence;
}
```

---

## 3. Phase A — Friends system

### 3.1 API routes

#### `GET /api/users/search`

Search for users to add as friends.

**Auth:** Required
**Query params:** `q` (string, min 2 chars)
**Response `200`:**
```ts
{
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  }>
}
```

**Logic:**
1. Get current userId.
2. Search `users` where `name LIKE %q%` OR `email LIKE %q%`, exclude the current user, limit 20.
3. For each result, look up any `Friendship` record where `(requesterId = me AND addresseeId = result)` OR `(requesterId = result AND addresseeId = me)`.
4. Map to `friendshipStatus` based on the record's `status` and which side the current user is on.

> Note: `LIKE` is case-insensitive in SQLite by default for ASCII. This is sufficient for now.

---

#### `POST /api/friends/request`

Send a friend request.

**Auth:** Required
**Body:**
```ts
{ addresseeId: string }
```
**Zod schema:**
```ts
z.object({ addresseeId: z.string().cuid() })
```
**Response `201`:** `{ friendship: { id, status, color, createdAt } }`
**Errors:**
- `400` — cannot send request to yourself
- `404` — user not found
- `409` — friendship already exists (any status)

**Logic:**
1. Validate addresseeId exists in the `users` table.
2. Check no existing `Friendship` with `[requesterId=me, addresseeId]` or `[requesterId=addresseeId, addresseeId=me]`.
3. Pick the next available color from `FRIEND_COLORS` by checking which colors are already in use across all of the current user's `Friendship` records.
4. Create the `Friendship` with `status: 'pending'`.
5. Call `createNotification({ userId: addresseeId, type: 'friend_request_received', actorId: me })` (see §5.1).

---

#### `PATCH /api/friends/[id]/respond`

Accept or decline a pending friend request.

**Auth:** Required — must be the `addresseeId` of the friendship
**Body:**
```ts
{ action: 'accept' | 'decline' }
```
**Zod schema:**
```ts
z.object({ action: z.enum(['accept', 'decline']) })
```
**Response `200`:** `{ friendship: { id, status } }`
**Errors:**
- `403` — current user is not the addressee
- `404` — friendship not found
- `409` — friendship is not in `pending` state

**Logic (accept):**
1. Update `Friendship.status` to `'accepted'`.
2. Call `createNotification({ userId: friendship.requesterId, type: 'friend_request_accepted', actorId: me })`.

**Logic (decline):**
1. Update `Friendship.status` to `'declined'`.
2. No notification sent.

---

#### `GET /api/friends`

List all accepted friends.

**Auth:** Required
**Response `200`:**
```ts
{ friends: Friend[] }
```

**Logic:**
- Find all `Friendship` records where `(requesterId = me OR addresseeId = me) AND status = 'accepted'`.
- For each, include the other user's `id`, `name`, `email`, and the friendship's `color`, `id`, `createdAt`.

---

#### `GET /api/friends/requests`

List pending incoming friend requests.

**Auth:** Required
**Response `200`:**
```ts
{
  requests: Array<{
    id: string;       // friendship id
    requester: { id: string; name: string | null; email: string };
    createdAt: string;
  }>
}
```

**Logic:** Find `Friendship` where `addresseeId = me AND status = 'pending'`, include `requester` user data.

---

#### `DELETE /api/friends/[id]`

Remove a friend (delete the `Friendship` record).

**Auth:** Required — must be either party of the friendship
**Response `200`:** `{ success: true }`
**Errors:** `403` if current user is not a party, `404` if not found.

---

### 3.2 Protected routes update

Add to the `authorized` callback in `lib/auth.ts`:
```ts
request.nextUrl.pathname.startsWith('/api/friends') ||
request.nextUrl.pathname.startsWith('/api/users/search') ||
request.nextUrl.pathname.startsWith('/groups')
```

---

### 3.3 Frontend

**New page: `app/friends/page.tsx`**

Two-tab layout:

- **My Friends tab** — list of accepted friends (name, initials avatar in their friendship color, email). Each row has a "Remove" button with a confirmation dialog.
- **Requests tab** — list of pending incoming requests with Accept / Decline buttons. Show a count badge on the tab label.

At the top of the page, a search input (min 2 chars, debounced 300ms) calls `GET /api/users/search`. Results show the user and a button that changes based on `friendshipStatus`:
- `none` → "Add Friend" → calls `POST /api/friends/request`
- `pending_sent` → "Request sent" (disabled)
- `pending_received` → "Accept" → calls `PATCH /api/friends/[id]/respond`
- `accepted` → "Friends" (disabled)

**New hook: `hooks/use-friends.ts`**

```ts
useFriends()        // GET /api/friends → { friends, loading, error, refetch }
useFriendRequests() // GET /api/friends/requests → { requests, loading, error, refetch }
```

**Nav update:** Add "Friends" item to the sidebar nav (desktop) and mobile nav. Show a red dot badge when `useFriendRequests()` returns a non-empty list.

---

## 4. Phase B — Event URL import

### 4.1 API route

#### `POST /api/events/import-url`

**Auth:** Required
**Body:**
```ts
{ url: string }
```
**Zod schema:**
```ts
z.object({
  url: z.string().url().refine(
    (u) => /^https?:\/\//.test(u),
    'Only http/https URLs are allowed'
  ),
})
```
**Response `200`:** `ImportedEventData`
**Errors:**
- `400` — invalid URL or private IP range detected
- `422` — fetch succeeded but no usable event data found
- `502` — upstream URL unreachable or returned non-200

**Implementation: `lib/event-importer/`**

Create the following files:

**`lib/event-importer/index.ts`** — orchestrator:
```ts
export async function importEventFromUrl(url: string): Promise<ImportedEventData>
```

Steps:
1. Call `validateUrl(url)` — throw if it resolves to a private IP range.
2. `fetch(url, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'TicketCue/1.0' } })`.
3. Check response size header — if `Content-Length > 2_000_000` abort.
4. Parse response text through the extraction pipeline in order:
   a. `extractJsonLd(html)` — parse `<script type="application/ld+json">`, look for `@type: 'Event'`
   b. `extractOpenGraph(html)` — parse `<meta property="og:*">` tags
   c. `extractSiteSpecific(url, html)` — site-specific parser dispatch
5. Merge results, earlier steps take priority.
6. Return with a `confidence` value:
   - `'high'` — JSON-LD `Event` found with title + date
   - `'partial'` — some fields found via OG or site parser, but incomplete
   - `'low'` — only title or description found

**`lib/event-importer/validate-url.ts`**

Block the following before making the fetch:
```ts
const BLOCKED_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^localhost$/i,
];
```
Resolve the hostname with `dns.lookup` and check the resolved IP against the list.

**`lib/event-importer/parsers/jsonld.ts`**

Find all `<script type="application/ld+json">` blocks, `JSON.parse()` each, look for `@type === 'Event'` or an array containing one. Map fields:

| JSON-LD field | TicketCue field |
|---|---|
| `name` | `title` |
| `description` | `description` |
| `startDate` | `date` |
| `location.name` | `venue` |
| `location.address.addressLocality` + `addressRegion` | `location` |
| `image` | `imageUrl` |
| `offers.url` | `ticketUrl` |
| `offers.price` + `offers.priceCurrency` | `priceRange` |

**`lib/event-importer/parsers/opengraph.ts`**

Parse `<meta property="og:*">` and `<meta name="*">` tags. Map:

| Meta tag | TicketCue field |
|---|---|
| `og:title` | `title` |
| `og:description` | `description` |
| `og:image` | `imageUrl` |
| `event:start_time` | `date` |
| `og:url` | source confirmation |

**`lib/event-importer/parsers/sites.ts`**

Dispatch by hostname. Each site parser is a function `(url: string, html: string) => Partial<ImportedEventData>`.

| Hostname | Fields to target |
|---|---|
| `ticketmaster.com` | `<h1>` for title, `<time>` for date, structured breadcrumbs for venue |
| `eventbrite.com` | `<script id="__NEXT_DATA__">` JSON payload — parse `props.pageProps.event` |
| `bandsintown.com` | `<script id="__NEXT_DATA__">` — parse event data from Next.js payload |
| `songkick.com` | JSON-LD is usually present; fallback to `.event-header` selectors |

Use a lightweight HTML parser. The recommended approach is `node-html-parser` (no dependencies on jsdom). Add it: `pnpm add node-html-parser`.

---

### 4.2 Frontend

**Update `app/events/create/page.tsx`**

Add a collapsible "Import from link" panel above the form:

```
┌─ Import from a link ──────────────────────────────────┐
│  [https://...                              ] [Fetch]   │
│  ✓ Fetched from ticketmaster.com                       │
└───────────────────────────────────────────────────────┘
```

- On "Fetch", call `POST /api/events/import-url`.
- On success: populate form fields using `form.setValue()` (react-hook-form).
- Show which fields were filled and which need manual completion (use `confidence` to guide the message).
- On error: show the error string. The form remains editable regardless.
- The user always submits the form manually — no auto-save.

**New hook: `hooks/use-event-import.ts`**

```ts
function useEventImport(): {
  importUrl: (url: string) => Promise<ImportedEventData>;
  loading: boolean;
  error: string | null;
}
```

---

## 5. Phase C — Friend calendar overlay

### 5.1 API route

#### `GET /api/friends/events`

Returns friends' event statuses for calendar rendering.

**Auth:** Required
**Query params:**
- `startDate` — ISO date string (required)
- `endDate` — ISO date string (required)

**Response `200`:**
```ts
{
  entries: Array<{
    friendId: string;
    friendName: string | null;
    friendColor: string;
    eventId: string;
    status: string;
    event: {
      id: string;
      title: string;
      date: string;    // ISO
      venue: string;
      location: string;
      category: string;
      imageUrl: string;
    };
  }>
}
```

**Logic:**
1. Get current user's accepted friends (via `Friendship` table).
2. Get their `EventUserStatus` records where the linked `Event.date` falls between `startDate` and `endDate`.
3. Join friendship `color` onto each entry.
4. Do not return entries for friends with `activityPrivate: true` in their `UserPreferences` (see §5.2).

**Query (Prisma):**
```ts
prisma.eventUserStatus.findMany({
  where: {
    userId: { in: friendIds },
    event: {
      date: { gte: new Date(startDate), lte: new Date(endDate) },
    },
  },
  include: {
    event: {
      select: { id: true, title: true, date: true, venue: true, location: true, category: true, imageUrl: true },
    },
  },
})
```

---

### 5.2 UserPreferences update

Add an `activityPrivate` field to `UserPreferences` in the schema:
```prisma
activityPrivate Boolean @default(false)
```

Expose it in `GET /api/user/profile` and allow toggling via `PATCH /api/user/profile`. Add to the profile settings page under a "Privacy" section: "Hide my event activity from friends".

---

### 5.3 Frontend — calendar overlay

**Update `app/calendar/page.tsx`** (or the calendar component it uses):

1. Fetch friend events alongside the user's own events:
   ```ts
   const { entries: friendEntries } = useFriendCalendarEvents(startDate, endDate);
   ```
2. Render friend events on the calendar with a colored left-border or dot using the `friendColor` from the entry.
3. Add a "Friends" section in the calendar sidebar filter panel. Each friend gets a row with:
   - A colored dot (their `friendColor`)
   - Their name
   - A checkbox to toggle visibility (default: visible)
   - Store toggle state in `useState` — no persistence needed.
4. Clicking a friend's event opens a read-only modal (new component `FriendEventModal`):
   - Event image, title, date, venue
   - "{Friend name} is {status}" badge
   - "Set my reminder" button → opens the existing reminder creation flow
   - "Set my status" button → calls `PUT /api/events/[id]/status`

**New hook: `hooks/use-friend-calendar-events.ts`**
```ts
function useFriendCalendarEvents(startDate: string, endDate: string): {
  entries: FriendEventEntry[];
  loading: boolean;
  error: Error | null;
}
```
Calls `GET /api/friends/events?startDate=...&endDate=...`. Re-fetches when the calendar month changes.

---

## 6. Phase D — Social notifications

### 6.1 Notification creation utility

Create `lib/create-notification.ts`:

```ts
import { prisma } from '@/lib/prisma-client';
import { sendPush } from '@/lib/push';
import { NotificationType } from '@/types';

interface CreateNotificationParams {
  userId: string;       // recipient
  type: NotificationType;
  actorId: string;
  eventId?: string;
  groupId?: string;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  // 1. Write the in-app notification record
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      actorId: params.actorId,
      eventId: params.eventId ?? null,
      groupId: params.groupId ?? null,
    },
  });

  // 2. Check recipient's push preference
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: params.userId },
    select: { pushNotifications: true },
  });

  if (!prefs?.pushNotifications) return;

  // 3. Fetch push subscriptions and deliver
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: params.userId },
  });

  const actor = await prisma.user.findUnique({
    where: { id: params.actorId },
    select: { name: true },
  });

  const { title, body } = buildNotificationText(params.type, actor?.name ?? 'Someone');

  await Promise.allSettled(
    subscriptions.map((sub) =>
      sendPush({
        subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keyP256dh, auth: sub.keyAuth } },
        title,
        body,
        tag: `social-${params.type}`,
        data: { eventId: params.eventId, groupId: params.groupId },
      })
    )
  );
}

function buildNotificationText(type: NotificationType, actorName: string): { title: string; body: string } {
  switch (type) {
    case 'friend_request_received':
      return { title: 'New friend request', body: `${actorName} wants to connect` };
    case 'friend_request_accepted':
      return { title: 'Friend request accepted', body: `${actorName} accepted your request` };
    case 'friend_event_added':
      return { title: 'New event from a friend', body: `${actorName} added an event` };
    case 'friend_going':
      return { title: 'Friend is going', body: `${actorName} is going to an event` };
    case 'friend_tickets_secured':
      return { title: 'Friend got tickets!', body: `${actorName} secured tickets` };
    case 'group_event_added':
      return { title: 'New group event', body: `${actorName} added an event to your group` };
    case 'group_member_tickets_secured':
      return { title: 'Group member got tickets!', body: `${actorName} secured tickets` };
  }
}
```

**Important:** `createNotification` must never throw in a way that breaks the calling route. Wrap the entire function body in a try/catch and log errors — a notification failure must not fail the primary action.

---

### 6.2 Trigger points

Wire `createNotification` into existing and new routes:

| Route | Trigger | Recipients |
|---|---|---|
| `POST /api/friends/request` | After creating Friendship | `addresseeId` — type `friend_request_received` |
| `PATCH /api/friends/[id]/respond` (accept) | After updating status | `requesterId` — type `friend_request_accepted` |
| `PUT /api/events/[id]/status` | If new status is `going` | All accepted friends — type `friend_going` |
| `PUT /api/events/[id]/status` | If new status is `secured` | All accepted friends — type `friend_tickets_secured` |
| `POST /api/events/create` | After event creation, if not private | All accepted friends — type `friend_event_added` |
| `POST /api/groups/[id]/events` | After adding event to group | All active group members except adder — type `group_event_added` |
| `PUT /api/events/[id]/status` (in a group context) | If `secured` and user is in groups | Active group members of any shared group — type `group_member_tickets_secured` |

For the status trigger, look up accepted friends in bulk:
```ts
const friendships = await prisma.friendship.findMany({
  where: {
    status: 'accepted',
    OR: [{ requesterId: userId }, { addresseeId: userId }],
  },
  select: { requesterId: true, addresseeId: true },
});
const friendIds = friendships.map(f => f.requesterId === userId ? f.addresseeId : f.requesterId);

await Promise.allSettled(
  friendIds.map(friendId =>
    createNotification({ userId: friendId, type: 'friend_tickets_secured', actorId: userId, eventId })
  )
);
```

---

### 6.3 Notification API routes

#### `GET /api/notifications`

**Auth:** Required
**Query params:** `page` (default 1), `limit` (default 20), `unreadOnly` (boolean)
**Response `200`:**
```ts
{
  notifications: AppNotification[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; pages: number };
}
```

**Logic:**
- Query `Notification` where `userId = me`, ordered by `createdAt DESC`.
- Include `actor` (select `id`, `name`) and optionally join `Event` (select `title`) and `Group` (select `name`).

---

#### `PATCH /api/notifications/[id]/read`

**Auth:** Required — must own the notification
**Response `200`:** `{ success: true }`

---

#### `PATCH /api/notifications/read-all`

**Auth:** Required
**Response `200`:** `{ count: number }` — number of notifications marked read

---

### 6.4 Frontend

**Notification bell component** (add to the desktop and mobile nav bars):

- Shows a red badge with unread count when `unreadCount > 0`.
- Clicking opens a dropdown panel (use a Radix `Popover` or `Sheet` on mobile).
- Panel lists the 20 most recent notifications with relative timestamps (`2 hours ago`).
- Each notification has an icon by type (friend icon, ticket icon, group icon).
- Clicking a notification marks it read and navigates to the relevant event or group.
- "Mark all as read" button at the top of the panel.

**New hook: `hooks/use-notifications.ts`**
```ts
function useNotifications(): {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}
```

Poll `GET /api/notifications` every 30 seconds while the tab is focused (`document.visibilityState === 'visible'`). Do not use websockets — polling is sufficient for now.

**UserPreferences update** — add to the profile settings page under a new "Notifications — Social" section:

- Toggle: "Notify me when a friend gets tickets" (maps to a new `notifySocialTickets: Boolean` field in `UserPreferences`)
- Toggle: "Notify me when a friend adds an event"
- Toggle: "Notify me about group activity"

Add these three boolean fields to the `UserPreferences` Prisma model (all default `true`). Check them in `createNotification` before delivering push.

---

## 7. Phase E — Group calendars

### 7.1 API routes

#### `POST /api/groups`

**Auth:** Required
**Body:**
```ts
{ name: string; memberIds?: string[] }  // memberIds = friend user IDs to invite
```
**Zod schema:**
```ts
z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().cuid()).optional(),
})
```
**Response `201`:** `{ group: Group }`

**Logic:**
1. Create `Group` with `ownerId = me`.
2. Create `GroupMembership` for the owner with `role: 'owner', status: 'active', joinedAt: now`.
3. For each `memberId` in `memberIds`: verify they are an accepted friend, create `GroupMembership` with `role: 'member', status: 'invited'`. Call `createNotification` with a new type `group_invite_received` (add to enum).
4. Return the full group with members.

---

#### `GET /api/groups`

**Auth:** Required
**Response `200`:** `{ groups: Group[] }` — all groups where the user has an `active` membership.

---

#### `GET /api/groups/[id]`

**Auth:** Required — must be an active member
**Response `200`:** `{ group: Group }` with full member list and upcoming events.

---

#### `PATCH /api/groups/[id]`

Rename the group.

**Auth:** Required — owner only
**Body:** `{ name: string }`
**Response `200`:** `{ group: { id, name } }`

---

#### `DELETE /api/groups/[id]`

Delete the group and all its memberships and group events.

**Auth:** Required — owner only
**Response `200`:** `{ success: true }`

---

#### `POST /api/groups/[id]/invite`

Invite a friend to the group.

**Auth:** Required — active member (any member can invite)
**Body:** `{ userId: string }`
**Errors:**
- `400` — not a friend of the inviter
- `409` — already a member or already invited

**Logic:** Create `GroupMembership` with `status: 'invited'`. Send `group_invite_received` notification.

---

#### `PATCH /api/groups/[id]/membership`

Accept or decline a group invitation.

**Auth:** Required — must have an `invited` membership in this group
**Body:** `{ action: 'accept' | 'decline' }`

- Accept: update `status: 'active'`, set `joinedAt: now`.
- Decline: delete the `GroupMembership` record.

---

#### `DELETE /api/groups/[id]/members/[userId]`

Remove a member or leave the group.

**Auth:** Required — owner can remove anyone; non-owners can only remove themselves (leave)
**Errors:** `403` if non-owner tries to remove another user.

---

#### `POST /api/groups/[id]/events`

Add an event to a group.

**Auth:** Required — active member
**Body:** `{ eventId: string }`
**Response `201`:** `{ groupEvent: { groupId, eventId, addedByUserId, addedAt } }`
**Logic:** Create `GroupEvent`. Send `group_event_added` notification to all other active members.

---

#### `DELETE /api/groups/[id]/events/[eventId]`

Remove an event from a group.

**Auth:** Required — the user who added the event or the group owner
**Response `200`:** `{ success: true }`

---

#### `GET /api/groups/[id]/events`

**Auth:** Required — active member
**Query params:** `startDate`, `endDate` (optional, for calendar scoping)
**Response `200`:**
```ts
{
  events: Array<{
    groupEvent: { addedByUserId: string; addedAt: string };
    addedBy: { id: string; name: string | null; color: string };
    event: Event;
    memberStatuses: Array<{ userId: string; name: string | null; status: string }>;
  }>
}
```

The `color` for `addedBy` comes from the friendship record between `addedByUserId` and the current user. If the current user is the `addedBy`, use a neutral color (e.g. `#6b7280`).

---

### 7.2 Event create/edit update

**Update `app/api/events/create/route.ts` and the edit route:**

Add to the request body schema:
```ts
groupIds: z.array(z.string().cuid()).optional(),
```

After creating the event, if `groupIds` is non-empty:
1. Verify the user is an active member of each group.
2. Create `GroupEvent` records.
3. Dispatch `group_event_added` notifications.

**Update `app/events/create/page.tsx` and `app/events/[id]/edit/page.tsx`:**

Add a "Add to groups" multi-select below the form. Populated from `useGroups()`. Only shown if the user is in at least one group.

---

### 7.3 Frontend pages

**`app/groups/page.tsx`** — groups list:
- Card grid of groups. Each card: group name, member avatars (stacked, up to 5), upcoming event count.
- "Create group" button → opens a dialog: name input + friend multi-select from friends list.
- Pending invitations shown in a separate "Invitations" section with Accept/Decline buttons.

**`app/groups/[id]/page.tsx`** — group detail:
- Tabs: Calendar | Events | Members
- **Calendar tab:** Monthly calendar showing group events, color-coded by the member who added them. Same toggle sidebar pattern as the main calendar.
- **Events tab:** List of group events with member statuses inline (e.g. avatar chips showing who is going / has tickets).
- **Members tab:** Member list with roles. Owner sees a "Remove" button per member and an "Invite" button. Non-owners see a "Leave group" button.

**New hooks:**
- `hooks/use-groups.ts` — `useGroups()`, `useGroup(id)`
- `hooks/use-group-events.ts` — `useGroupEvents(groupId, startDate, endDate)`

---

## 8. Environment variables

No new environment variables are required for the social features. The existing setup covers everything:

| Variable | Used by |
|---|---|
| `DATABASE_URL` | All DB access |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push notifications in `createNotification` |
| `EMAIL_SERVER`, `EMAIL_FROM` | Email notifications (future — not in this spec) |

---

## 9. Database migration strategy

Run migrations in this order, one per phase:

```bash
# Phase A
npx prisma migrate dev --name add_friendship_and_notification

# Phase B
# (no schema changes)

# Phase C
npx prisma migrate dev --name add_activity_private_to_preferences

# Phase D
npx prisma migrate dev --name add_social_notification_prefs_to_preferences

# Phase E
npx prisma migrate dev --name add_groups_and_group_events
```

> **Production note:** The current database is SQLite, suitable for development. Before deploying social features to production, migrate to PostgreSQL (update `schema.prisma` `datasource` provider and `DATABASE_URL`). All schema and query patterns in this spec are compatible with PostgreSQL.

---

## 10. Testing checklist per phase

### Phase A
- [ ] Send friend request to another user
- [ ] Cannot send request to self
- [ ] Cannot send duplicate request
- [ ] Accept request — both users see each other in `/friends`
- [ ] Decline request — no entry appears
- [ ] Remove friend — both users lose visibility
- [ ] Each friend gets a unique color; colors are consistent across sessions
- [ ] Pending request badge appears on Friends nav item

### Phase B
- [ ] Ticketmaster URL → form populates with `confidence: high`
- [ ] Eventbrite URL → form populates
- [ ] Unknown site with JSON-LD Event → form populates
- [ ] Site with only OG tags → partial population, user fills gaps
- [ ] Unreachable URL → shows error, form still usable
- [ ] `localhost` URL → blocked with 400
- [ ] Private IP URL → blocked with 400

### Phase C
- [ ] Friend's `going` event appears on calendar in their color
- [ ] Friend's `secured` event appears on calendar
- [ ] Toggling a friend off hides their events
- [ ] Clicking friend event opens read-only modal
- [ ] "Set my reminder" from modal opens reminder flow
- [ ] User with `activityPrivate: true` — their events do not appear on any friend's calendar

### Phase D
- [ ] Friend request received → in-app notification appears
- [ ] Friend request accepted → sender gets in-app notification
- [ ] Friend secures tickets → all friends get in-app notification
- [ ] Push notification delivered if subscription exists and preference is on
- [ ] If preference is off → no push, but in-app notification still created
- [ ] Mark single notification read → badge count decreases
- [ ] Mark all read → badge disappears

### Phase E
- [ ] Create group, invite friends
- [ ] Invitee sees invitation in notifications and in `/groups`
- [ ] Accept invitation → appear in group member list
- [ ] Add event to group → group members see it on group calendar
- [ ] Group member gets tickets → notification sent to other members
- [ ] Owner can remove a member
- [ ] Non-owner can leave
- [ ] Owner deletes group → all related records deleted
- [ ] Group calendar color-codes events by the member who added them
