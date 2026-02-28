'use client';

import { useState, useEffect } from 'react';
import { Event } from '@/types';

export interface EventsResponse {
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useEvents(page = 1, limit = 10, filters?: {
  category?: string;
  search?: string;
  status?: string;
}) {
  const [data, setData] = useState<EventsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          ...(filters?.category && { category: filters.category }),
          ...(filters?.search && { search: filters.search }),
          ...(filters?.status && { status: filters.status }),
        });

        const response = await fetch(`/api/events?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: EventsResponse = await response.json();
        
        // Convert date strings back to Date objects
        const eventsWithDates = result.events.map(event => ({
          ...event,
          date: new Date(event.date),
          ticketSaleDate: event.ticketSaleDate ? new Date(event.ticketSaleDate) : undefined,
          presaleDate: event.presaleDate ? new Date(event.presaleDate) : undefined,
          createdAt: event.createdAt ? new Date(event.createdAt) : undefined,
          updatedAt: event.updatedAt ? new Date(event.updatedAt) : undefined,
        }));
        
        setData({
          ...result,
          events: eventsWithDates,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [page, limit, filters?.category, filters?.search, filters?.status]);

  return { data, error, loading };
}

export function useEvent(eventId: string) {
  const [data, setData] = useState<Event | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/events/${eventId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const event = await response.json();

        const updates = Array.isArray(event.updates)
          ? event.updates.map((update: any) => ({
              ...update,
              timestamp: new Date(update.timestamp),
              createdAt: update.createdAt ? new Date(update.createdAt) : undefined,
            }))
          : undefined;
        
        // Convert date strings back to Date objects
        setData({
          ...event,
          date: new Date(event.date),
          ticketSaleDate: event.ticketSaleDate ? new Date(event.ticketSaleDate) : undefined,
          presaleDate: event.presaleDate ? new Date(event.presaleDate) : undefined,
          createdAt: event.createdAt ? new Date(event.createdAt) : undefined,
          updatedAt: event.updatedAt ? new Date(event.updatedAt) : undefined,
          updates,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  return { data, error, loading };
}
