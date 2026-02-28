export type EventCategory = 'concert' | 'sports' | 'theater' | 'comedy' | 'festival' | 'nightlife';
export type EventStatus = 'upcoming' | 'presale' | 'onsale' | 'soldout';
export type ReminderStatus = 'active' | 'completed' | 'dismissed';
export type UpdateType = 'lineup' | 'tickets' | 'schedule' | 'weather' | 'logistics' | 'alert';
export type UpdatePriority = 'normal' | 'important' | 'urgent';

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
  ticketUrl?: string;
  status: EventStatus;
  createdAt?: Date;
  updatedAt?: Date;
  updates?: EventUpdate[];
}

export interface Reminder {
  id: string;
  eventId: string;
  userId: string;
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
  userId: string;
  ticketsSecured: boolean;
  updatedAt: Date;
}
