'use client';

import { EventUserStatus } from '@/types';

const STORAGE_KEY = 'ticketcue-event-statuses';

export function getEventStatuses(): EventUserStatus[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const statuses = JSON.parse(stored);
    return statuses.map((status: any) => ({
      ...status,
      updatedAt: new Date(status.updatedAt),
    }));
  } catch (error) {
    console.error('Error loading event statuses:', error);
    return [];
  }
}

export function getEventStatus(eventId: string, userId: string = 'default-user'): EventUserStatus | null {
  const statuses = getEventStatuses();
  return statuses.find((status) => status.eventId === eventId && status.userId === userId) || null;
}

export function saveEventStatus(status: EventUserStatus): void {
  if (typeof window === 'undefined') return;
  
  try {
    const statuses = getEventStatuses();
    const existingIndex = statuses.findIndex(
      (s) => s.eventId === status.eventId && s.userId === status.userId
    );
    
    if (existingIndex >= 0) {
      statuses[existingIndex] = status;
    } else {
      statuses.push(status);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch (error) {
    console.error('Error saving event status:', error);
  }
}

export function updateTicketsSecured(eventId: string, secured: boolean, userId: string = 'default-user'): EventUserStatus {
  const status: EventUserStatus = {
    eventId,
    userId,
    ticketsSecured: secured,
    updatedAt: new Date(),
  };
  
  saveEventStatus(status);
  return status;
}

export function deleteEventStatus(eventId: string, userId: string = 'default-user'): void {
  if (typeof window === 'undefined') return;
  
  try {
    const statuses = getEventStatuses();
    const filtered = statuses.filter(
      (status) => !(status.eventId === eventId && status.userId === userId)
    );
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting event status:', error);
  }
}

export function hasTicketsSecured(eventId: string, userId: string = 'default-user'): boolean {
  const status = getEventStatus(eventId, userId);
  return status?.ticketsSecured || false;
}
