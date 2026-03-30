export type EventCategory = 'concert' | 'sports' | 'theater' | 'comedy' | 'festival' | 'nightlife';

// ─── Social ───────────────────────────────────────────────────────────────────

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface Friend {
  id: string;           // friendship record id
  userId: string;       // the other person's user id
  name: string | null;
  email: string;
  color: string;        // hex color for calendar display
  status: FriendshipStatus;
  createdAt: string;
}
export type EventStatus = 'upcoming' | 'presale' | 'onsale' | 'soldout';
export type ReminderStatus = 'active' | 'completed' | 'dismissed';
export type ReminderSalePhase = 'presale' | 'general_sale';
export type UpdateType = 'lineup' | 'tickets' | 'schedule' | 'weather' | 'logistics' | 'alert';
export type UpdatePriority = 'normal' | 'important' | 'urgent';

export interface TicketPhase {
  name: string;
  date: Date;
  status: 'upcoming' | 'active' | 'completed';
}

export interface Event {
  id: string;
  title: string;
  artist?: string;
  venue: string;
  location: string;
  date: Date;
  category: EventCategory;
  imageUrl: string;
  description: string;
  ticketSaleDate?: Date;
  presaleDate?: Date;
  ticketPhases?: TicketPhase[];
  ticketUrl?: string;
  status: EventStatus;
  isUserCreated?: boolean;
  createdByUserId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  updates?: EventUpdate[];
}

export interface Reminder {
  id: string;
  eventId: string;
  userId: string;
  salePhase?: string; // 'presale' | 'general_sale'
  intervals: {
    twoHours: boolean;
    oneHour: boolean;
    thirtyMinutes: boolean;
    tenMinutes: boolean;
  };
  notificationMethods: {
    browserPush: boolean;
    email: boolean;
  };
  createdAt: Date;
  status: ReminderStatus;
}

export interface EventUpdate {
  id: string;
  eventId: string;
  eventTitle: string;
  type: UpdateType;
  title: string;
  description: string;
  imageUrl?: string;
  timestamp: Date;
  priority: UpdatePriority;
  createdAt?: Date;
}

export interface EventUserStatus {
  eventId: string;
  status: 'interested' | 'secured' | null;
  ticketsSecured: boolean;
  updatedAt: Date;
}
