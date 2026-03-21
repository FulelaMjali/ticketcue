import { useEffect, useState } from 'react';

interface EventStatus {
  eventId: string;
  status: 'interested' | 'secured' | null;
  ticketsSecured: boolean;
  updatedAt: string | null;
}

export function useEventStatus(eventId: string) {
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/events/${eventId}/status`);
        if (!response.ok) {
          throw new Error('Failed to fetch event status');
        }
        const data = await response.json();
        setEventStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchStatus();
    }
  }, [eventId]);

  const setStatus = async (
    status: 'interested' | 'secured' | null
  ) => {
    try {
      if (status === null) {
        // Delete status
        const response = await fetch(`/api/events/${eventId}/status`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('Failed to delete event status');
        }
        setEventStatus({
          eventId,
          status: null,
          ticketsSecured: false,
          updatedAt: null,
        });
      } else {
        // Update status
        const response = await fetch(`/api/events/${eventId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          throw new Error('Failed to update event status');
        }

        const data = await response.json();
        setEventStatus(data);
      }
      return eventStatus;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  };

  return { eventStatus, loading, error, setStatus };
}
