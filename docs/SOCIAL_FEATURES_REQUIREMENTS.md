# TicketCue — Social Features Requirements

## Overview

This document covers the requirements for the next set of features: a social/friends system, shared event visibility, friend activity notifications, color-coded calendar views, and event import via URL.

---

## Feature 1: Friends System

Users can send, accept, and manage friend connections with other TicketCue users.

### Requirements

- **Friend request:** A user can search for another user by name or email and send a friend request.
- **Accept / decline:** The receiving user sees a notification or badge and can accept or decline.
- **Friends list:** Each user has a friends list showing names, avatars/initials, and connection status.
- **Remove friend:** A user can remove a friend at any time. This removes their visibility into each other's shared activity.
- **Privacy baseline:** By default, a user's event statuses (interested, going, tickets secured) are only visible to their friends, not the general public.

### Out of scope for this feature

- Group management (covered in Feature 4)
- Visibility settings per event (covered in Feature 3)

---

## Feature 2: Event Import via URL

A user can paste a link from an external ticketing or event site and TicketCue will fetch the event details and pre-populate the create-event form.

### Requirements

- **URL input field** on the create-event page: "Import from link" option above the form.
- **Fetch and parse:** The server fetches the page and extracts:
  - Event title
  - Date and time
  - Venue / location
  - Description
  - Image / artwork URL
  - Ticket sale date (if present)
  - Price range (if present)
- **Extraction strategy (layered):**
  1. Structured data: JSON-LD (`application/ld+json`) or Microdata on the page
  2. Open Graph meta tags (`og:title`, `og:description`, `og:image`, etc.)
  3. Site-specific parsers for high-value sources (Ticketmaster, Eventbrite, Bandsintown, Songkick)
  4. Fallback: return what was found and ask the user to fill in the gaps
- **Editable pre-fill:** The fetched data populates the form fields. The user reviews and edits before saving — nothing is auto-saved.
- **Error handling:** If the URL is unreachable or no useful data is found, show a clear message. The user can still create the event manually.
- **Security:** The server-side fetch must not expose internal infrastructure. URLs must be validated (http/https only, no localhost/private ranges).

### Supported sites (priority order for custom parsers)

1. Ticketmaster / Live Nation
2. Eventbrite
3. Bandsintown
4. Songkick
5. Any site with JSON-LD `Event` schema (generic)
6. Any site with Open Graph tags (generic fallback)

---

## Feature 3: Friend Event Visibility & Color-Coded Calendar

Once friends are connected, users can see what events their friends are interested in or have tickets for, overlaid on their own calendar.

### Requirements

- **Visibility model:** A user's event statuses (`interested`, `going`, `tickets_secured`) are visible to their friends by default. A global toggle in settings can make a user's activity fully private (opt-out).
- **Calendar overlay:** The calendar view shows the user's own events in their default color and friends' events color-coded by friend.
  - Each friend is assigned a consistent color from a fixed palette (assigned at friend-connection time, stored per friendship).
  - Color assignments persist — if a friend's color is red, it is always red in your calendar.
- **Friend event detail:** Clicking a friend's event on the calendar opens a read-only detail view showing event info and the friend's status (e.g. "Alex has tickets"). The user can also set their own reminder or status from that view.
- **Visibility toggles:** In the calendar sidebar or a filter panel, the user can toggle individual friends on/off to show/hide their events. These toggles persist per session (and optionally across sessions).
- **Events page:** Friend events are not shown in the main events browse list — the overlay is calendar-only to avoid cluttering discovery.

---

## Feature 4: Shared Group Calendar

A group is a named space that a set of friends create together. Events added to a group are visible to all group members and live separately from each person's personal calendar.

### Design Decision: Synced View vs. Shared Calendar

There are two conceptual models for social event sharing:

| | **Option A — Synced View** | **Option B — Shared Group Calendar** |
|---|---|---|
| **How it works** | You see friends' personal events overlaid on your calendar (Feature 3) | A separate calendar space; members deliberately add events to it |
| **Privacy** | You see everything they've flagged as interested/going/secured | Only events explicitly added to the group are shared |
| **Noise** | Potentially noisy — all of a friend's activity appears | Clean — only intentional group events appear |
| **Effort to share** | Zero — automatic once you're friends | Requires the user to choose "add to group" |
| **Mental model** | "I'm following my friend's activity" | "We have a shared event list for this group" |
| **Implementation complexity** | Lower — just a filtered calendar query | Higher — new Group + GroupEvent data model, group management UX |
| **Best for** | Seeing what your friends are up to generally | Planning specific events together (e.g. "Summer 2026 Festivals") |

**Recommendation:** Build **both**, in order. Feature 3 (synced view / overlay) ships first because it has immediate value with no friction. Feature 4 (group calendar) ships second for users who want deliberate, curated shared planning.

### Requirements (Group Calendar)

- **Create group:** Any user can create a group, give it a name, and invite friends.
- **Invite:** An invitation is sent to each invitee; they must accept to join.
- **Group membership:** Group owner can add/remove members. Members can leave.
- **Add event to group:** When creating or editing an event, the user can choose to add it to one or more of their groups (in addition to or instead of their personal calendar).
- **Group calendar view:** A group has its own calendar view at `/groups/[id]`. All events added to the group by any member appear here, color-coded by the member who added them.
- **Group event interactions:** Any group member can set their own status (interested / going / tickets secured) on a group event.
- **Group notifications:** Members are notified when a new event is added to the group (see Feature 5).

---

## Feature 5: Friend & Group Activity Notifications

Users receive notifications when their friends or group members take notable actions on events.

### Notification triggers

| Event | Who receives it |
|---|---|
| Friend adds a new event (personal, visible) | All their friends |
| Friend sets status to `tickets_secured` | All their friends |
| Friend sets status to `going` | All their friends |
| New event added to a group | All group members (except the adder) |
| Group member gets `tickets_secured` for a group event | All group members |
| Friend sends you a friend request | The receiving user |
| Friend request accepted | The sender |

### Delivery channels

- **In-app notification center** (new — a notification bell / inbox): every trigger produces an in-app notification. This is the baseline; all other channels are optional.
- **Push notification** (existing infrastructure): opt-in per user in notification preferences.
- **Email** (existing infrastructure): opt-in per user in notification preferences.

### Notification preferences

Users can control notification types in their profile settings:
- Toggle all social notifications on/off
- Toggle individual notification types (friend tickets secured, new group event, etc.)

---

## Data model additions (summary)

```
Friendship          id, requesterId, addresseeId, status (pending/accepted), createdAt, color (hex, for calendar)
Group               id, name, ownerId, createdAt
GroupMembership     id, groupId, userId, role (owner/member), joinedAt
GroupEvent          id, groupId, eventId, addedByUserId, addedAt
Notification        id, userId, type, actorId, eventId?, groupId?, read, createdAt
EventImportJob      id, userId, url, status, parsedData (JSON), createdAt
```

---

## What is not in scope

- Public profiles visible to non-friends
- Following users without mutual connection
- Group chat or messaging
- Event co-ownership / collaborative editing
- Monetisation or ticket purchasing
