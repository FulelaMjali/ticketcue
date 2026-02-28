'use client';

import { useCallback, useEffect, useState } from 'react';
import { Reminder } from '@/types';

type ReminderPayload = {
  eventId: string;
  intervals: Reminder['intervals'];
  notificationMethods: Reminder['notificationMethods'];
};

type ReminderUpdatePayload = {
  intervals?: Reminder['intervals'];
  notificationMethods?: Reminder['notificationMethods'];
  status?: Reminder['status'];
};

function normalizeReminder(reminder: any): Reminder {
  return {
    ...reminder,
    createdAt: new Date(reminder.createdAt),
  };
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/reminders', { cache: 'no-store' });

      if (response.status === 401) {
        setReminders([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setReminders(data.map(normalizeReminder));
    } catch (err) {
      const parsedError = err instanceof Error ? err : new Error(String(err));
      setError(parsedError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const createReminder = useCallback(async (payload: ReminderPayload): Promise<Reminder> => {
    const response = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'Failed to create reminder');
    }

    const created = normalizeReminder(await response.json());
    setReminders((current) => {
      const withoutSameEvent = current.filter(
        (item) => !(item.eventId === created.eventId && item.status === 'active')
      );
      return [created, ...withoutSameEvent];
    });
    return created;
  }, []);

  const updateReminder = useCallback(async (id: string, payload: ReminderUpdatePayload): Promise<Reminder> => {
    const response = await fetch(`/api/reminders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'Failed to update reminder');
    }

    const updated = normalizeReminder(await response.json());
    setReminders((current) => current.map((item) => (item.id === id ? updated : item)));
    return updated;
  }, []);

  const removeReminder = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/reminders/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'Failed to delete reminder');
    }

    setReminders((current) => current.filter((item) => item.id !== id));
  }, []);

  return {
    reminders,
    loading,
    error,
    refetch: fetchReminders,
    createReminder,
    updateReminder,
    removeReminder,
  };
}
