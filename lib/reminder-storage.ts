import { Reminder } from '@/types';

const STORAGE_KEY = 'ticketcue_reminders';

export function getReminders(): Reminder[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
    }));
  } catch (error) {
    console.error('[v0] Error loading reminders:', error);
    return [];
  }
}

export function saveReminder(reminder: Reminder): void {
  if (typeof window === 'undefined') return;
  
  try {
    const reminders = getReminders();
    const filtered = reminders.filter(r => r.id !== reminder.id);
    filtered.push(reminder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[v0] Error saving reminder:', error);
  }
}

export function deleteReminder(reminderId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const reminders = getReminders();
    const filtered = reminders.filter(r => r.id !== reminderId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[v0] Error deleting reminder:', error);
  }
}

export function getReminderByEventId(eventId: string): Reminder | null {
  const reminders = getReminders();
  return reminders.find(r => r.eventId === eventId && r.status === 'active') || null;
}

export function createReminder(eventId: string): Reminder {
  return {
    id: `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    eventId,
    userId: 'default-user',
    intervals: {
      twoHours: false,
      oneHour: true,
      thirtyMinutes: false,
      tenMinutes: true,
    },
    notificationMethods: {
      browserPush: true,
      email: false,
    },
    createdAt: new Date(),
    status: 'active',
  };
}

export function addReminder(options: { eventId: string; userId?: string; intervals?: Reminder['intervals']; notificationMethods?: Reminder['notificationMethods'] }): Reminder {
  const reminder: Reminder = {
    id: `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    eventId: options.eventId,
    userId: options.userId || 'default-user',
    intervals: options.intervals || {
      twoHours: false,
      oneHour: true,
      thirtyMinutes: false,
      tenMinutes: true,
    },
    notificationMethods: options.notificationMethods || {
      browserPush: true,
      email: false,
    },
    createdAt: new Date(),
    status: 'active',
  };
  
  saveReminder(reminder);
  return reminder;
}
